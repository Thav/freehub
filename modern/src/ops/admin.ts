import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();
const [resource, action, login] = process.argv.slice(2);

function usage(): never {
  console.error("usage: npm run admin -- users list|reset-password|disable|enable|promote LOGIN");
  process.exit(64);
}

async function requireUser(userLogin: string | undefined) {
  if (!userLogin) usage();
  const user = await db.user.findFirst({ where: { login: { equals: userLogin, mode: "insensitive" } } });
  if (!user) throw new Error(`user not found: ${userLogin}`);
  return user;
}

async function main() {
  if (resource !== "users") usage();
  if (action === "list") {
    const users = await db.user.findMany({ orderBy: { login: "asc" }, select: { login: true, name: true, email: true, disabledAt: true, platformAdministrator: true, passwordChangeRequired: true } });
    console.table(users.map((user) => ({ ...user, disabledAt: user.disabledAt?.toISOString() || "" })));
    return;
  }

  const user = await requireUser(login);
  if (action === "reset-password") {
    const temporaryPassword = randomBytes(24).toString("base64url");
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordDigest: await bcrypt.hash(temporaryPassword, 12), passwordChangeRequired: true } }),
      db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    console.log(`temporary password for ${user.login}: ${temporaryPassword}`);
    console.log("This value is shown once; deliver it securely and do not save it in shell history.");
    return;
  }
  if (action === "disable" || action === "enable") {
    const disabledAt = action === "disable" ? new Date() : null;
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { disabledAt } }),
      db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    console.log(`${user.login} ${action === "disable" ? "disabled" : "enabled"}; active sessions revoked`);
    return;
  }
  if (action === "promote") {
    await db.user.update({ where: { id: user.id }, data: { platformAdministrator: true } });
    console.log(`${user.login} is now a platform administrator`);
    return;
  }
  usage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
