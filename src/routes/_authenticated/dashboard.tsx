import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import {
  MONTH_NAMES,
  categoryMeta,
  money,
  monthRange,
  prettyDate,
  type Transaction,
} from "@/lib/expenses";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Spend Manager" },
      { name: "description", content: "Your monthly spending, category split, budget progress and recent expenses." },
      { property: "og:title", content: "Dashboard · Spend Manager" },
      { property: "og:description", content: "Monthly spending, category split and budget progress at a glance." },
    ],
  }),
  component: Dashboard;
});

function Dashboard() {
  return null;
}
