# Restaurant Operations Platform — Phased Build (PAID SCOPE ONLY)

Read this before writing any code.

This repository implements the **Restaurant Operations & Commissary Management Platform**, per the proposal dated 2026-07-22 ("Restaurant_Operations_Platform_Proposal.docx"). The full platform is scoped as **four independent, fixed-price phases (₱350,000 each, ₱1,400,000 total)**. A separate system, **CASA OS** (AI Accounting & Finance, 5 phases, ₱2,150,000 total), is a *different contract* that is not built in this repo under any circumstances until its own SOW is signed and its own precondition is met — see below.

**Hard rule:** Do not create database tables, API routes, UI screens, background jobs, or "just in case" placeholder fields for anything outside the **current active phase**. If a request would require building something from a future phase or from CASA OS, stop and say so explicitly instead of doing it — no matter how small or how naturally it seems to follow from active-phase work. Point back to this file. This applies to every future session, not just the first one.

If you (the human) ask for something borderline, and Claude Code flags it as out of scope, that's the system working correctly — don't override it without deliberately deciding to execute the next phase's SOW and pay for it.

## Phase Gate Protocol

Per the proposal's payment terms: each phase requires 50% payment on SOW signing, 50% on UAT sign-off, and the next phase does not begin until the prior phase is **fully paid and formally signed off**. Work in this repo must mirror that gate exactly — treat "signed SOW + payment on file" as a build permission, not a formality.

| Phase | Scope | Investment | Status |
|---|---|---|---|
| **Ops Phase 1** | Core Operations & POS Integration | ₱350,000 | ✅ **PAID — ACTIVE. Build this.** |
| Ops Phase 2 | Procurement & Warehouse Operations | ₱350,000 | 🔒 Locked — no SOW/payment |
| Ops Phase 3 | Business Intelligence & Analytics | ₱350,000 | 🔒 Locked — no SOW/payment |
| Ops Phase 4 | Automation & Enterprise Expansion | ₱350,000 | 🔒 Locked — no SOW/payment |
| CASA Phase 1–5 | Separate contract (accounting/finance) | ₱2,150,000 | 🔒 Locked — separate contract. **Client policy: will not start until all four Ops Platform phases are complete** (stricter than the proposal's own minimum precondition of Ops Phase 1 live 30+ days with production data — see note below) |

**Update this table only when you (the human) confirm a new phase's SOW is signed and its initial payment is on file.** Do not update it based on inference, verbal mentions, or "we're probably going to sign soon."

---

## Ops Phase 1 — In Scope (build now)

**Master Data**
* Products, raw materials, categories, units of measure
* Branches, users, roles

**Commissary Inventory**
* Raw material & finished goods stock
* Stock in / stock out
* Inventory adjustments
* Stock ledger (audit trail of every movement)

**Branch Inventory**
* Per-branch stock visibility
* Receiving of transfers from commissary

**Stock Transfers**
* Commissary → branch (and branch → branch)
* Transfer history, delivery/receiving confirmation

**Basic Production**
* Convert raw materials into finished goods via a Recipe/Bill of Materials (BOM)
* Automatic raw material consumption on production

**POS Integration**
* Sales sync from the client's existing POS (assumes API/DB/export access — confirm before building a specific integration; if unavailable, flag as a change request per the proposal's assumptions, don't silently scope-reduce)
* Automatic inventory deduction from sales
* Daily sales import, sales summary dashboard

**Executive Dashboard**
* Current inventory, inventory value, branch stock levels
* Sales today, top-selling products, low-stock alerts

**Core Reports**
* Inventory, stock movement, branch inventory, transfers, production, daily sales

**Platform Basics**
* Role-based access control
* Audit logs on all inventory/production/transfer actions
* Mobile-responsive web UI (not a native/PWA app — that's Ops Phase 4)

---

## Explicitly Out of Scope (do not build until unlocked in the table above)

### Ops Phase 2 — Procurement & Warehouse Operations (locked)
* Supplier management and supplier price history
* Purchase requests and purchase orders
* Goods receiving, with receiving discrepancy handling
* Waste management (spoilage, damage, expiry) with reason codes and approval workflow
* Stock count / cycle count and inventory adjustments beyond basic Phase 1 adjustments
* Batch and expiration (FIFO/FEFO) tracking
* Enhanced inventory reporting (aging, variance, supplier performance)

### Ops Phase 3 — Business Intelligence & Analytics (locked)
* Food cost analysis per menu item
* Branch performance dashboard and cross-branch comparison
* Profitability reporting by product and by branch
* Sales and inventory analytics beyond Phase 1's basic dashboard/reports
* Scheduled and emailed reports for management

### Ops Phase 4 — Automation & Enterprise Expansion (locked)
* Automatic production planning based on historical sales / AI demand forecasting
* Delivery management and driver/vehicle assignment
* Mobile PWA for branch and warehouse staff
* Barcode/QR code batch traceability
* Accounting system integration (e.g., QuickBooks/Xero)
* Additional branch onboarding automation and new external API integrations

### CASA OS — entirely separate contract, all 5 phases (locked)
Not this repo, not this contract, regardless of what Ops Platform phase is active:
* General Ledger, Accounts Payable/Receivable, Expense Management, Petty Cash
* Cash management, bank reconciliation
* Purchasing-to-payment workflow closure / automatic journal entries
* AI bookkeeping / transaction classification
* Budgeting, AI variance flagging, AI financial-analysis narratives
* Fixed Asset Register
* Payroll (any computation or integration, even via third party)
* Tax/compliance reporting (VAT, withholding tax, BIR-related)
* AI fraud detection, natural-language "CEO Command Center", cash flow forecasting

If a feature request sounds like any of the above, it belongs in a different phase or a different contract — not in this repo's current build.

---

## Tech Stack
* Frontend: React 19 + Next.js
* Backend: Hono
* Database: PostgreSQL via Supabase
* Auth: Supabase Auth (or Clerk — confirm before starting auth work)
* Storage: Supabase Storage
* Realtime: Supabase Realtime (for cross-branch stock visibility)
* Reporting/exports: TanStack Table + PDF/Excel export

## Architecture Notes
* Design the database schema to be reasonably extensible (e.g., don't hardcode assumptions that would make Ops Phase 2+ painful to bolt on later), but do not create Phase 2+/CASA tables, migrations, or endpoints now. "Extensible" means "won't require a rewrite," not "partially pre-built."
* Every inventory-affecting action (stock in/out, transfer, production, sale-triggered deduction) must write to an append-only ledger/audit trail — this is an Ops Phase 1 requirement, not optional.
* Keep POS integration behind an adapter/interface so a different POS vendor's integration doesn't require touching core inventory logic.
* CASA OS will eventually consume this platform's data as a system of record (per the CASA OS roadmap). Don't build toward that integration now, but don't design Phase 1 in a way that would require re-architecting the data model just to make that future consumption possible — extensibility, not pre-building.

## Definition of Done for Ops Phase 1
* All "In Scope" items above are implemented and demoable end-to-end: a sale at a branch POS correctly deducts the right raw materials via the recipe/BOM, updates branch and commissary stock, and shows up correctly on the executive dashboard and reports.
* Role-based access control enforced on all screens/endpoints.
* Audit log covers every stock-affecting action.
* User training materials/documentation exist for branch managers and the owner.
* Deployed to production hosting, client has logged in and used it with real data for at least one full day per branch before sign-off.
* Note: the CASA OS roadmap's own minimum precondition is Ops Phase 1 live 30+ days with stable production data across all branches — that alone would technically permit proposing CASA Phase 1. The client has set a stricter internal policy: CASA OS work does not begin until **all four Ops Platform phases** (1–4) are complete, paid, and signed off. Treat the stricter policy as the operative gate for this repo and for any client-facing timeline discussion — don't revert to the proposal's lighter minimum without the client explicitly relaxing this.
