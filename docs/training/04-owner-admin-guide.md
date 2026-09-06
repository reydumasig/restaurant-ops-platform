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

### Users
Create logins for staff here. When adding someone, you set their **Role** and, for branch-scoped roles, their **Branch** — this controls what they see and can do (see the role table in `00-getting-started.md`). You set their initial password directly; give it to them and they can log in right away.

**Deactivating** a user (instead of deleting) immediately blocks their login without losing their history in past records — always deactivate rather than trying to delete, and note you cannot deactivate your own account.

### Roles
Read-only reference list — the five roles are fixed in this version (their permissions are built into the system, not editable here).

## 3. Reports

Under **Reports**, five report types are available, each sortable by clicking a column header, and each exportable via **Export Excel** or **Print / Save PDF**:

- **Inventory & Branch Stock** — a snapshot of everything on hand, everywhere
- **Stock Movement** — the full ledger, filterable by branch and raw material/product
- **Transfers** — every transfer ever made, with status
- **Production** — every production run
- **Daily Sales** — totals per day, per branch
- **Attendance** — clock in/out hours per employee, per branch (see `06-time-clock-guide.md`) — a shift shows **Incomplete** when someone clocked in but never clocked out

Use these for anything you need to hand off, print, or analyze outside the system (e.g. sending a weekly sales summary to an accountant, or archiving a month's inventory snapshot).

## 4. Things intentionally *not* in this version

A few things you might expect from a POS/inventory system are deliberately not included yet — they belong to a later, separately-paid phase of this project, not because they were forgotten:

- Supplier management, purchase orders, formal receiving-discrepancy workflows
- Waste/spoilage tracking with approval workflows
- Batch/expiration (FIFO/FEFO) tracking
- Food cost / profitability analysis per dish
- Cross-branch performance comparison dashboards
- Barcode/QR scanning, delivery/driver management
- Any accounting integration (that's a fully separate system, "CASA OS")

If a request comes up for one of these, it's a scoping conversation for the next phase, not a bug in this one.

## 5. Data you should review before relying on this system day-to-day

- CLQ, Goat Meat (Kambing), and Bangus (Whole) costs have since been confirmed against actual supplier cost sheets and updated — no action needed on those three. **Lechon Kawali (Fried Pork Belly), Bulalo (Beef Shank/Bone Marrow), Beef (Sliced, for stir-fry), and Tuna** are still averaged/approximate — confirm these four against a current supplier invoice when you can.
- **Jowls** was added as a new raw material (previously missing from the list entirely) — double check its cost and reorder point look right for how you actually buy it.
- Set real selling prices on the ~37 freezer/retail products currently showing "Not set" — an item with no price rings up as ₱0 in POS.
- A few raw materials (certain seafood mixes, "Bangus Steak" vs. regular Bangus, "Crispy Hipon" vs. "Buttered Garlic Shrimp") were deliberately left as separate items rather than merged, because we weren't certain they're identical preparations — check with your kitchen lead and merge or relabel as needed
- The Senior/PWD discount calculation (20% off the VAT-exclusive amount) is a standard approximation, not a guarantee of BIR compliance for official receipts — if these printed receipts need to serve as your official tax receipts, verify the numbering/format requirements with your accountant or BIR before relying on them for that purpose
