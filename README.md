# Sail

Sail coordinates a borrowing request, lender policy, Tailscale exit-node selection, return, and a local receipt for Meko. Tailscale handles all network tunneling; Sail does not implement a VPN, NAT traversal, or quota transfer.

## Prerequisites

- Node.js 20+
- Tailscale installed on both laptops and signed into the same Tailscale account
- Device B enabled as an exit node in the Tailscale admin console
- A connected external agent with access to the Meko MCP server for writing local receipt records to Meko

## Tailscale setup

1. On Device B, enable **Run as exit node** in Tailscale, or run `tailscale set --advertise-exit-node`.
2. In the Tailscale admin console, open **Machines -> Device B -> Edit**, then check **Use as exit node**.
3. Configure Device A as the borrower. Sail calls `tailscale set --exit-node=<LENDER>` to select Device B. Tailscale handles the actual transport.

## Run the UI

```sh
cp .env.example .env
npm install
npm start
```

Open http://localhost:3000. Configure `LENDER`, `MAX_MB`, `MAX_MINUTES`, and `DRY_RUN` in `.env` as needed.

The four demo steps in the UI:

1. Try borrowing **500MB**; policy refuses the request.
2. Borrow **20MB / 10 min**; status turns open and the countdown starts.
3. Verify the IP changed on the borrower laptop with `curl -4 ifconfig.me`.
4. Click **Return**, enter **8MB**, and confirm the closed status and receipt.

## Receipts and Meko

For each session event, Sail prints `[MEKO_RECORD]` with the record and appends it to `receipts.jsonl`. A connected external agent writes those records to Meko using MCP. Sail does not send records to Meko over HTTP. `session.json` stores the local session state; both generated files are excluded from Git.

## Verify the public IP

Before borrowing on Device A, run:

```sh
curl -4 ifconfig.me
```

After an approved request, run it again. The IP should change to Device B's public IP when the exit-node connection is active. Verify the IP directly; Sail does not independently confirm routing.

## Honest claims

- **Tailscale = transport.** Tailscale performs the exit-node networking.
- **Meko = ledger.** Meko stores borrow-session records; it does not forward traffic. Sail prints and logs records locally for the connected external agent.
- **Sail = contract layer.** Sail checks the lender's cap, opens and closes the selected exit node, tracks a local session, and creates a receipt record.
- We did **not** build a VPN, NAT traversal, or quota transfer.

## Prototype limitations

Policy limits validate requested values and do not meter actual network usage. The borrower identity is the local placeholder `local-device`; there is no user authentication or lender consent UI. The UI binds to localhost and has no authentication. Expiry is recorded and displayed but does not automatically close the exit node; click Return or run `node src/borrow.js close --used-mb 8`.

The CLI remains available:

```sh
node src/borrow.js request --mb 20 --minutes 10
node src/borrow.js close --used-mb 8
node src/borrow.js status
```

For a safe CLI wiring check that does not change the Tailscale exit node, set `DRY_RUN=1`.
