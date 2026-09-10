function Tip({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">{children}</div>;
}

function Warning({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning">{children}</div>;
}

function Section({
  id,
  eyebrow,
  question,
  children,
}: {
  id: string;
  eyebrow: string;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-border py-10 first:pt-0 last:border-0">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold text-foreground">{question}</h2>
      <div className="mt-4 max-w-2xl">{children}</div>
    </section>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-outside list-decimal space-y-2.5 pl-5 text-sm text-foreground marker:text-muted-foreground">{children}</ol>;
}

export default function FaqsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">FAQs &amp; How-To Guides</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Step-by-step answers to the questions that come up most. Pick a topic from the menu, or just scroll — everyone's covered
        here, from a brand-new location to a daily cashier shift.
      </p>

      <Section id="setup" eyebrow="Getting Started" question="What order should a new location set up in?">
        <p className="text-sm text-muted-foreground">
          Everything downstream depends on something built earlier — you can&apos;t sell a dish before it exists, and you
          can&apos;t process a sale without real stock behind it. Do these in order:
        </p>
        <Steps>
          <li>
            <strong>Branches</strong> — every location, created first, under Master Data → Branches.
          </li>
          <li>
            <strong>The first Owner/Admin login</strong> — set up once by whoever deploys the system. Every other user is
            created normally after this, from Master Data → Users.
          </li>
          <li>
            <strong>Units of Measure and Categories</strong> — check Master Data has a sensible starter set (kg, g, L, pc, and
            a first pass at categories). Raw materials and products can&apos;t be created without these.
          </li>
          <li>
            <strong>Raw Materials and Products</strong> — the real item catalog: every ingredient (cost per unit, reorder
            point) and every sellable item (price). See <a href="#new-item" className="text-primary hover:underline">Add a New Item to the Catalog</a>.
          </li>
          <li>
            <strong>Recipes (BOM)</strong> — optional, but do this for anything cooked from ingredients. See{" "}
            <a href="#recipes" className="text-primary hover:underline">Create a Recipe</a>.
          </li>
          <li>
            <strong>Suppliers</strong> — only needed if you&apos;ll use formal Purchase Orders.
          </li>
          <li>
            <strong>Get real stock into the system</strong> — see <a href="#stock-in" className="text-primary hover:underline">Add Stock</a>. A
            branch that only sells prepared dishes still needs raw material stock loaded at the commissary first.
          </li>
          <li>
            <strong>Production</strong> — only for items batch-prepared ahead of time, not cooked to order.
          </li>
          <li>
            <strong>Start a Shift</strong> — the last gate: the POS screen won&apos;t let anyone ring a sale until someone
            opens the till. This is a daily step, not one-time — see <a href="#shifts" className="text-primary hover:underline">Start &amp; End a POS Shift</a>.
          </li>
        </Steps>
        <Tip>Steps 1–6 are one-time setup per location. Steps 7–9 repeat regularly — new deliveries, new production batches, every day&apos;s shift.</Tip>
      </Section>

      <Section id="new-item" eyebrow="Getting Started" question="How do I add a new item to the catalog?">
        <p className="text-sm text-muted-foreground">
          This is a one-time step per item — before any stock can exist, the item itself has to be defined.
        </p>
        <Steps>
          <li>
            Go to <strong>Master Data → Raw Materials</strong> (for ingredients) or <strong>Master Data → Products</strong>{" "}
            (for sellable dishes and retail items).
          </li>
          <li>Click <strong>Add</strong>.</li>
          <li>Fill in the Name, SKU, Category, and Unit of Measure.</li>
          <li>
            Raw materials: set the <strong>cost per unit</strong> and a <strong>reorder point</strong> (the threshold that
            triggers a low-stock warning on the Dashboard).
          </li>
          <li>Products: set a real <strong>selling price</strong> — an item with no price rings up as ₱0 at the till.</li>
          <li>Save — the item now exists with zero stock, ready for a Stock In or Purchase Order.</li>
        </Steps>
      </Section>

      <Section id="stock-in" eyebrow="Inventory" question="How do I add stock of an existing item?">
        <p className="text-sm text-muted-foreground">There are two ways to do this, depending on how formal you need it to be.</p>
        <p className="mt-4 text-sm font-medium text-foreground">Fast path — Stock In</p>
        <Steps>
          <li>Go to <strong>Inventory → Stock In / Out / Adjust</strong>.</li>
          <li>Make sure <strong>Stock In</strong> is selected at the top.</li>
          <li>Pick the branch, the item, and the quantity received.</li>
          <li>Raw materials only: optionally enter an <strong>Expiry Date</strong> if it&apos;s on the packaging — this creates a tracked batch.</li>
          <li>Add a note (e.g. supplier name), then submit.</li>
        </Steps>
        <p className="mt-5 text-sm font-medium text-foreground">Formal path — Purchase Order</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Use this when you want the price and delivery formally tracked against a specific supplier. See{" "}
          <a href="#purchasing" className="text-primary hover:underline">Create &amp; Receive a Purchase Order</a>.
        </p>
        <Tip>
          Stock also arrives two other ways that aren&apos;t manual entry: <strong>Transfers</strong> (received from another
          branch) and <strong>Production</strong> (raw materials converted into a finished product via a recipe).
        </Tip>
      </Section>

      <Section id="transfers" eyebrow="Inventory" question="How do I receive a transfer from another branch?">
        <Steps>
          <li>
            Go to <strong>Transfers</strong>. Anything with status <strong>In Transit</strong> is on its way to you and
            waiting to be confirmed.
          </li>
          <li>Click <strong>View</strong> on the transfer.</li>
          <li>
            Physically count what actually arrived. The <strong>Received</strong> column shows what was sent — if the count
            matches, leave it as-is; if it doesn&apos;t, correct the number to what you actually received.
          </li>
          <li>Click <strong>Confirm Receipt</strong>.</li>
        </Steps>
        <Warning>
          Count carefully before confirming — once confirmed, the transfer is done. Any correction after that has to go
          through a manual Adjustment, which creates a mismatch in the transfer record.
        </Warning>
      </Section>

      <Section id="adjustment" eyebrow="Inventory" question="How do I fix a wrong inventory count?">
        <p className="text-sm text-muted-foreground">
          Use this when a physical count doesn&apos;t match what the system shows — a missed Stock In/Out entry, a receiving
          mistake, or a counting error somewhere upstream.
        </p>
        <Steps>
          <li>Go to <strong>Inventory → Stock In / Out / Adjust</strong>, select <strong>Adjustment</strong>.</li>
          <li>Pick the item.</li>
          <li>
            In <strong>Corrected Quantity</strong>, type the <em>actual physical count</em> you just did — not the
            difference, the real total.
          </li>
          <li>Add a note (e.g. &ldquo;Weekly count, 8/10&rdquo;).</li>
          <li>Submit — the system calculates the difference itself and records it.</li>
        </Steps>
        <Tip>Never try to &ldquo;fix&rdquo; a count using Stock In/Out — that&apos;s for real movements (deliveries, spoilage), not corrections.</Tip>
      </Section>

      <Section id="stock-count" eyebrow="Inventory" question="How do I run a full physical stock count?">
        <p className="text-sm text-muted-foreground">
          Use an Adjustment when you&apos;re correcting one item you already know is wrong. Use a Stock Count when
          you&apos;re counting <em>everything</em> — a scheduled weekly or monthly inventory count across a whole category.
        </p>
        <Steps>
          <li>Go to <strong>Inventory → Stock Counts</strong>, tap <strong>Start New Count</strong>, and pick Raw Materials or Products.</li>
          <li>The system snapshots what it currently thinks you have for every item of that type — the <strong>Expected</strong> column.</li>
          <li>Physically count each item and type what you actually counted into <strong>Counted</strong> for each row.</li>
          <li>Tap <strong>Complete Count</strong> when you&apos;ve entered everything.</li>
        </Steps>
        <Tip>
          The system posts an adjustment automatically for every item where Counted differs from Expected — no need to also
          do a manual Adjustment. If a sale happens mid-count, it&apos;s compared against live stock at the moment you
          finish, not the stale snapshot, so it&apos;s never mistaken for shrinkage.
        </Tip>
      </Section>

      <Section id="waste" eyebrow="Inventory" question="How do I report waste or spoilage?">
        <Steps>
          <li>Go to <strong>Inventory → Waste Reports</strong>, tap <strong>Report Waste</strong>.</li>
          <li>Pick the item, quantity, and a <strong>Reason</strong> — Spoilage, Damage, or Expiry.</li>
          <li>Add a note, then submit.</li>
        </Steps>
        <Tip>
          Reporting waste doesn&apos;t deduct stock immediately — it sits as <strong>Pending</strong> until a manager or
          owner <strong>Approves</strong> it from the same screen. Only approval actually removes it from stock.
        </Tip>
      </Section>

      <Section id="expiring" eyebrow="Inventory" question="How do I check what's expiring soon?">
        <Steps>
          <li>Go to <strong>Inventory → Expiring Soon</strong>.</li>
          <li>Pick a window — next 3, 7, 14, or 30 days.</li>
          <li>The list shows every batch nearing its expiry date, oldest first, so you can use or discount it before it goes bad.</li>
        </Steps>
        <Tip>
          You don&apos;t need to manually track which lot to use first — the system automatically consumes the
          oldest-expiring batch whenever stock is used, in a sale, production, or transfer out.
        </Tip>
      </Section>

      <Section id="purchasing" eyebrow="Purchasing" question="How do I create and receive a purchase order?">
        <p className="text-sm text-muted-foreground">
          First time buying from a supplier? Add them once under <strong>Master Data → Suppliers</strong> — after that,
          they&apos;re on the list for every future PO.
        </p>
        <p className="mt-4 text-sm font-medium text-foreground">Creating the order</p>
        <Steps>
          <li>Go to <strong>Purchasing → New PO</strong>.</li>
          <li>Pick the Supplier and the Branch it&apos;s being delivered to.</li>
          <li>Add each item with quantity and the agreed price per unit. Use <strong>+ Add item</strong> for more than one line.</li>
          <li>Submit — the PO is now <strong>Ordered</strong>, waiting to be received.</li>
        </Steps>
        <p className="mt-5 text-sm font-medium text-foreground">Receiving the delivery</p>
        <Steps>
          <li>Open the PO from the Purchasing list.</li>
          <li>For each item, enter what was <strong>actually delivered</strong> — this can differ from what was ordered.</li>
          <li>Enter the <strong>Actual Cost</strong> if it&apos;s different from the agreed price.</li>
          <li>If it has an expiry date, enter it — this creates a tracked batch.</li>
          <li>Tap <strong>Confirm Receipt</strong>.</li>
        </Steps>
        <Tip>
          If the price is unusually high compared to recent purchases (roughly 10%+ above average), the system flags it
          after you confirm — the receipt still goes through, but you&apos;ll see the warning so you can follow up with the
          supplier if it looks wrong.
        </Tip>
      </Section>

      <Section id="recipes" eyebrow="Production" question="How do I create a recipe (BOM)?">
        <p className="text-sm text-muted-foreground">
          A recipe (Bill of Materials) defines what raw ingredients go into one finished item, and how much of each — this
          is what lets a POS sale automatically deduct the right ingredients.
        </p>
        <Steps>
          <li>Go to <strong>Production → Recipes / BOM</strong>, tap <strong>New Recipe</strong>.</li>
          <li>Pick the Product it&apos;s for, and the <strong>Yield Quantity</strong> — how many finished units one recipe run produces.</li>
          <li>Add each raw material ingredient with the quantity used, in that ingredient&apos;s own tracked unit.</li>
          <li>Save.</li>
        </Steps>
        <Tip>
          A product with no recipe isn&apos;t broken — it just deducts its <em>own</em> stock directly when sold, instead of
          decomposing into ingredients. Only add a recipe for items actually made from raw ingredients you want tracked.
        </Tip>
      </Section>

      <Section id="production" eyebrow="Production" question="How do I run a production batch?">
        <p className="text-sm text-muted-foreground">
          Use this for batch-preparing something ahead of time — marinating and portioning a big batch of chicken, frying a
          batch of lechon kawali — rather than something cooked to order at the moment of sale.
        </p>
        <Steps>
          <li>Go to <strong>Production → Production Runs</strong>, then <strong>New Production Run</strong>.</li>
          <li>Pick the Branch (usually the Commissary) and the Recipe.</li>
          <li>Enter <strong>Quantity Produced</strong> — how many finished units you&apos;re making in this batch.</li>
          <li>Submit.</li>
        </Steps>
        <Tip>
          The system immediately deducts the raw ingredients (scaled to your quantity) and adds the finished quantity as
          product stock. If there isn&apos;t enough of an ingredient, it refuses and tells you which one is short —
          check Stock Levels before you start prepping.
        </Tip>
      </Section>

      <Section id="shifts" eyebrow="Point of Sale" question="How do I start and end a POS shift?">
        <p className="mt-1 text-sm font-medium text-foreground">Starting a shift</p>
        <Steps>
          <li>Go to <strong>POS</strong>. If no shift is open, you&apos;ll see a Start Shift screen instead of orders.</li>
          <li>Count the cash actually in the drawer right now.</li>
          <li>Type that amount into <strong>Starting Cash</strong>, tap <strong>Start Shift</strong>.</li>
        </Steps>
        <p className="mt-5 text-sm font-medium text-foreground">Ending a shift</p>
        <Steps>
          <li>From the Open Orders screen, tap <strong>Close Shift</strong> (top right).</li>
          <li>Physically count the cash in the drawer.</li>
          <li>Type that count into <strong>Counted Cash</strong>, add a note if useful, and tap <strong>Close Shift</strong>.</li>
        </Steps>
        <Tip>
          The system shows <strong>Expected Cash</strong> (starting float + everything paid during the shift) against what
          you counted, and the variance. Close out any open tabs first where you can — an order still open when you close
          out doesn&apos;t count toward your shift&apos;s expected cash.
        </Tip>
      </Section>

      <Section id="orders" eyebrow="Point of Sale" question="How do I open, add to, and pay a POS order (tab)?">
        <p className="text-sm text-muted-foreground">
          Tables stay open as tabs while a customer is still eating, and only become a real sale once they&apos;re paid.
        </p>
        <p className="mt-4 text-sm font-medium text-foreground">Opening a tab</p>
        <Steps>
          <li>From <strong>Open Orders</strong>, tap <strong>+ New Order</strong>.</li>
          <li>Give it a label if it helps (e.g. &ldquo;Table 5&rdquo;) — optional.</li>
        </Steps>
        <p className="mt-5 text-sm font-medium text-foreground">Adding items</p>
        <Steps>
          <li>Tap a category tab, then tap menu items to build the current batch.</li>
          <li>Tap <strong>Add to Order</strong> to commit it — stock is deducted immediately, the running total updates.</li>
          <li>Come back and repeat as many times as the table orders more, for as long as the order stays open.</li>
        </Steps>
        <p className="mt-5 text-sm font-medium text-foreground">Paying and closing</p>
        <Steps>
          <li>From inside the order, choose a <strong>Discount</strong> if it applies (e.g. Senior Citizen / PWD).</li>
          <li>Type the <strong>Amount Tendered</strong>.</li>
          <li>Tap <strong>Pay &amp; Close Order</strong> — this is final and can&apos;t be reopened.</li>
        </Steps>
        <Tip>An order with nothing added yet shows a <strong>Void Order</strong> button instead — use that for a table opened by mistake.</Tip>
      </Section>

      <Section id="users" eyebrow="Admin" question="How do I add a user or reset a password?">
        <Steps>
          <li>Go to <strong>Master Data → Users</strong> (Owner/Admin only).</li>
          <li>Click <strong>Add User</strong> for a new account, or open an existing one to change their password.</li>
          <li>Fill in Full Name, Email, Role, and (for branch-scoped roles) their Branch.</li>
          <li>Set an initial password and give it to them — they can log in right away.</li>
        </Steps>
        <Tip>
          There&apos;s no self-service &ldquo;forgot password&rdquo; in this version — only an Owner/Admin can set a new one,
          from this same screen. Deactivate a user instead of trying to delete them: it blocks their login immediately
          without losing their history in past records.
        </Tip>
      </Section>
    </div>
  );
}
