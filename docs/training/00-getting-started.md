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

## 2. Logging in

1. Open the web address given to you by your manager (it will look like `https://restaurant-ops-platform-iota.vercel.app`).
2. Enter your **email** and **password**.
3. Click **Sign in**.

If you don't have a login yet, ask the Owner or an Admin to create one for you (see the Owner/Admin guide — *Master Data → Users*).

**Forgot your password?** Ask an Owner/Admin to give you a new temporary one from the Users screen — there is no self-service "forgot password" yet in this version.

## 3. Your role determines what you see

| Role | What you can do |
|---|---|
| **Owner** | Everything — all branches, all settings, all reports |
| **Admin** | Same as Owner, except a few org-level settings reserved for the Owner |
| **Commissary Staff** | Manage commissary inventory, production, and outgoing transfers |
| **Branch Manager** | Full control of their own branch: inventory, transfers, POS, reports |
| **Branch Staff** | Take POS orders, receive incoming transfers, view stock at their branch |

If a menu or button described in these guides doesn't appear for you, that's expected — it means your role doesn't need it, not that something is broken.

## 4. The top navigation

After logging in you'll land on the **Executive Dashboard** (Owner/Admin) or the **POS screen** (branch/commissary roles, depending on setup). From there:

- **Master Data** — the "settings" area: branches, categories, units, raw materials, products, users, roles (Owner/Admin only)
- **Inventory** — stock levels, stock in/out, adjustments, stock ledger
- **Transfers** — sending and receiving stock between locations
- **Production** — recipes and production runs (commissary)
- **POS** — the till screen for taking orders
- **Time Clock** — clocking in/out for your shift (everyone — see `06-time-clock-guide.md`)
- **Reports** — printable/exportable reports

Every screen has a **Sign out** button in the top-right corner. On a phone or tablet, the navigation is tucked behind a menu icon (☰) next to the logo instead of a sidebar — tap it to get the same list of screens.

## 5. One important habit: don't guess quantities

Every number you type into this system — a stock-in delivery, a production quantity, a transfer amount — becomes a permanent record. If you're not sure of an exact count, it's better to physically check than to guess. The system will not stop you from entering a wrong number, but it will remember it.

If you do make a mistake, don't worry — every mistake can be corrected with an **Adjustment** (see the Branch Inventory guide). Nothing is locked in forever.
