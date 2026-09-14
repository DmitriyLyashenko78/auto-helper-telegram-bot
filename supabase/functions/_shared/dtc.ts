export type FindDtcDescription = (code: string) => Promise<string | null>;

const HELP_TEXT = [
  "Я расшифровываю универсальные OBD-II коды.",
  "",
  "Отправьте код в формате: буква P, B, C или U и ещё 4 цифры или латинские буквы A–F.",
  "Примеры: P0420, P0300, B001A, C0035, U0100.",
  "Первую букву можно ввести русской раскладкой: Р0420, В0020, С0035, У0100.",
  "",
  "Коды производителя могут отсутствовать или иметь другое значение для конкретной марки автомобиля.",
].join("\n");

export async function getDtcReply({
  text,
  findDescription,
}: {
  text: string;
  findDescription: FindDtcDescription;
}): Promise<string> {
  if (isHelpCommand(text)) {
    return HELP_TEXT;
  }

  const code = normalizeDtcCode(text);
  if (!code) {
    return `Не удалось распознать код.\n\n${HELP_TEXT}`;
  }

  const description = await findDescription(code);
  if (!description) {
    return [
      `Код ${code} не найден в базе универсальных OBD-II кодов.`,
      "Возможно, это код производителя. Сейчас бот умеет расшифровывать только универсальные коды.",
    ].join("\n");
  }

  return [
    `Код ${code}`,
    "",
    description,
    "",
    "Это справочная расшифровка кода, а не окончательный диагноз автомобиля.",
  ].join("\n");
}

export function normalizeDtcCode(text: unknown): string | null {
  if (typeof text !== "string") return null;

  const normalized = text.replace(/\s/g, "").toUpperCase();
  const code = replaceCyrillicPrefix(normalized);
  return /^[PBCU][0-9A-F]{4}$/.test(code) ? code : null;
}

function isHelpCommand(text: string): boolean {
  return /^\/(?:start|help)(?:@\w+)?$/i.test(text.trim());
}

function replaceCyrillicPrefix(code: string): string {
  const latinPrefixByCyrillic: Record<string, string> = {
    Р: "P",
    В: "B",
    С: "C",
    У: "U",
    Г: "U",
  };

  const prefix = latinPrefixByCyrillic[code[0]] || code[0];
  return `${prefix}${code.slice(1)}`;
}
