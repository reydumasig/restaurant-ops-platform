# POS Cashier Guide

For: Branch Staff, Branch Managers, and anyone taking customer orders.

## 1. Opening the till screen

Go to **POS** in the top navigation. If your account is tied to one branch, that branch is already selected. If you have access to more than one branch (Owners/Admins only), pick the correct branch from the dropdown at the top before taking any order — every sale is recorded against whichever branch is selected.

## 2. Taking an order

1. Tap a **category tab** near the top (Specialty, Best Sellers, Sizzlers, Beverages, etc.) — this matches the printed menu.
2. Tap a **menu item** to add one to the order. Tapping it again adds another.
3. The **Current Order** panel on the right lists everything added so far, with a running subtotal.
4. To change quantity on an item already in the order, use the **−** / **+** buttons next to it. Taking it down to 0 removes it.

There's no "undo" button for the whole order — if you need to start over, remove each item with **−**, or just don't complete the sale (nothing is saved until you tap **Complete Sale**).

## 3. Applying a discount

If the customer qualifies for the Senior Citizen / PWD discount:

1. In the **Discount** dropdown, choose **Senior Citizen / PWD (20%)**.
2. The Subtotal, Discount, and Total lines update automatically.

Leave it on **None** for a regular order. There is no other discount type in this version — if a customer needs a different kind of discount, ask your manager before completing the sale (it isn't something the system can do yet).

## 4. Taking payment (cash)

1. Type the amount the customer handed you into **Amount Tendered**.
2. The screen shows the **Change** to give back. If the amount is too low, it will tell you instead of letting you proceed.
3. Tap **Complete Sale**.

The order is now final — it cannot be edited or deleted afterward. If something was wrong (wrong item, wrong amount), tell your manager; corrections have to happen through inventory adjustments, not by editing the sale.

## 5. Printing the receipt

After **Complete Sale**, you land on the receipt screen automatically.

1. Tap **Print Receipt**.
2. Your browser's print window opens — check that the destination is the receipt printer (Xprinter XP-58IID), then confirm/print.

If the printer isn't listed as an option, it likely isn't paired/connected — see **05-printer-setup.md**, or ask whoever set up the till to check the connection. You can still complete sales and view/print receipts later even if the printer is temporarily offline — nothing is lost.

When you're done, tap **← New Sale** to go back and start the next order.

## 6. Checking today's sales

Tap **Sales History** (top of the POS screen) to see:

- **Today's Sales** and **Transactions Today** — running totals for your branch
- **Top Seller Today**
- A full list of every sale, each with a **View Receipt** link to reprint if needed

This is useful for a shift handover or an end-of-day check — compare the total here against the cash in the drawer.

## 7. Common questions

**A customer wants to cancel an order after paying.** There's no "void" button. Tell your manager — they can correct the inventory afterward with a manual stock adjustment (see Branch Inventory guide), but the sale record itself stays as history (the system's ledger is append-only by design, similar to an accounting book — nothing gets erased, only corrected going forward).

**The item I want to sell isn't on the menu screen.** It may be inactive, or it may not have a price set yet. Ask an Owner/Admin to check **Master Data → Products**.

**"Insufficient stock" error when completing a sale.** This means the recipe for that dish needs an ingredient that's run out at your branch. Tell your manager — they'll need to either receive a transfer or do a stock adjustment before that item can be sold again.
