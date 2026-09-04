import assert from "node:assert/strict";
import test from "node:test";

import { loadDtcDatabase } from "../src/infrastructure/database/load-dtc-database.js";

test("загружает локальную базу универсальных DTC-кодов", async () => {
  const codes = await loadDtcDatabase(
    new URL("../data/dtc-codes.json", import.meta.url),
  );

  assert.ok(codes.size > 9_000);
  assert.equal(codes.get("P0420"), "Catalyst System Efficiency Below Threshold Bank 1");
});
