import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PieChart, Sparkles, Wallet, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spend Manager · Know where your money goes" },
      {
        name: "description",
        content:
          "Spend Manager is a simple expense tracker in rupees: log spends in seconds, auto-sorted categories, monthly budgets and clear charts.",
      },
      { property: "og:title", content: "Spend Manager · Know where your money goes" },
      {
        property: "og:description",
        content: "Log spends in seconds, auto-sorted categories, monthly budgets and clear charts.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "Categories on autopilot",
    body: "Type “Swiggy” and it lands in Food. Type “Uber” and it lands in Transport. Change it anytime.",
  },
  {
    icon: PieChart,
    title: "Charts that actually answer things",
    body: "Category split, week-by-week spending and month comparisons on one screen.",
  },
  {
    icon: Wallet,
    title: "Budgets with early warnings",
    body: "Set a monthly limit per category and get nudged before you blow past it.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Your expenses are tied to your account only. No bank passwords, no UPI PINs, ever.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          Spend Manager
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <Sparkles className="size-3" /> Built for UPI-first spending
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-semibold md:text-6xl">
              Know exactly where your money went this month.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Add a spend in five seconds, let it sort itself into a category, set a monthly budget, and watch a clean
              dashboard do the maths for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Start tracking <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/auth">I already have an account</Link>
              </Button>
            </div>
          </div>

          <div className="surface p-6">
            <p className="text-sm text-muted-foreground">September spending</p>
            <p className="num mt-1 text-4xl font-semibold">₹9,250</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[77%] rounded-full bg-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">77% of your ₹12,000 budget used · ₹2,750 left</p>

            <div className="mt-6 space-y-3">
              {[
                { emoji: "🍜", label: "Food", sub: "Swiggy · UPI", value: "₹420", tint: "tint-food" },
                { emoji: "🚕", label: "Transport", sub: "Uber · UPI", value: "₹230", tint: "tint-transport" },
                { emoji: "🛍️", label: "Shopping", sub: "Amazon · Card", value: "₹1,299", tint: "tint-shopping" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl ${row.tint} text-base`}>{row.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.sub}</p>
                  </div>
                  <span className="num ml-auto text-sm font-semibold">-{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="surface p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Spend Manager — an expense tracker, not a banking app. It never moves money.
      </footer>
    </div>
  );
}
