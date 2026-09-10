# POS Cashier Guide

For: Branch Staff, Branch Managers, and anyone taking customer orders.

## 1. Starting your shift

Go to **POS** in the top navigation. If your account is tied to one branch, that branch is already selected. If you have access to more than one branch (Owners/Admins only), pick the correct branch from the dropdown before doing anything else.

The till won't let you ring a single sale until a shift is open. If none is open, you'll see a **Start Shift** screen instead of the order screen:

1. Count the cash actually in the drawer right now.
2. Type that amount into **Starting Cash**.
3. Tap **Start Shift**.

This is a daily step — do it at the start of every shift, not just once. If someone before you already started a shift and it's still open, you'll skip straight to the Open Orders screen instead.

## 2. Open Orders — how tables work now

After a shift is open, **POS** shows **Open Orders**: a card for every table/tab currently open at your branch, each showing its label (if any), when it opened, and its running total.

This is built around how a restaurant actually works — a table sits down, orders are added as they come, and the bill isn't settled until the customer is ready to pay:

- Tap **+ New Order** to start a fresh tab. Give it a label (e.g. "Table 5") if it helps you find it later — this is optional, an unlabeled order just shows as "Order #XXXXXXXX."
- Tap an **existing card** to go back into that order — to add more items as the table orders more, or to pay it out when they're ready to leave.
- Any number of orders can be open at the same time — one per table, or one per takeout order in progress.

## 3. Adding items to an order

Inside an order screen:

1. Tap a **category tab** near the top (Specialty, Best Sellers, Sizzlers, Beverages, etc.) — this matches the printed menu.
2. Tap a **menu item** to add one to the current batch. Tapping it again adds another. Use **−** / **+** to adjust quantity, or take it to 0 to remove it.
3. Tap **Add to Order** to commit that batch — the items move into **Order So Far** below, the running total updates, and stock is deducted immediately (the kitchen is preparing this now, it isn't waiting for the bill).

You can come back and add more items the same way as many times as the table orders more, for as long as the order stays open. Everything already committed to **Order So Far** is locked in — the fix for a wrong item after it's been added is the same as before (tell your manager; corrections happen through an inventory adjustment, not by editing the order).

## 4. Paying and closing an order

Once the table is ready to pay, from inside that order:

1. If the customer qualifies for the **Senior Citizen / PWD discount**, choose it in the **Discount** dropdown — Subtotal, Discount, and Total update automatically. Leave it on **None** for a regular order.
2. Type the amount the customer handed you into **Amount Tendered**. The screen shows the **Change** to give back, or tells you if it's too low.
3. Tap **Pay & Close Order**.

This is final — a closed order can't be reopened, edited, or have items added to it. You land on the receipt screen automatically; tap **Print Receipt**.

**An order with nothing added to it yet** (opened by mistake, or a table that left before ordering) shows a **Void Order** button instead of a payment panel — use that to remove it, since there's nothing to bill.

## 5. Printing the receipt

1. Tap **Print Receipt**.
2. Your browser's print window opens — check that the destination is the receipt printer (Xprinter XP-58IID), then confirm/print.

If the printer isn't listed as an option, it likely isn't paired/connected — see `05-printer-setup.md`, or ask whoever set up the till to check the connection. You can still complete sales and view/print receipts later even if the printer is temporarily offline — nothing is lost.

Tap **← New Sale** to go back to Open Orders.

## 6. Ending your shift

When your shift is done (handing off to the next cashier, or closing for the night):

1. From the Open Orders screen, tap **Close Shift** (top right).
2. **Physically count the cash in the drawer.**
3. Type that count into **Counted Cash**. Add a note if there's anything worth explaining.
4. Tap **Close Shift**.

The system shows you **Expected Cash** (your starting float plus everything paid during this shift) against what you actually counted, and the **Variance** — over or short. This appears on the Start Shift screen right after, and stays on record under **Shift History**.

**Close out any open tabs before ending your shift where you can** — an order left open when you close out doesn't count toward your shift's expected cash (it isn't your money yet), and whoever eventually collects payment on it gets credited for that cash under *their* shift instead, even if it was your table originally.

## 7. Checking today's sales and past shifts

- **Sales History** (top of the POS screen) — every **paid** sale (open tabs don't show here yet), with Today's Sales, Transactions Today, Top Seller, and a **View Receipt** link on each row to reprint.
- **Shift History** — every shift ever run at your branch, with its starting cash, expected vs. counted cash, and variance. Useful for a handover dispute or an end-of-day reconciliation review.

## 8. Common questions

**A customer wants to cancel an order after paying.** There's no "void" for a paid order. Tell your manager — they can correct the inventory afterward with a manual stock adjustment (see Branch Inventory guide), but the sale record itself stays as history (the system's ledger is append-only by design, similar to an accounting book — nothing gets erased, only corrected going forward).

**The item I want to sell isn't on the menu screen.** It may be inactive, or it may not have a price set yet. Ask an Owner/Admin to check **Master Data → Products**.

**"Insufficient stock" error when adding an item.** This means the recipe for that dish needs an ingredient that's run out at your branch. Tell your manager — they'll need to either receive a transfer/delivery or do a stock adjustment before that item can be sold again.

**Someone else's name shows as having opened a table I'm now handling.** That's fine — any table's open order can be added to or paid by anyone with POS access at that branch, not just whoever started it. It's meant for shift handovers and shared coverage.
