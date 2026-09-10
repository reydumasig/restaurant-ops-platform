# Getting Started — Casa Inasal Restaurant Ops Platform

This is the shared starting point for everyone who uses the system — cashiers, branch managers, commissary staff, and the owner. Read this first, then read the guide for your specific role.

## 1. What this system does

One system now handles, for all 5 Casa Inasal locations:

- **Point of Sale (POS)** — taking customer orders and printing receipts
- **Inventory** — how much of each ingredient and product is on hand, at each location
- **Stock Transfers** — moving stock from the commissary to a branch (or branch to branch)
- **Production** — turning raw ingredients into prepared items (recipes / "BOM")
- **Reports & Dashboard** — sales, inventory value, low-stock warnings

Every time stock moves — a sale, a delivery, a transfer, a production run — the system records it automatically. Nobody needs to manually track inventory in a notebook or spreadsheet anymore; the system does it as a side effect of normal daily work.

## 2. Day Zero Setup — before anyone can sell anything

**This section is for whoever is setting the system up for the first time (Owner/Admin), not for daily use.** If the system is already running at your location, skip to **3. Logging in** below.

Everything downstream depends on something built earlier — you can't sell a dish before it exists, you can't create an item without a category, and you can't process a sale without real stock behind it. Do these in order:

1. **Branches** — every location, created first. Binmaley gets *two* records (`branch` + `commissary`) since it's physically both.
2. **The first Owner/Admin login** — created once, outside the normal screens, by whoever deploys the system (ask your developer/IT contact — this is a one-time setup command, not something done from the UI). Every action after this point is done by a logged-in user, so this has to exist before anything else can.
3. **Units of Measure and Categories** — check *Master Data* has a sensible starter set (kg, g, L, pc, and a first pass at categories). Raw materials and products can't be created without these.
4. **Raw Materials and Products** — the real item catalog: every ingredient (cost per unit, reorder point) and every sellable item (price). This is the biggest data-entry task — see `04-owner-admin-guide.md` for what to get right here.
5. **Recipes (BOM)** — optional, but do this for anything cooked from ingredients. Without a recipe, selling a dish deducts nothing from raw material stock — see `03-commissary-production-guide.md`.
6. **Suppliers** — only needed if you'll use formal Purchase Orders. Skip if you're stocking manually. See `07-purchasing-guide.md`.
7. **Get real stock into the system.** This is the actual "can't sell without stock" step:
   - **Fast:** *Inventory → Stock In* — type in what's physically on the shelf. No supplier or PO needed. See `02-branch-inventory-guide.md`.
   - **Formal:** *Purchasing → New PO*, then receive it — records supplier price history and a batch with an expiry date. See `07-purchasing-guide.md`.
   - A branch that only sells prepared dishes still needs raw material stock loaded at the **commissary** first — a recipe can't consume ingredients that were never stocked in anywhere.
8. **Production** — only for items that are batch-prepared ahead of time (not cooked to order). Converts raw material stock into sellable product stock. See `03-commissary-production-guide.md`.
9. **Start a Shift** — the last gate: the POS screen won't let anyone ring a sale until someone opens the till with a starting cash float. This is a daily step, not one-time — see `01-pos-cashier-guide.md`.
10. **Now a sale can happen** — open an order, add items, pay it.

Steps 1–6 are one-time setup per location. Steps 7–9 repeat regularly (new deliveries, new production batches, every day's shift).

## 3. Logging in

1. Open the web address given to you by your manager (it will look like `https://restaurant-ops-platform-iota.vercel.app`).
2. Enter your **email** and **password**.
3. Click **Sign in**.

If you don't have a login yet, ask the Owner or an Admin to create one for you (see the Owner/Admin guide — *Master Data → Users*).

**Forgot your password?** Ask an Owner/Admin to give you a new temporary one from the Users screen — there is no self-service "forgot password" yet in this version.

## 4. Your role determines what you see

| Role | What you can do |
|---|---|
| **Owner** | Everything — all branches, all settings, all reports |
| **Admin** | Same as Owner, except a few org-level settings reserved for the Owner |
| **Commissary Staff** | Manage commissary inventory, production, and outgoing transfers |
| **Branch Manager** | Full control of their own branch: inventory, transfers, POS, reports |
| **Branch Staff** | Take POS orders, receive incoming transfers, view stock at their branch |

If a menu or button described in these guides doesn't appear for you, that's expected — it means your role doesn't need it, not that something is broken.

## 5. The top navigation

After logging in you'll land on the **Executive Dashboard** (Owner/Admin) or the **POS screen** (branch/commissary roles, depending on setup). From there:

- **Master Data** — the "settings" area: branches, categories, units, raw materials, products, suppliers, users, roles (Owner/Admin only)
- **Inventory** — stock levels, stock in/out, adjustments, stock counts, waste reports, expiring-soon batches, stock ledger
- **Transfers** — sending and receiving stock between locations
- **Purchasing** — purchase orders to suppliers, and receiving deliveries (see `07-purchasing-guide.md`)
- **Production** — recipes and production runs (commissary)
- **POS** — the till screen: shifts, open orders/tabs, and taking payment (see `01-pos-cashier-guide.md`)
- **Time Clock** — clocking in/out for your shift (everyone — see `06-time-clock-guide.md`)
- **Reports** — printable/exportable reports, including business-analytics reports for the Owner/Admin

Every screen has a **Sign out** button in the top-right corner. On a phone or tablet, the navigation is tucked behind a menu icon (☰) next to the logo instead of a sidebar — tap it to get the same list of screens.

## 6. One important habit: don't guess quantities

Every number you type into this system — a stock-in delivery, a production quantity, a transfer amount — becomes a permanent record. If you're not sure of an exact count, it's better to physically check than to guess. The system will not stop you from entering a wrong number, but it will remember it.

If you do make a mistake, don't worry — every mistake can be corrected with an **Adjustment** (see the Branch Inventory guide). Nothing is locked in forever.
