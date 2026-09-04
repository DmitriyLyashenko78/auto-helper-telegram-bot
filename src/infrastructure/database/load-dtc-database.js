import { readFile } from "node:fs/promises";

export async function loadDtcDatabase(path) {
  const content = await readFile(path, "utf8");
  const codes = JSON.parse(content);

  if (!codes || Array.isArray(codes) || typeof codes !== "object") {
    throw new TypeError("База DTC должна быть объектом кодов");
  }

  return new Map(Object.entries(codes));
}
