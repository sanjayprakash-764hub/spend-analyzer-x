import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, MONTH_NAMES, categoryMeta, money, monthRange, type Transaction } from "@/lib/expenses";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({
    meta: [
      { title: "Budget · Spend Manager" },
      { name: "description", content: "Set a monthly budget overall and per category, and see how much is left." },
      { property: "og:title", content: "Budget · Spend Manager" },
      { property: "og:description", content: "Set monthly limits per category and track what's left." },
    ],
  }),
  component: BudgetPage,
});

type Budget = { id: string; category: string; amount: number };

function BudgetPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const { start, end, month, year } = monthRange(now);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("id, category, amount")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Budget[];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, category, merchant, date, payment_method, description")
        .gte("date", start)
        .lte("date", end);
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Transaction[];
    },
  });

  const spent = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const t of transactions) {
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
      total += t.amount;
    }
    map.set("Overall", total);
    return map;
  }, [transactions]);

  const save = useMutation({
    mutationFn: async ({ category, amount }: { category: string; amount: number }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You need to sign in again");
      if (amount <= 0) {
        const { error } = await supabase
          .from("budgets")
          .delete()
          .eq("category", category)
          .eq("month", month)
          .eq("year", year);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("budgets")
        .upsert(
          { user_id: auth.user.id, category, amount, month, year },
          { onConflict: "user_id,category,month,year" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save budget"),
  });

  const rows = ["Overall", ...CATEGORIES];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
        </p>
        <h1 className="text-3xl font-semibold">Budget</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a limit for the whole month, and optional limits per category. Leave a field at 0 to remove its limit.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((category) => {
          const budget = budgets.find((b) => b.category === category);
          const used = spent.get(category) ?? 0;
          const limit = budget?.amount ?? 0;
          const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
          const draft = drafts[category] ?? (limit > 0 ? String(limit) : "");
          const isOverall = category === "Overall";
          const meta = isOverall ? null : categoryMeta(category);

          return (
            <div key={category} className={`surface p-5 ${isOverall ? "bg-accent" : ""}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`grid size-10 place-items-center rounded-xl ${meta ? meta.tint : "bg-primary text-primary-foreground"}`}
                >
                  {meta ? meta.emoji : "₹"}
                </span>
                <div>
                  <p className="font-medium">{isOverall ? "Whole month" : category}</p>
                  <p className="num text-xs text-muted-foreground">
                    {money(used)}
                    {limit > 0 ? ` of ${money(limit)}` : " spent · no limit set"}
                  </p>
                </div>

                <div className="ml-auto flex items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`limit-${category}`} className="text-xs text-muted-foreground">
                      Monthly limit
                    </Label>
                    <Input
                      id={`limit-${category}`}
                      inputMode="decimal"
                      className="w-28"
                      value={draft}
                      placeholder="0"
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [category]: event.target.value }))}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => save.mutate({ category, amount: Number(draft) || 0 })}
                    disabled={save.isPending}
                  >
                    <Check className="size-4" /> Save
                  </Button>
                </div>
              </div>

              {limit > 0 && (
                <>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          pct >= 100 ? "var(--destructive)" : pct >= 80 ? "var(--warning)" : "var(--primary)",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{Math.round(pct)}% used</p>
                  {pct >= 80 && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-warning-foreground">
                      <AlertTriangle className="size-4" />
                      {pct >= 100
                        ? `${isOverall ? "Overall" : category} spending is over its limit.`
                        : `${isOverall ? "Overall" : category} spending is approaching its limit.`}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
