# Purchasing & Suppliers Guide

For: Commissary Staff and Branch Managers (creating/receiving Purchase Orders), Owner/Admin (setting up Suppliers).

Use this instead of a plain **Stock In** whenever you're buying from a registered supplier and want the price and delivery formally recorded — a Purchase Order tracks who you bought from, what you agreed to pay, what actually arrived, and (for raw materials) the batch and expiry date of what came in.

## 1. Setting up a Supplier (Owner/Admin)

Go to **Master Data → Suppliers**, click **Add Supplier**, and fill in the name and contact details. This only needs to be done once per supplier — after that, anyone creating a Purchase Order can pick them from a list.

Deactivate a supplier you no longer use (instead of trying to delete them) — this hides them from new POs without losing the history of past orders from them.

## 2. Creating a Purchase Order

1. Go to **Purchasing → New PO**.
2. Pick the **Supplier** and the **Branch** it's being delivered to (usually the commissary).
3. Add each raw material you're ordering, with the quantity and the price you agreed to pay per unit. Use **+ Add item** for more than one line.
4. Submit. The PO is now in **Ordered** status, waiting to be received.

## 3. Receiving a delivery

When the order arrives:

1. Go to **Purchasing**, find the PO, and open it.
2. For each item, enter what was **actually delivered** — this can differ from what was ordered (a supplier shorting an order is common; the system records the discrepancy rather than blocking you).
3. Enter the **Actual Cost** if it's different from the price you originally agreed to.
4. If the item has an expiry date printed on the packaging, enter it in the **Expiry Date** field — this creates a tracked batch, and feeds the **Expiring Soon** report (see `02-branch-inventory-guide.md`).
5. Tap **Confirm Receipt**.

This adds the received quantities to stock immediately, updates that raw material's cost, and records the price in that supplier's price history.

**If the price is unusually high** compared to what you've recently paid for that item (more than about 10% above the recent average), the system shows a warning after you confirm — it still lets the receipt go through (a real delivery can't be refused just because the price moved), but flags it so you or an Owner/Admin can follow up with the supplier if it looks wrong.

## 4. If an order needs to be cancelled

If a PO was created in error and hasn't been received yet, open it and tap **Cancel Purchase Order**. This is only possible before receiving — once any part of it has been received, it's done and can't be cancelled or edited; corrections from that point go through the usual inventory tools (Adjustment, Waste) instead.

## 5. Checking supplier price history and performance

- On a supplier's detail screen, their **Price History** shows every price you've ever paid them for every item, over time — useful for spotting a supplier who's been quietly raising prices.
- **Reports → Supplier Performance** (Owner/Admin) rolls this up across all suppliers: how many orders, how much was ordered vs. actually delivered (fulfillment rate), and total value received — useful for deciding who to keep buying from.
