const HELP_TEXT = [
  "Я расшифровываю универсальные OBD-II коды.",
  "",
  "Отправьте код в формате: буква P, B, C или U и 4 цифры.",
  "Примеры: P0420, P0300, B0020, C0035, U0100.",
  "",
  "Коды производителя могут отсутствовать или иметь другое значение для конкретной марки автомобиля.",
].join("\n");

export function getDtcReply({ text, dtcCodes }) {
  if (isHelpCommand(text)) {
    return HELP_TEXT;
  }

  const code = normalizeDtcCode(text);
  if (!code) {
    return `Не удалось распознать код.\n\n${HELP_TEXT}`;
  }

  const description = dtcCodes.get(code);
  if (!description) {
    return [
      `Код ${code} не найден в локальной базе универсальных OBD-II кодов.`,
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

function isHelpCommand(text) {
  return typeof text === "string" && /^\/(?:start|help)(?:@\w+)?$/i.test(text.trim());
}

function normalizeDtcCode(text) {
  if (typeof text !== "string") return null;

  const normalized = text.replace(/\s/g, "").toUpperCase();
  return /^[PBCU]\d{4}$/.test(normalized) ? normalized : null;
}
