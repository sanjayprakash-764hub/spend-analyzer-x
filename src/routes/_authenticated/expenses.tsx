import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { CATEGORIES, PAYMENT_METHODS, categoryMeta, money, prettyDate, type Transaction } from "@/lib/expenses";

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
  const [payment, setPayment] = useState("all");
  const [merchantFilter, setMerchantFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const activeFilters = [category !== "all", payment !== "all", merchantFilter !== "all", from, to, minAmount, maxAmount].filter(Boolean).length;
  const clearFilters = () => {
    setCategory("all");
    setPayment("all");
    setMerchantFilter("all");
    setFrom("");
    setTo("");
    setMinAmount("");
    setMaxAmount("");
  };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, category, merchant, date, payment_method, description")
        .order("date", { ascending: false })
        .limit(2000);
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

  const merchants = useMemo(
    () => [...new Set(transactions.map((t) => t.merchant?.trim()).filter((m): m is string => Boolean(m)))].sort((a, b) => a.localeCompare(b)),
    [transactions],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);
    return transactions.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (payment !== "all" && item.payment_method !== payment) return false;
      if (merchantFilter !== "all" && (item.merchant ?? "").trim() !== merchantFilter) return false;
      if (from && item.date < from) return false;
      if (to && item.date > to) return false;
      if (min !== null && Number.isFinite(min) && item.amount < min) return false;
      if (max !== null && Number.isFinite(max) && item.amount > max) return false;
      if (!term) return true;
      return `${item.merchant ?? ""} ${item.description ?? ""} ${item.category}`.toLowerCase().includes(term);
    });
  }, [transactions, search, category, payment, merchantFilter, from, to, minAmount, maxAmount]);

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
            placeholder="Search e.g. Amazon"
            className="pl-9"
            maxLength={80}
          />
        </div>
        <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal className="size-4" /> Filters{activeFilters ? ` (${activeFilters})` : ""}
        </Button>
        {activeFilters > 0 && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="size-4" /> Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="surface grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="From date">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FilterField>
          <FilterField label="To date">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FilterField>
          <FilterField label="Min amount (₹)">
            <Input inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          </FilterField>
          <FilterField label="Max amount (₹)">
            <Input inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Any" />
          </FilterField>
          <FilterField label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>{categoryMeta(item).emoji} {item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Payment method">
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Merchant">
            <Select value={merchantFilter} onValueChange={setMerchantFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All merchants</SelectItem>
                {merchants.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      )}

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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
