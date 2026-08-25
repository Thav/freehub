import { createHash } from "node:crypto";

export type ImportService = { type: "membership" | "earn_a_bike" | "class"; startDate?: string; endDate?: string; paid?: boolean; volunteered?: boolean };
export type ImportPerson = { firstName: string; lastName?: string; email?: string; phone?: string; street1?: string; street2?: string; city?: string; state?: string; postalCode?: string; country?: string; yearOfBirth?: number; staff?: boolean; emailOptOut?: boolean; service?: ImportService };
export type ParsedRow = { rowNumber: number; person: ImportPerson; fingerprint: string; warnings: string[]; errors: string[] };
export type ParsedFile = { format: "freehub" | "corsizio"; sha256: string; rows: ParsedRow[] };

const headers = {
  firstName: ["first_name", "first name", "firstname", "given name"], lastName: ["last_name", "last name", "lastname", "family name", "surname"], email: ["email", "email address"], phone: ["phone", "phone number", "mobile phone"],
  street1: ["street1", "street", "street address", "address", "address line 1"], street2: ["street2", "address line 2"], city: ["city", "town"], state: ["state", "province", "region"], postalCode: ["postal_code", "postal code", "zip", "zip code", "postcode"], country: ["country", "country code"], yearOfBirth: ["year_of_birth", "year of birth", "birth year"], staff: ["staff"], emailOptOut: ["email_opt_out", "email opt out"],
  serviceType: ["service_type", "service type"], serviceStartDate: ["service_start_date", "service start date"], serviceEndDate: ["service_end_date", "service end date"], servicePaid: ["service_paid", "service paid"], serviceVolunteered: ["service_volunteered", "service volunteered"]
};
const normalizedHeader = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, " ").replace(/ /g, "_");
const clean = (value: string | undefined) => value?.trim() || undefined;
const bool = (value: string | undefined) => { const normalized = clean(value)?.toLowerCase(); return normalized === undefined || normalized === "" ? undefined : ["1", "true", "yes", "y"].includes(normalized) ? true : ["0", "false", "no", "n"].includes(normalized) ? false : null; };
const isoDate = (value: string | undefined) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export const normalizePhone = (value?: string) => value ? `${value.trim().startsWith("+") ? "+" : ""}${value.replace(/\D/g, "")}` || undefined : undefined;
export const normalizeName = (first?: string, last?: string) => first && last ? `${first.trim().toLocaleLowerCase()}\u0000${last.trim().toLocaleLowerCase()}` : undefined;

export function decodeCsv(sourceBase64: string) {
  const bytes = Buffer.from(sourceBase64, "base64");
  if (!bytes.length || bytes.length > 1_000_000) throw new Error("CSV must be between 1 byte and 1 MB");
  let text: string;
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
  else if (bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))) text = new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2));
  else if (bytes.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) { const swapped = Buffer.alloc(bytes.length - 2); for (let index = 2; index < bytes.length; index += 2) { swapped[index - 2] = bytes[index + 1] || 0; swapped[index - 1] = bytes[index]; } text = new TextDecoder("utf-16le", { fatal: true }).decode(swapped); }
  else { try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { text = new TextDecoder("windows-1252").decode(bytes); } }
  return { bytes, text };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) { const char = text[index];
    if (quoted) { if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; } else if (char === '"') quoted = false; else value += char; continue; }
    if (char === '"') { if (value) throw new Error("unexpected quote in CSV"); quoted = true; }
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (quoted) throw new Error("unterminated quoted CSV field");
  if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((values) => values.some((value) => value.trim()));
}

export function parseImport(sourceBase64: string, defaultService?: ImportService): ParsedFile {
  const { bytes, text } = decodeCsv(sourceBase64); const values = parseCsv(text);
  if (!values.length) throw new Error("CSV is empty");
  const header = values[0].map(normalizedHeader); if (new Set(header).size !== header.length) throw new Error("CSV has duplicate headers");
  const indexOf = (names: string[]) => header.findIndex((item) => names.map(normalizedHeader).includes(item));
  const index = Object.fromEntries(Object.entries(headers).map(([key, names]) => [key, indexOf(names)])) as Record<keyof typeof headers, number>;
  if (index.firstName < 0 || index.lastName < 0) throw new Error("CSV requires first and last name headers");
  const format = values[0].some((value) => value.trim().toLowerCase().includes("_")) ? "freehub" : "corsizio" as const;
  const at = (line: string[], name: keyof typeof headers) => index[name] < 0 ? undefined : clean(line[index[name]]);
  const rows = values.slice(1).map((line, rowIndex) => {
    const errors: string[] = []; const warnings: string[] = []; const firstName = at(line, "firstName"); const lastName = at(line, "lastName"); const email = at(line, "email"); const phone = at(line, "phone");
    if (!firstName) errors.push("first name is required"); if (!lastName) errors.push("last name is required"); if (!email && !phone) warnings.push("no email or phone; matching uses name only");
    const country = at(line, "country")?.toUpperCase(); if (country && !/^[A-Z]{2}$/.test(country)) errors.push("country must be a two-letter code");
    const yearText = at(line, "yearOfBirth"); const yearOfBirth = yearText ? Number(yearText) : undefined; if (yearText && (yearOfBirth === undefined || !Number.isInteger(yearOfBirth) || yearOfBirth < 1880 || yearOfBirth > 2100)) errors.push("year of birth is invalid");
    const staff = bool(at(line, "staff")); const emailOptOut = bool(at(line, "emailOptOut")); if (staff === null || emailOptOut === null) errors.push("boolean fields must be yes/no, true/false, or 1/0");
    const rawType = at(line, "serviceType"); const serviceType = rawType?.toLowerCase().replace(/[ -]/g, "_"); const rawStart = at(line, "serviceStartDate"); const rawEnd = at(line, "serviceEndDate"); const paid = bool(at(line, "servicePaid")); const volunteered = bool(at(line, "serviceVolunteered"));
    if (rawType && !["membership", "earn_a_bike", "class"].includes(serviceType || "")) errors.push("service type is invalid"); if (!isoDate(rawStart) || !isoDate(rawEnd)) errors.push("service dates must use YYYY-MM-DD"); if (rawStart && rawEnd && rawEnd < rawStart) errors.push("service end date must not precede start date"); if (paid === null || volunteered === null) errors.push("service boolean fields are invalid");
    const service = rawType ? { type: serviceType as ImportService["type"], startDate: rawStart, endDate: rawEnd, paid: paid || false, volunteered: volunteered || false } : defaultService;
    const person: ImportPerson = { firstName: firstName || "", lastName, email, phone, street1: at(line, "street1"), street2: at(line, "street2"), city: at(line, "city"), state: at(line, "state"), postalCode: at(line, "postalCode"), country, yearOfBirth, staff: staff || false, emailOptOut: emailOptOut || false, service };
    return { rowNumber: rowIndex + 2, person, warnings, errors, fingerprint: createHash("sha256").update(JSON.stringify(person)).digest("hex") };
  });
  return { format, sha256: createHash("sha256").update(bytes).digest("hex"), rows };
}
