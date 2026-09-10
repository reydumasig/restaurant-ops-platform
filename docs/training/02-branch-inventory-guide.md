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
4. If it's a raw material with an expiry date printed on it, enter it in the **Expiry Date** field that appears — this feeds the **Expiring Soon** report (see below) so nothing quietly goes bad unnoticed. It's optional; leave it blank if there's no expiry to track.
5. Add a note if useful (e.g. supplier name), then submit.

For anything bought from a registered supplier where you want the price and quantity formally tracked, use a **Purchase Order** instead — see `07-purchasing-guide.md`.

## 4. Recording stock going out for a reason other than a sale

There are two tools for this now, depending on *why* the stock is leaving:

**Waste (spoilage, damage, expiry)** — use **Inventory → Waste Reports**:

1. Tap **Report Waste**, pick the item, quantity, and a **Reason** (Spoilage, Damage, or Expiry), add a note, and submit.
2. This does **not** deduct stock immediately — it sits as **Pending** until a manager or owner **Approves** it (from the same screen). Only approval actually removes it from stock. If it's rejected instead, nothing changes.

This two-step approval exists so waste has a paper trail management can review, rather than staff quietly writing off stock on their own judgment.

**Anything else** (staff meals, a one-off correction that isn't really "waste") — use **Stock Out**:

1. Go to **Inventory → Stock In / Out / Adjust**, select **Stock Out**.
2. Pick the item and quantity, add a note explaining why.
3. Submit. The system will stop you if you try to remove more than what's actually in stock.

Never manually Stock Out something that was actually sold through the till (a POS sale already deducts stock automatically) — it will be deducted twice.

## 5. Fixing a wrong count (Adjustment)

If a physical count doesn't match what the system shows — usual causes are a missed Stock In/Out entry, a receiving mistake, or an honest counting error somewhere upstream:

1. Go to **Inventory → Stock In / Out / Adjust**, select **Adjustment**.
2. Pick the item.
3. In **Corrected Quantity**, type the *actual physical count* you just did — not the difference, the real total.
4. Add a note (e.g. "Weekly count, 8/10").
5. Submit.

The system calculates the difference itself and records it. This is the right tool any time you're correcting a number after counting — never try to "fix" a count using Stock In/Out, since that's for real movements (deliveries, spoilage), not corrections.

## 6. Doing a full physical count (Stock Counts) — Branch Managers only

Use an **Adjustment** (above) when you're correcting one item you already know is wrong. Use a **Stock Count** when you're counting *everything* — a scheduled weekly or monthly inventory count across a whole category.

1. Go to **Inventory → Stock Counts**, tap **Start New Count**, and pick **Raw Materials** or **Products**.
2. The system snapshots what it currently thinks you have for every item of that type — this is the **Expected** column.
3. Physically count each item and type what you actually counted into **Counted** for each row. The **Variance** column updates live as you type.
4. Tap **Complete Count** when you've entered everything.

The system posts an adjustment automatically for every item where Counted differs from Expected — you don't need to also do a manual Adjustment for the same items. If something urgent happens mid-count (a sale goes through, a transfer arrives), the system is smart about it — it compares your count against stock *at the moment you finish*, not the stale snapshot from when you started, so a legitimate sale during the count never gets mistaken for shrinkage.

If you started a count by mistake, tap **Cancel Count** — nothing is applied.

## 7. Batch and expiry tracking (raw materials)

Raw materials received with an expiry date (via Stock In or a Purchase Order — see `07-purchasing-guide.md`) are tracked as a **batch**. You don't need to do anything extra for this day-to-day — the system automatically uses the oldest-expiring batch first whenever stock is consumed (a sale, production, a transfer out), so you don't need to manually track "use this one first."

What you do need to check regularly: **Inventory → Expiring Soon**. This lists every batch nearing its expiry date (pick a window — next 3, 7, 14, or 30 days), oldest first, so you can plan to use or discount it before it goes bad. Anything that does go bad should be logged through **Waste Reports** (above) with reason **Expiry**, not just quietly thrown out.

## 8. Checking the history of everything (Stock Ledger)

Go to **Inventory → Stock Ledger** to see a full, permanent record of every stock movement at your branch — every sale deduction, every transfer received, every adjustment, every stock in/out — with who did it and when.

This is useful when something looks wrong and you need to trace back *why* — e.g. "why does the system say we only have 3kg of chicken left?" Filter by item type (Raw Materials / Products) to narrow it down.

Nothing in this list can ever be edited or deleted, by anyone, including the Owner — if a past entry was wrong, the fix is always a new correcting entry (an Adjustment), never an edit to the old one. This is intentional: it's what makes the ledger trustworthy as a record.
