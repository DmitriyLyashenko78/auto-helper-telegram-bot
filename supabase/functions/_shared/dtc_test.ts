import { getDtcReply, normalizeDtcCode } from "./dtc.ts";

Deno.test("normalizes decimal, hexadecimal, and Cyrillic-prefix DTC codes", () => {
  assertEquals(normalizeDtcCode(" p 0420 "), "P0420");
  assertEquals(normalizeDtcCode("b001a"), "B001A");
  assertEquals(normalizeDtcCode("Р0300"), "P0300");
  assertEquals(normalizeDtcCode("Г0100"), "U0100");
});

Deno.test("rejects text that is not a DTC code", () => {
  assertEquals(normalizeDtcCode("hello"), null);
  assertEquals(normalizeDtcCode("P04200"), null);
});

Deno.test("returns a database description", async () => {
  const reply = await getDtcReply({
    text: "b001a",
    findDescription: (code) => {
      assertEquals(code, "B001A");
      return Promise.resolve("Example description");
    },
  });

  assertIncludes(reply, "Код B001A");
  assertIncludes(reply, "Example description");
});

Deno.test("help command does not query the database", async () => {
  let queried = false;
  const reply = await getDtcReply({
    text: "/start",
    findDescription: () => {
      queried = true;
      return Promise.resolve(null);
    },
  });

  assertEquals(queried, false);
  assertIncludes(reply, "P0420");
});

function assertEquals(actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}
