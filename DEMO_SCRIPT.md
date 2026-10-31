# DataShare Room — 45-second demo

1. **Request (0–7s):** “I’m requesting 20 megabytes for ten minutes from the configured lender.”
2. **Approve (7–13s):** Run `node src/borrow.js request --mb 20 --minutes 10`. “The policy checks the request against the lender’s cap and approves it.”
3. **Enable tunnel (13–19s):** “Our orchestrator asks Tailscale to select the lender as this device’s exit node. Tailscale—not our code—moves the traffic.”
4. **Show IP change (19–27s):** “Here’s the public IP before and after. The changed IP verifies that the exit node is being used.”
5. **Close (27–34s):** Run `node src/borrow.js close --used-mb 8`. “Returning clears the selected exit node and records the duration and reported usage.”
6. **Show receipt (34–45s):** “This ID is the Meko memory receipt for the session. Meko stores the record; it does not carry the traffic.”

If asked “isn’t this just Tailscale?” say: **“Tailscale moves packets. Our code is the lending contract: it checks the lender's cap, opens and closes the tunnel, and writes a receipt to Meko.”**
