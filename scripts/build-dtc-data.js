import { writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const sourcePath = new URL("../data/dtc-codes.db", import.meta.url);
const outputPath = new URL("../data/dtc-codes.json", import.meta.url);
const database = new DatabaseSync(sourcePath, { readOnly: true });

const rows = database
  .prepare(
    `SELECT code, description
     FROM dtc_definitions
     WHERE manufacturer = 'GENERIC' AND is_generic = 1 AND locale = 'en'
     ORDER BY code`,
  )
  .all();

database.close();

const codes = Object.fromEntries(rows.map(({ code, description }) => [code, description]));
await writeFile(outputPath, `${JSON.stringify(codes, null, 2)}\n`);
console.log(`Создана локальная база: ${rows.length} универсальных кодов`);
