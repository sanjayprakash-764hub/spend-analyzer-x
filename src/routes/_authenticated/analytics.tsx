import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES, PAYMENT_METHODS, categoryMeta, iso, money } from "@/lib/expenses";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · Spend Manager" },
      { name: "description", content: "Six-month spending trend, top categories and payment-method split." },
      { property: "og:title", content: "Analytics · Spend Manager" },
      { property: "og:description", content: "See how your spending changes month to month." },
    ],
  }),
  component: Analytics,
});

type Row = { amount: number; category: string; date: string; payment_method: string };

function Analytics() {
  const now = new Date();
  const start = iso(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, category, date, payment_method")
        .gte("date", start)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { months, cats, methods, total } = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: (MONTH_NAMES[d.getMonth()] ?? "").slice(0, 3), total: 0 };
    });
    const cats = new Map<string, number>();
    const methods = new Map<string, number>();
    let total = 0;
    for (const r of data) {
      const a = Number(r.amount);
      const d = new Date(r.date + "T00:00:00");
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.total += a;
      cats.set(r.category, (cats.get(r.category) ?? 0) + a);
      methods.set(r.payment_method, (methods.get(r.payment_method) ?? 0) + a);
      total += a;
    }
    return {
      months,
      cats: [...cats.entries()].sort((a, b) => b[1] - a[1]),
      methods: PAYMENT_METHODS.map((m) => [m, methods.get(m) ?? 0] as const).filter(([, v]) => v > 0),
      total,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  if (isError)
    return (
      <div className="surface p-6 text-center">
        <p className="text-sm">Couldn't load your analytics.</p>
        <Button className="mt-3" onClick={() => refetch()}>Try again</Button>
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 6 months · {money(total)} total</p>
      </div>
      {total === 0 ? (
        <div className="surface p-6 text-center text-sm text-muted-foreground">Add a few expenses to see trends here.</div>
      ) : (
        <>
          <section className="surface p-4 sm:p-6">
            <h2 className="font-semibold">Monthly trend</h2>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <div className="grid gap-5 md:grid-cols-2">
            <section className="surface p-4 sm:p-6">
              <h2 className="font-semibold">Top categories</h2>
              <ul className="mt-3 space-y-3">
                {cats.map(([c, v]) => (
                  <li key={c}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate">{categoryMeta(c).emoji} {c}</span>
                      <span className="num shrink-0">{money(v)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(v / total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="surface p-4 sm:p-6">
              <h2 className="font-semibold">By payment method</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {methods.map(([m, v]) => (
                  <li key={m} className="flex justify-between">
                    <span>{m}</span>
                    <span className="num">{money(v)} · {Math.round((v / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
