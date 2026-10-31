const fs = require("node:fs");
const path = require("node:path");
const { root } = require("./config");
const tailscale = require("./tailscale");
const { saveMemory } = require("./meko");
const { check } = require("./policy");

const sessionFile = path.join(root, "session.json");

function readSession() {
  return fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, "utf8")) : null;
}

function writeSession(session) {
  fs.writeFileSync(sessionFile, `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

async function requestBorrow({ mb, minutes }) {
  const decision = check({ mb, minutes });
  const lender = process.env.LENDER || "";
  if (!decision.approved) {
    saveMemory({ lender, mb, minutes, status: "denied", note: decision.reason });
    return { ok: false, reason: decision.reason };
  }
  if (readSession()?.status === "open") return { ok: false, reason: "An active loan already exists; close it first." };

  const opened = await tailscale.openTunnel(lender);
  if (!opened.ok) {
    const reason = opened.stderr || opened.stdout || "Tailscale could not open the exit-node tunnel.";
    saveMemory({ lender, mb, minutes, status: "failed", note: reason });
    writeSession({ status: "failed", lender, expires_at: null });
    return { ok: false, reason };
  }

  const openedAt = new Date();
  const expiresAt = new Date(openedAt.getTime() + minutes * 60_000).toISOString();
  const record = { borrower: "local-device", lender, mb, minutes, status: "open", opened_at: openedAt.toISOString(), expires_at: expiresAt };
  let receipt;
  try {
    receipt = saveMemory(record);
  } catch (error) {
    const closed = await tailscale.closeTunnel();
    if (!closed.ok) {
      throw new Error(`Receipt failed and tunnel rollback failed: ${closed.stderr || closed.stdout || "unknown error"}`);
    }
    throw new Error("Receipt failed; the tunnel was closed as a safety rollback.");
  }
  writeSession({ ...record, expiresAt, receipt_id: receipt.id });
  return { ok: true, record: receipt.record, expiresAt };
}

async function closeBorrow({ usedMb }) {
  if (!Number.isFinite(usedMb) || usedMb < 0) return { ok: false, reason: "usedMb must be a non-negative number." };
  const session = readSession();
  if (!session || session.status !== "open") return { ok: false, reason: "There is no active loan to return." };

  const closed = await tailscale.closeTunnel();
  if (!closed.ok) return { ok: false, reason: closed.stderr || closed.stdout || "Tailscale could not close the tunnel." };

  const closedAt = new Date();
  const record = {
    borrower: session.borrower, lender: session.lender, mb: session.mb, minutes: session.minutes, status: "closed",
    used_mb: usedMb, duration_minutes: Math.max(0, Math.round((closedAt - new Date(session.opened_at)) / 60_000)), closed_at: closedAt.toISOString()
  };
  const closedSession = { ...session, status: "closed", closed_at: record.closed_at, used_mb: usedMb };
  writeSession(closedSession);
  const receipt = saveMemory(record);
  writeSession({ ...closedSession, close_receipt_id: receipt.id });
  return { ok: true, record: receipt.record };
}

function getState() {
  const session = readSession();
  return { status: session?.status || "idle", lender: session?.lender || process.env.LENDER || "", expiresAt: session?.expiresAt || session?.expires_at || null };
}

function parseArgs(args) {
  const values = {};
  for (let i = 0; i < args.length; i += 1) {
    const match = args[i].match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) throw new Error(`Unexpected argument: ${args[i]}`);
    const key = match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = match[2] === undefined ? args[++i] : match[2];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${match[1]}`);
    values[key] = Number(value);
  }
  return values;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "status") {
    console.log(JSON.stringify(readSession(), null, 2) || "null");
    return;
  }
  if (command === "request") {
    const result = await requestBorrow(parseArgs(args));
    if (!result.ok) {
      console.error(`Request not opened: ${result.reason}`);
      return void (process.exitCode = 1);
    }
    console.log(`Approved. Tunnel open to ${result.record.lender}. Expires: ${result.expiresAt}`);
    console.log("Verify that your public IP changed to the lender's IP.");
    console.log(`Meko receipt: ${result.record.id}`);
    return;
  }
  if (command === "close") {
    const { usedMb } = parseArgs(args);
    const result = await closeBorrow({ usedMb });
    if (!result.ok) {
      console.error(`Return incomplete: ${result.reason}`);
      return void (process.exitCode = 1);
    }
    console.log(`Tunnel closed. Duration: ${result.record.duration_minutes} minutes; used: ${usedMb}MB.`);
    console.log(`Meko receipt: ${result.record.id}`);
    return;
  }
  throw new Error("Usage: node src/borrow.js request --mb 20 --minutes 10 | close --used-mb 8 | status");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { requestBorrow, closeBorrow, getState, readSession };
