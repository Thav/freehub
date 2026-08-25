import test from "node:test";
import assert from "node:assert/strict";
import { parseImport } from "../src/import/csv.js";

const encoded = (text: string, encoding: BufferEncoding = "utf8") => Buffer.from(text, encoding).toString("base64");
const freehub = "first_name,last_name,email,phone,service_type,service_start_date,service_end_date\r\n\"Ada, Jr.\",Rider,ada@example.test,+1 503 555 0100,membership,2026-01-01,2026-12-31\r\n";

test("CSV parser accepts BOM encodings, quotes, Freehub and Corsizio headers", () => {
  const utf8 = parseImport(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(freehub)]).toString("base64")); assert.equal(utf8.format, "freehub"); assert.equal(utf8.rows[0].person.firstName, "Ada, Jr.");
  const utf16 = parseImport(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(freehub, "utf16le")]).toString("base64")); assert.equal(utf16.rows[0].person.lastName, "Rider");
  const corsizio = parseImport(encoded("First Name,Last Name,Email Address,Phone Number\nCora,Sizio,cora@example.test,555-0100\n")); assert.equal(corsizio.format, "corsizio"); assert.equal(corsizio.rows[0].person.email, "cora@example.test");
});

test("CSV parser rejects malformed headers and row-level invalid dates without losing valid rows", () => {
  assert.throws(() => parseImport(encoded("first_name,email\nAda,ada@example.test\n")), /last name/);
  const result = parseImport(encoded("first_name,last_name,service_type,service_start_date\nGood,Rider,membership,2026-02-01\nBad,Rider,membership,not-a-date\n"));
  assert.equal(result.rows[0].errors.length, 0); assert.match(result.rows[1].errors.join(" "), /dates/);
});
