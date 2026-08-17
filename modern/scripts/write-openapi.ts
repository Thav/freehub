import { writeFile } from "node:fs/promises";
import { buildApp } from "../src/api/app.js";
const app = await buildApp();
await app.ready();
await writeFile(new URL("../openapi.json", import.meta.url), JSON.stringify(app.swagger(), null, 2) + "\n");
await app.close();
