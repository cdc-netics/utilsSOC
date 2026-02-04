import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export type CredentialRow = {
  botnetId: string;
  urlFromCsv: string;
  userRaw: string;
  passwordRaw: string;
  discoveryDate: string;
};

export function findFirstCsvInDataFolder(folder = "data"): string {
  const absFolder = path.resolve(folder);
  if (!fs.existsSync(absFolder)) {
    throw new Error(`No existe la carpeta: ${absFolder} (crea /data y pon el CSV dentro)`);
  }

  const files = fs.readdirSync(absFolder);
  const csvs = files
    .filter(f => f.toLowerCase().endsWith(".csv") && !f.toLowerCase().startsWith("~$"))
    .sort((a, b) => a.localeCompare(b));

  if (!csvs.length) {
    throw new Error(`No se encontró ningún .csv en la carpeta: ${absFolder}`);
  }

  return path.join(folder, csvs[0]);
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\uFEFF/g, "").replace(/\s+/g, " ");
}

function pickField(row: Record<string, string>, name: string) {
  const target = normalizeHeader(name);
  const key = Object.keys(row).find(k => normalizeHeader(k) === target);
  return (key ? row[key] : "").trim();
}

export function readBotnetStyleCsv(csvPath: string): CredentialRow[] {
  const abs = path.resolve(csvPath);
  const content = fs.readFileSync(abs, "utf-8");

  // Detectar separador por frecuencia (Excel puede usar ; )
  const commaCount = (content.match(/,/g) || []).length;
  const semiCount = (content.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  }) as Record<string, string>[];

  return records.map(r => ({
    botnetId: pickField(r, "Botnet ID"),
    urlFromCsv: pickField(r, "URL"),
    userRaw: pickField(r, "User"),
    passwordRaw: pickField(r, "Password"),
    discoveryDate: pickField(r, "Discovery Date"),
  }))
  .filter(x => x.userRaw.length > 0 || x.urlFromCsv.length > 0);
}

