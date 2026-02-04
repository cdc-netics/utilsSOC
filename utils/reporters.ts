import fs from "fs";
import path from "path";

export type LoginResult = {
  timestamp: string;
  botnet_id: string;
  discovery_date: string;
  url_from_csv: string;
  user_raw: string;
  rut_used: string;
  outcome: "SUCCESS" | "FAILED";
  reason: string;
};

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function toCsvLine(fields: string[]) {
  return fields.map(f => `"${String(f).replaceAll(`"`, `""`)}"`).join(",");
}

export function writeResultsCsv(results: LoginResult[], outPath: string) {
  const abs = path.resolve(outPath);
  ensureDir(path.dirname(abs));

  const header = [
    "timestamp",
    "botnet_id",
    "discovery_date",
    "url_from_csv",
    "user_raw",
    "rut_used",
    "outcome",
    "reason"
  ];

  const lines = [
    toCsvLine(header),
    ...results.map(r => toCsvLine([
      r.timestamp,
      r.botnet_id,
      r.discovery_date,
      r.url_from_csv,
      r.user_raw,
      r.rut_used,
      r.outcome,
      r.reason
    ]))
  ];

  fs.writeFileSync(abs, lines.join("\n"), "utf-8");
}