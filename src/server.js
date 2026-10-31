require("./config");

const express = require("express");
const path = require("node:path");
const { requestBorrow, closeBorrow, getState } = require("./borrow");
const { getReceipts } = require("./meko");

const app = express();
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "..", "public")));

app.get("/api/status", (_req, res) => res.json({ ok: true, data: getState() }));
app.get("/api/receipts", (_req, res) => res.json({ ok: true, data: getReceipts(5) }));

app.post("/api/borrow", async (req, res, next) => {
  try {
    const result = await requestBorrow({ mb: Number(req.body?.mb), minutes: Number(req.body?.minutes) });
    res.status(result.ok ? 200 : 400).json(result.ok ? { ok: true, data: result } : { ok: false, error: result.reason });
  } catch (error) {
    next(error);
  }
});

app.post("/api/return", async (req, res, next) => {
  try {
    const result = await closeBorrow({ usedMb: Number(req.body?.usedMb) });
    res.status(result.ok ? 200 : 400).json(result.ok ? { ok: true, data: result } : { ok: false, error: result.reason });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(`[Sail] ${error.message}`);
  res.status(error.status || 500).json({ ok: false, error: error.message });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "127.0.0.1", () => console.log(`Sail UI: http://localhost:${port}`));
}

module.exports = app;
