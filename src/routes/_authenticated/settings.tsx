import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Spend Manager" },
      { name: "description", content: "Manage your Spend Manager account, privacy and data." },
      { property: "og:title", content: "Settings · Spend Manager" },
      { property: "og:description", content: "Account, privacy and data controls." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const del = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function signOut() {
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function remove() {
    setBusy(true);
    try {
      await del();
      if (user) localStorage.removeItem(`spend-assistant:${user.id}`);
      queryClient.clear();
      await supabase.auth.signOut({ scope: "local" });
      toast.success("Your account and data were deleted.");
      navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Couldn't delete your account. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="surface p-5">
        <h2 className="font-semibold">Account</h2>
        <p className="mt-1 break-all text-sm text-muted-foreground">{user?.email}</p>
        <Button variant="outline" className="mt-4 h-11 w-full" onClick={signOut}>Sign out</Button>
      </section>
      <section className="surface p-5">
        <h2 className="font-semibold">Legal</h2>
        <div className="mt-3 flex flex-col gap-1 text-sm">
          <Link to="/privacy" className="py-2 underline-offset-4 hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="py-2 underline-offset-4 hover:underline">Terms of Service</Link>
        </div>
      </section>
      <section className="surface border border-destructive/30 p-5">
        <h2 className="font-semibold text-destructive">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently deletes your login, all expenses, budgets and profile. This can't be undone.
        </p>
        <AlertDialog onOpenChange={() => setConfirm("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4 h-11 w-full">Delete my account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                All your expenses and budgets will be erased right away. Type DELETE to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm">Type DELETE</Label>
              <Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <Button variant="destructive" disabled={confirm !== "DELETE" || busy} onClick={remove}>
                {busy ? "Deleting…" : "Delete forever"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
