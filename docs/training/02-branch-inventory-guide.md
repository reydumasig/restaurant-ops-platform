# Branch Inventory Guide

For: Branch Managers (full access) and Branch Staff (receiving only).

## 1. Checking what's in stock

Go to **Inventory → Stock Levels**.

- Use the branch dropdown at the top if you can see more than one branch (most Branch Staff/Managers will only ever see their own).
- Switch between the **Raw Materials** and **Products** tabs.
- Any item showing in **red with a ⚠ low stock** warning has dropped to or below its reorder point — flag this to your manager or the commissary so a transfer can be arranged.

This screen always shows the current, real-time count — it updates the moment a sale, transfer, or adjustment happens.

## 2. Receiving a delivery from the commissary (Transfers)

When the commissary sends stock to your branch:

1. Go to **Transfers**. You'll see a list of transfers — anything with status **In Transit** is on its way to you and waiting to be confirmed.
2. Click **View** on the transfer.
3. Physically count what actually arrived. For each item, the **Received** column shows what was sent — if the count matches, leave it as-is; if it doesn't, correct the number to what you actually received.
4. Click **Confirm Receipt**.

This adds the received quantities to your branch's stock immediately. **Count carefully before confirming** — once confirmed, the transfer is done; any correction after that has to go through a manual adjustment (see below), which is extra work and creates a mismatch in the transfer record.

If a transfer is wrong before you've received anything from it (e.g. it should have gone to a different branch), tell whoever created it — only the sender can cancel an in-transit transfer.

## 3. Recording stock that comes in some other way

Most stock at a branch arrives via a Transfer (above). If your branch receives something directly (not through a transfer) — for example a walk-in supplier delivery straight to the branch — record it as a **Stock In**:

1. Go to **Inventory → Stock In / Out / Adjust**.
2. Make sure **Stock In** is selected at the top.
3. Pick the branch (if applicable), the item, and enter the quantity received.
4. Add a note if useful (e.g. supplier name), then submit.

## 4. Recording stock going out for a reason other than a sale

Use **Stock Out** for things like spoilage, breakage, or staff meals that aren't a POS sale (a POS sale already deducts stock automatically — never manually stock-out something that was actually sold through the till, or it will be deducted twice).

1. Go to **Inventory → Stock In / Out / Adjust**, select **Stock Out**.
2. Pick the item and quantity, add a note explaining why (this matters — "spoiled," "broken," "staff meal" — since there's no separate reason-code field in this version, the note is the only record of why).
3. Submit. The system will stop you if you try to remove more than what's actually in stock.

## 5. Fixing a wrong count (Adjustment)

If a physical count doesn't match what the system shows — usual causes are a missed Stock In/Out entry, a receiving mistake, or an honest counting error somewhere upstream:

1. Go to **Inventory → Stock In / Out / Adjust**, select **Adjustment**.
2. Pick the item.
3. In **Corrected Quantity**, type the *actual physical count* you just did — not the difference, the real total.
4. Add a note (e.g. "Weekly count, 8/10").
5. Submit.

The system calculates the difference itself and records it. This is the right tool any time you're correcting a number after counting — never try to "fix" a count using Stock In/Out, since that's for real movements (deliveries, spoilage), not corrections.

## 6. Checking the history of everything (Stock Ledger)

Go to **Inventory → Stock Ledger** to see a full, permanent record of every stock movement at your branch — every sale deduction, every transfer received, every adjustment, every stock in/out — with who did it and when.

This is useful when something looks wrong and you need to trace back *why* — e.g. "why does the system say we only have 3kg of chicken left?" Filter by item type (Raw Materials / Products) to narrow it down.

Nothing in this list can ever be edited or deleted, by anyone, including the Owner — if a past entry was wrong, the fix is always a new correcting entry (an Adjustment), never an edit to the old one. This is intentional: it's what makes the ledger trustworthy as a record.
