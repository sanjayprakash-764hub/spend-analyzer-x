import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;
type Row = { amount: number; category: string; merchant: string | null; date: string; payment_method: string; description: string | null };

const r2 = (n: number) => Math.round(n * 100) / 100;

async function fetchRows(db: DB, start: string, end: string, category?: string | null, merchant?: string | null) {
  let q = db
    .from("transactions")
    .select("amount, category, merchant, date, payment_method, description")
    .gte("date", start)
    .lte("date", end)
    .limit(5000);
  if (category) q = q.eq("category", category);
  if (merchant) q = q.ilike("merchant", `%${merchant.replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Row[];
}

function group(rows: Row[], key: (r: Row) => string) {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const k = key(row);
    const cur = map.get(k) ?? { total: 0, count: 0 };
    cur.total += row.amount;
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, total: r2(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export async function spendingSummary(db: DB, a: { start_date: string; end_date: string; category: string | null; merchant: string | null }) {
  const rows = await fetchRows(db, a.start_date, a.end_date, a.category, a.merchant);
  const total = r2(rows.reduce((s, r) => s + r.amount, 0));
  return {
    period: { start: a.start_date, end: a.end_date },
    filters: { category: a.category, merchant: a.merchant },
    total_inr: total,
    transaction_count: rows.length,
    average_per_transaction_inr: rows.length ? r2(total / rows.length) : 0,
    by_category: group(rows, (r) => r.category),
    by_payment_method: group(rows, (r) => r.payment_method),
    top_merchants: group(rows, (r) => r.merchant || "(no merchant)").slice(0, 5),
  };
}

export async function listExpenses(
  db: DB,
  a: { start_date: string; end_date: string; category: string | null; merchant: string | null; sort: "amount_desc" | "date_desc"; limit: number },
) {
  const rows = await fetchRows(db, a.start_date, a.end_date, a.category, a.merchant);
  rows.sort((x, y) => (a.sort === "amount_desc" ? y.amount - x.amount : y.date.localeCompare(x.date)));
  const limit = Math.min(Math.max(Math.round(a.limit) || 5, 1), 20);
  return { total_matching: rows.length, expenses: rows.slice(0, limit) };
}

export async function comparePeriods(
  db: DB,
  a: { first_start: string; first_end: string; second_start: string; second_end: string },
) {
  const [first, second] = await Promise.all([
    fetchRows(db, a.first_start, a.first_end),
    fetchRows(db, a.second_start, a.second_end),
  ]);
  const t1 = r2(first.reduce((s, r) => s + r.amount, 0));
  const t2 = r2(second.reduce((s, r) => s + r.amount, 0));
  const c1 = new Map(group(first, (r) => r.category).map((g) => [g.name, g.total]));
  const c2 = new Map(group(second, (r) => r.category).map((g) => [g.name, g.total]));
  const cats = [...new Set([...c1.keys(), ...c2.keys()])];
  return {
    first_period: { start: a.first_start, end: a.first_end, total_inr: t1, count: first.length },
    second_period: { start: a.second_start, end: a.second_end, total_inr: t2, count: second.length },
    difference_inr: r2(t1 - t2),
    percent_change_vs_second: t2 ? r2(((t1 - t2) / t2) * 100) : null,
    by_category: cats
      .map((name) => {
        const x = c1.get(name) ?? 0;
        const y = c2.get(name) ?? 0;
        return { category: name, first_inr: x, second_inr: y, difference_inr: r2(x - y) };
      })
      .sort((p, q) => Math.abs(q.difference_inr) - Math.abs(p.difference_inr)),
  };
}

export async function budgetStatus(db: DB, a: { year: number; month: number }) {
  const { data, error } = await db.from("budgets").select("category, amount").eq("year", a.year).eq("month", a.month);
  if (error) throw new Error(error.message);
  const start = `${a.year}-${String(a.month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(a.year, a.month, 0));
  const end = endDate.toISOString().slice(0, 10);
  const rows = await fetchRows(db, start, end);
  const byCat = new Map(group(rows, (r) => r.category).map((g) => [g.name, g.total]));
  const totalSpent = r2(rows.reduce((s, r) => s + r.amount, 0));
  const budgets = (data ?? []).map((b) => {
    const limit = Number(b.amount);
    const spent = b.category === "Overall" ? totalSpent : byCat.get(b.category) ?? 0;
    return {
      category: b.category,
      limit_inr: limit,
      spent_inr: spent,
      remaining_inr: r2(limit - spent),
      percent_used: limit ? r2((spent / limit) * 100) : null,
      over_budget: spent > limit,
    };
  });
  return { month: a.month, year: a.year, total_spent_inr: totalSpent, budgets, has_budget: budgets.length > 0 };
}
