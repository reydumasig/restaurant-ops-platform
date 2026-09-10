# Owner / Admin Guide

For: Owner and Admin roles — full access across all 5 locations.

This guide covers what only Owners/Admins can do. Everything in the other guides (POS, Branch Inventory, Commissary & Production) also applies to you — you can do all of it, for any branch.

## 1. Executive Dashboard

This is your home screen after logging in. It shows, for whichever branch you select (or **All Branches** for a company-wide view):

- **Total Inventory Value** — combined value of raw materials and products on hand
- **Sales Today** and transaction count
- **Low Stock Alerts** — count of items at or below their reorder point
- **Inventory Value by Branch** — a breakdown across all 5 locations
- **Top Selling Products Today**

Check this daily — it's the fastest way to spot a branch running low on something, or a slow sales day, without digging through individual screens.

## 2. Master Data — the system's settings

Everything under **Master Data** defines the building blocks the rest of the system uses. Get these right and everything downstream (recipes, POS, reports) works correctly.

### Branches
Add/edit locations here. Each branch has a **Type**: `branch` (a retail location) or `commissary` (a production/warehouse site). Binmaley has *two* records — one of each type — because it physically has both a retail floor and a commissary area on-site.

### Categories
Groupings for raw materials and products (e.g. "Vegetables," "Specialty," "Beverages"). Each category is tagged as either a Raw Material category or a Product category — keep these separate; a raw ingredient and a menu item should never share a category.

### Units of Measure
The measurement units available system-wide (kg, g, L, mL, pc, pack, box). You generally won't need to add new ones — the standard set covers virtually everything.

### Raw Materials
Every ingredient the business buys or uses: name, SKU, category, unit, **cost per unit**, and **reorder point** (the threshold that triggers a low-stock warning on the Dashboard). There's also an optional **Purchase Unit** field (e.g. "Sack (25kg)") purely so stock-in entries can be typed in the unit staff actually buy in — the system converts it to the base unit automatically.

**A note on the current data:** the raw material list was imported and cleaned up from the original spreadsheet, but a handful of items still have *approximate* costs (averaged from inconsistent historical entries) rather than confirmed current supplier prices. Go through this list and correct any cost that looks off — it directly affects the Inventory Value figures on the Dashboard and Reports.

### Products
Every sellable item — both menu dishes and retail items (ice cream, bottled drinks). Each has a category, unit, and **selling price**. Some freezer/retail items were imported without a price (they'll show "Not set" on the list) — set a real price on each before relying on them for POS sales; an item with no price will ring up as ₱0.

### Suppliers
Who you buy raw materials from. Add one here before anyone can create a Purchase Order against them — see `07-purchasing-guide.md` for the full purchasing workflow (creating orders, receiving deliveries, price-variance warnings, supplier price history).

### Users
Create logins for staff here. When adding someone, you set their **Role** and, for branch-scoped roles, their **Branch** — this controls what they see and can do (see the role table in `00-getting-started.md`). You set their initial password directly; give it to them and they can log in right away.

**Deactivating** a user (instead of deleting) immediately blocks their login without losing their history in past records — always deactivate rather than trying to delete, and note you cannot deactivate your own account.

### Roles
Read-only reference list — the five roles are fixed in this version (their permissions are built into the system, not editable here).

## 3. Reports

Under **Reports**, every report is sortable by clicking a column header, and exportable via **Export CSV** (opens fine in Excel) or **Print / Save PDF**.

**Core operational reports:**
- **Inventory & Branch Stock** — a snapshot of everything on hand, everywhere
- **Stock Movement** — the full ledger, filterable by branch and raw material/product
- **Transfers** — every transfer ever made, with status
- **Production** — every production run
- **Daily Sales** — totals per day, per branch (paid sales only — an open, unpaid tab doesn't count until it's closed)
- **Attendance** — clock in/out hours per employee, per branch (see `06-time-clock-guide.md`) — a shift shows **Incomplete** when someone clocked in but never clocked out

**Inventory depth reports:**
- **Inventory Aging** — every batch of raw material still on hand, oldest received first — surfaces slow-moving stock before it becomes waste
- **Stock Count Variance** — every completed physical count, expected vs. counted vs. variance, across every branch — sortable to spot the branch or item with the biggest recurring discrepancies
- **Supplier Performance** — orders, fulfillment rate, and value received per supplier (see `07-purchasing-guide.md`)

**Business analytics (new):**
- **Food Cost Analysis** — cost and margin per menu item, computed from its recipe. Only covers items that *have* a recipe entered — see the data note in Section 5 below.
- **Branch Performance** — a side-by-side comparison of every branch over a date range you pick: sales, transactions, average ticket, current inventory value, and low-stock count. This is the fastest way to see which branch is under-performing, not just what the aggregate looks like.
- **Product Profitability** / **Branch Profitability** — revenue minus cost of goods sold, over a date range, per product or per branch. Where a product has no recipe, its cost shows as "—" rather than a guessed number — revenue is still counted, but margin can't be computed without a cost basis. The Branch Profitability report also shows a **Cost Coverage** percentage — what share of that branch's units sold had a known recipe cost — so a branch selling mostly un-reciped items doesn't look artificially unprofitable.

Use these for anything you need to hand off, print, or analyze outside the system (e.g. sending a weekly sales summary to an accountant, reviewing supplier performance before renewing a contract, or archiving a month's inventory snapshot).

## 4. Cash handling — POS Shifts

Every branch's till now runs on **shifts**: a cashier opens with a starting cash float, sales are rung against it, and closing it counts the drawer against what the system expected (starting float + everything paid during that shift) — see `01-pos-cashier-guide.md` for the cashier-side steps.

As Owner/Admin, **Shift History** (from the POS screen, or per-branch) is where you review this after the fact — every shift, its variance, and who ran it. A recurring shortage on one branch or one cashier is worth a conversation; a one-off small variance is normal (miscounted change, a rounding difference) and not worth chasing.

Tables now stay **open** as tabs while a customer is still eating, and only turn into a real, reportable sale once they're paid — see `01-pos-cashier-guide.md` (Section 2) if a "why doesn't this table's order show up in sales yet" question comes up.

## 5. Things intentionally *not* in this version

A few things you might expect from a full restaurant platform are deliberately not included yet — they belong to a later, separately-paid phase of this project (or, for the accounting items, a fully separate contract), not because they were forgotten:

- Scheduled/emailed reports to management (on hold pending a decision on which email service to use)
- Mobile app (PWA) for branch/warehouse staff
- Barcode/QR scanning, delivery/driver management, automatic demand forecasting
- Any accounting integration (that's a fully separate system, "CASA OS") — general ledger, accounts payable/receivable, payroll, tax/compliance reporting, bank reconciliation, and similar all live there, not here

If a request comes up for one of these, it's a scoping conversation for the next phase, not a bug in this one.

## 6. Data you should review before relying on this system day-to-day

- CLQ, Goat Meat (Kambing), and Bangus (Whole) costs have since been confirmed against actual supplier cost sheets and updated — no action needed on those three. **Lechon Kawali (Fried Pork Belly), Bulalo (Beef Shank/Bone Marrow), Beef (Sliced, for stir-fry), and Tuna** are still averaged/approximate — confirm these four against a current supplier invoice when you can.
- **Jowls** was added as a new raw material (previously missing from the list entirely) — double check its cost and reorder point look right for how you actually buy it.
- Set real selling prices on the ~37 freezer/retail products currently showing "Not set" — an item with no price rings up as ₱0 in POS.
- A few raw materials (certain seafood mixes, "Bangus Steak" vs. regular Bangus, "Crispy Hipon" vs. "Buttered Garlic Shrimp") were deliberately left as separate items rather than merged, because we weren't certain they're identical preparations — check with your kitchen lead and merge or relabel as needed
- The Senior/PWD discount calculation (20% off the VAT-exclusive amount) is a standard approximation, not a guarantee of BIR compliance for official receipts — if these printed receipts need to serve as your official tax receipts, verify the numbering/format requirements with your accountant or BIR before relying on them for that purpose
- **Most menu items still don't have a recipe (BOM) entered.** Food Cost Analysis and the profitability reports only produce real numbers for items that do — right now that's a small fraction of the full menu. This isn't a bug; it's unfinished data entry. The more recipes get entered under **Production → Recipes / BOM**, the more of the menu those reports actually cover — no code change needed, just the data.
