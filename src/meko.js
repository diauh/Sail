require("./config");

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { root } = require("./config");

const receiptsFile = path.join(root, "receipts.jsonl");

function makeRecord(record) {
  return {
    id: record.id || randomUUID(),
    recorded_at: record.recorded_at || new Date().toISOString(),
    borrower: record.borrower || "local-device",
    ...record
  };
}

function saveMemory(input) {
  const record = makeRecord(input);
  try {
    fs.appendFileSync(receiptsFile, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    console.error(`[Meko] Could not append receipt: ${error.message}`);
    throw error;
  }
  console.log(`[MEKO_RECORD] ${JSON.stringify(record)}`);
  return { ok: true, id: record.id, record };
}

function getReceipts(limit = 5) {
  const count = Math.max(0, Math.trunc(Number(limit) || 0));
  if (!count) return [];
  try {
    return fs.readFileSync(receiptsFile, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-count)
      .reverse()
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

module.exports = { saveMemory, makeRecord, getReceipts };
