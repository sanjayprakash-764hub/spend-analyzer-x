import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { CATEGORIES, categoryMeta, money, prettyDate, type Transaction } from "@/lib/expenses";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses · Spend Manager" },
      { name: "description", content: "Every expense you have recorded, with search, category filters and editing." },
      { property: "og:title", content: "Expenses · Spend Manager" },
      { property: "og:description", content: "Search, filter, edit and delete your recorded expenses." },
    ],
  }),
  component: Expenses,
});

function Expenses() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, category, merchant, date, payment_method, description")
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Transaction[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Expense deleted");
    },
    onError: () => toast.error("Could not delete that expense"),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!term) return true;
      return `${item.merchant ?? ""} ${item.description ?? ""} ${item.category}`.toLowerCase().includes(term);
    });
  }, [transactions, search, category]);

  const total = filtered.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{filtered.length} entries · {money(total)}</p>
          <h1 className="text-3xl font-semibold">Expenses</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add expense
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search merchant or note"
            className="pl-9"
            maxLength={80}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {categoryMeta(item).emoji} {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="surface divide-y divide-border p-2">
        {isLoading && <p className="p-5 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">No expenses match this view yet.</p>
        )}
        {filtered.map((item) => {
          const meta = categoryMeta(item.category);
          return (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <span className={`grid size-11 place-items-center rounded-xl ${meta.tint} text-base`}>{meta.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.merchant || item.category}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.category} · {item.payment_method} · {prettyDate(item.date)}
                  {item.description ? ` · ${item.description}` : ""}
                </p>
              </div>
              <span className="num text-sm font-semibold">-{money(item.amount)}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit expense"
                onClick={() => {
                  setEditing(item);
                  setDialogOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete expense"
                onClick={() => remove.mutate(item.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
