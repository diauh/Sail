require("./config");

const { execFile } = require("node:child_process");

function run(args) {
  const command = `tailscale ${args.join(" ")}`;
  if (process.env.DRY_RUN === "1") {
    console.log(`[DRY_RUN] ${command}`);
    return Promise.resolve({ ok: true, dryRun: true });
  }

  return new Promise((resolve) => {
    try {
      execFile("tailscale", args, { windowsHide: true }, (error, stdout = "", stderr = "") => {
        resolve({
          ok: !error,
          stdout: stdout.trim(),
          stderr: error ? (stderr.trim() || error.message) : stderr.trim()
        });
      });
    } catch (error) {
      resolve({ ok: false, stdout: "", stderr: error.message });
    }
  });
}

function openTunnel(lender) {
  if (!lender || !/^[a-zA-Z0-9._-]+$/.test(lender)) {
    return Promise.resolve({ ok: false, stdout: "", stderr: "Invalid or missing lender device name." });
  }
  return run(["set", `--exit-node=${lender}`]);
}

function closeTunnel() {
  return run(["set", "--exit-node="]);
}

module.exports = { openTunnel, closeTunnel };
