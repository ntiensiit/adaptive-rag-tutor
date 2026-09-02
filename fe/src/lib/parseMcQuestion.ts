export type McOption = { label: string; text: string };

export function parseMcQuestion(text: string) {
  const lines = text.split("\n");
  const options: McOption[] = [];
  const stemLines: string[] = [];
  for (const line of lines) {
    const match = line.match(/^([A-D])\.\s*(.+)$/);
    if (match) {
      options.push({ label: match[1], text: match[2] });
      continue;
    }
    if (!options.length) stemLines.push(line);
  }
  if (options.length < 2) {
    const result = { stem: text, options: [] as McOption[] };
    return result;
  }
  const stem = stemLines.join("\n").trim();
  const result = { stem, options };
  return result;
}
