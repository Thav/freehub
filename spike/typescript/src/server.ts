import path from "node:path";
import { fileURLToPath } from "node:url";
import statik from "@fastify/static";
import { buildApp } from "./api/app.js";

const app = await buildApp();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
await app.register(statik, { root, wildcard: false });
app.setNotFoundHandler((request, reply) => request.url.startsWith("/api/") ? reply.code(404).send({ error: "not found" }) : reply.sendFile("index.html"));
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 3001) });
