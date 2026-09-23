import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { MONTH_NAMES, categoryMeta, iso, money, monthRange, prettyDate, type Transaction } from "@/lib/expenses";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Spend Manager" },
      { name: "description", content: "Your monthly spending, category split, budget progress and recent expenses." },
      { property: "og:title", content: "Dashboard · Spend Manager" },
      { property: "og:description", content: "Monthly spending, category split and budget progress at a glance." },
    ],
  }),
  component: Dashboard,
});

type Budget = { id: string; category: string; amount: number; month: number; year: number };

function Dashboard() {
  const [adding, setAdding] = useState(false);
  const now = new Date();
  const current = monthRange(now);
  const previous = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", previous.start, current.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, category, merchant, date, payment_method, description")
        .gte("date", previous.start)
        .lte("date", current.end)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Transaction[];
    },
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", current.year, current.month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("id, category, amount, month, year")
        .eq("month", current.month)
        .eq("year", current.year);
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Budget[];
    },
  });

  const stats = useMemo(() => {
    const thisMonth = transactions.filter((t) => t.date >= current.start && t.date <= current.end);
    const lastMonth = transactions.filter((t) => t.date >= previous.start && t.date <= previous.end);
    const total = sum(thisMonth);
    const lastTotal = sum(lastMonth);

    const today = iso(now);
    const weekStart = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));

    const byCategory = new Map<string, number>();
    for (const t of thisMonth) byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    const categoryRows = [...byCategory.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

    const weekly: Array<{ label: string; value: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = iso(day);
      weekly.push({
        label: day.toLocaleDateString("en-IN", { weekday: "short" }),
        value: sum(transactions.filter((t) => t.date === key)),
      });
    }

    const overall = budgets.find((b) => b.category === "Overall")?.amount ?? 0;
    const daysElapsed = now.getDate();
    const projected = daysElapsed > 0 ? (total / daysElapsed) * current.daysInMonth : 0;

    return {
      thisMonth,
      total,
      lastTotal,
      todayTotal: sum(thisMonth.filter((t) => t.date === today)),
      weekTotal: sum(transactions.filter((t) => t.date >= weekStart && t.date <= today)),
      categoryRows,
      weekly,
      overall,
      projected,
      recent: thisMonth.slice(0, 6),
    };
  }, [transactions, budgets, current.start, current.end, current.daysInMonth, previous.start, previous.end, now]);

  const remaining = stats.overall - stats.total;
  const used = stats.overall > 0 ? Math.min(100, (stats.total / stats.overall) * 100) : 0;
  const change = stats.lastTotal > 0 ? ((stats.total - stats.lastTotal) / stats.lastTotal) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add expense
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Total spent" value={money(stats.total)} accent />
        <Stat label="Budget" value={stats.overall > 0 ? money(stats.overall) : "Not set"} />
        <Stat
          label="Remaining"
          value={stats.overall > 0 ? money(remaining) : "—"}
          tone={stats.overall > 0 && remaining < 0 ? "bad" : "good"}
        />
        <Stat label="Spent today" value={money(stats.todayTotal)} hint={`This week ${money(stats.weekTotal)}`} />
      </div>

      {stats.overall > 0 && (
        <div className="surface p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Budget used</span>
            <span className="num text-muted-foreground">
              {money(stats.total)} / {money(stats.overall)}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${used}%`,
                backgroundColor: used >= 100 ? "var(--destructive)" : used >= 80 ? "var(--warning)" : "var(--primary)",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{Math.round(used)}% used</p>

          {used >= 80 && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning/15 p-3 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {used >= 100
                ? "You have gone past your monthly budget."
                : "You are close to your monthly budget limit."}
            </p>
          )}
          {stats.projected > stats.overall && (
            <p className="mt-3 text-sm text-muted-foreground">
              At this pace you may end the month around{" "}
              <span className="num font-semibold text-foreground">{money(stats.projected)}</span>. This is an estimate,
              not a prediction.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-6">
          <h2 className="text-lg font-semibold">Where it went</h2>
          {stats.categoryRows.length === 0 ? (
            <Empty isLoading={isLoading} />
          ) : (
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryRows}
                      dataKey="value"
                      nameKey="category"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {stats.categoryRows.map((row) => (
                        <Cell key={row.category} fill={categoryMeta(row.category).chart} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {stats.categoryRows.slice(0, 6).map((row) => (
                  <li key={row.category} className="flex items-center gap-3 text-sm">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: categoryMeta(row.category).chart }}
                    />
                    <span>{row.category}</span>
                    <span className="num ml-auto font-medium">{money(row.value)}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground">
                      {Math.round((row.value / stats.total) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Last 7 days</h2>
            {change !== null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {Math.abs(Math.round(change))}% vs last month
              </span>
            )}
          </div>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekly}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis hide />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="value" radius={[8, 8, 8, 8]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last month total: <span className="num">{money(stats.lastTotal)}</span>
          </p>
        </div>
      </div>

      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent transactions</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/expenses">See all</Link>
          </Button>
        </div>
        {stats.recent.length === 0 ? (
          <Empty isLoading={isLoading} />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {stats.recent.map((item) => {
              const meta = categoryMeta(item.category);
              return (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <span className={`grid size-10 place-items-center rounded-xl ${meta.tint}`}>{meta.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.merchant || item.category}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.category} · {item.payment_method} · {prettyDate(item.date)}
                    </p>
                  </div>
                  <span className="num ml-auto text-sm font-semibold">-{money(item.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ExpenseDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div className={`surface min-w-0 p-4 sm:p-5 ${accent ? "bg-accent" : ""}`}>
      <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p
        className={`num mt-1 truncate text-lg font-semibold sm:text-2xl ${tone === "bad" ? "text-destructive" : ""}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Empty({ isLoading }: { isLoading: boolean }) {
  return (
    <p className="mt-6 text-sm text-muted-foreground">
      {isLoading ? "Loading…" : "Nothing here yet. Add your first expense to see this fill up."}
    </p>
  );
}

function sum(rows: Transaction[]) {
  return rows.reduce((total, row) => total + row.amount, 0);
}
