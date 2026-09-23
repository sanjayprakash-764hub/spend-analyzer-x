import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  CATEGORY_META,
  PAYMENT_METHODS,
  guessCategory,
  iso,
  type Transaction,
} from "@/lib/expenses";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Transaction | null;
};

export function ExpenseDialog({ open, onOpenChange, editing }: Props) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [autoPicked, setAutoPicked] = useState(false);
  const [date, setDate] = useState(iso(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(editing ? String(editing.amount) : "");
    setMerchant(editing?.merchant ?? "");
    setCategory(editing?.category ?? "Other");
    setDate(editing?.date ?? iso(new Date()));
    setPaymentMethod(editing?.payment_method ?? "UPI");
    setNotes(editing?.description ?? "");
    setAutoPicked(false);
  }, [open, editing]);

  // Rule-based auto-categorization from the merchant / note text.
  useEffect(() => {
    if (editing) return;
    const guess = guessCategory(`${merchant} ${notes}`);
    if (guess.matched) {
      setCategory(guess.category);
      setAutoPicked(true);
    } else {
      setAutoPicked(false);
    }
  }, [merchant, notes, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount greater than 0");
      const payload = {
        amount: value,
        category,
        merchant: merchant.trim().slice(0, 120) || null,
        date,
        payment_method: paymentMethod,
        description: notes.trim().slice(0, 500) || null,
      };
      if (editing) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", editing.id);
        if (error) throw error;
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You need to sign in again");
      const { error } = await supabase.from("transactions").insert({ ...payload, user_id: auth.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(editing ? "Expense updated" : "Expense added");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>Amounts are in rupees. The category is guessed from the merchant.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Swiggy, Uber, Amazon…"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setAutoPicked(false);
              }}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {CATEGORY_META[item].emoji} {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {autoPicked && (
              <p className="flex items-center gap-1.5 text-xs text-primary">
                <Sparkles className="size-3" /> Picked automatically — change it if it's wrong.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment">Paid by</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dinner with friends"
              maxLength={500}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
