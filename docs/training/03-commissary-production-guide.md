# Commissary & Production Guide

For: Commissary Staff (and Branch Managers/Owners overseeing the commissary).

The commissary works the same as a branch for basic inventory (see **02-branch-inventory-guide.md** — Stock In/Out, Adjustments, and the Stock Ledger all work identically there). This guide covers what's specific to the commissary: **Production** and **dispatching Transfers**.

## 1. How Recipes / BOM work

A **Recipe** (also called a Bill of Materials, or BOM) defines what raw ingredients go into making one finished item, and how much of each.

Example: the recipe for "Chicken Inasal Solo" might say *1 recipe batch = 1 piece, using 1 piece of CLQ (marinated chicken)*. If you run a production batch for 40 pieces, the system automatically scales the ingredients — it will pull 40 pieces of CLQ, not 1.

**Only Owners/Admins can create or edit recipes** (Master Data-level setting, done under **Production → Recipes / BOM**). As commissary staff, you'll mostly be *using* existing recipes to run production, not creating new ones. If a recipe looks wrong (wrong ingredient, wrong quantity) tell an Owner/Admin — don't try to work around it.

## 2. Running a Production batch

Use this when you're batch-preparing something ahead of time — for example, marinating and portioning a big batch of chicken for inasal, or frying a batch of lechon kawali — rather than something cooked to order at the moment of sale.

1. Go to **Production → Production Runs**, then **New Production Run**.
2. Pick the **Branch** (this should be the Commissary).
3. Pick the **Recipe**.
4. Enter **Quantity Produced** — how many finished units you're making in this batch.
5. Submit.

The system immediately:
- **Deducts** the raw ingredients (scaled to your quantity) from the commissary's stock
- **Adds** the finished quantity to the commissary's stock as a Product

If there isn't enough of an ingredient in stock, the system will refuse and tell you which one is short — check **Inventory → Stock Levels** to confirm before you start weighing/prepping, so you don't find out partway through.

**Important distinction:** not every dish needs a Production Run. Many menu items are cooked to order — when a branch sells them through the POS, the system deducts the raw ingredients directly at that moment, with no separate production step. Use Production Runs only for things that are genuinely batch-prepared ahead of time and held as stock (a "made in advance" item), not for dishes made fresh per order.

## 3. Sending stock to a branch (dispatching a Transfer)

1. Go to **Transfers → New Transfer**.
2. **From Branch**: the commissary. **To Branch**: whichever branch is receiving it.
3. Add each item being sent (raw material or finished product) with its quantity. Use **+ Add item** for more than one line.
4. Add a note if useful, then **Dispatch Transfer**.

The moment you dispatch, the quantity is **deducted from the commissary's stock immediately** — even though the branch hasn't received it yet. It sits in an **In Transit** state until the branch confirms receipt. If you dispatched something in error before the branch has confirmed it, open the transfer and click **Cancel Transfer** — this returns the stock to the commissary.

Once the branch confirms receipt, the transfer is done and cannot be changed from either side — double-check quantities before dispatching.

## 4. Daily checklist

- Check **Inventory → Stock Levels** for anything flagged low-stock before starting the day's prep.
- Run Production batches for anything that needs to be pre-made.
- Dispatch Transfers for whatever branches are due a delivery.
- If anything doesn't add up, check **Inventory → Stock Ledger** — it shows every movement with a timestamp and who did it.
