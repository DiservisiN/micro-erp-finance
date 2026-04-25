"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WalletType = "business" | "personal";

type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  balance: number | string;
};

export default function SettingsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("business");
  const [balance, setBalance] = useState("");

  // Edit state
  const [editTarget, setEditTarget] = useState<Wallet | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<WalletType>("business");

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const loadWallets = useCallback(async () => {
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("wallets")
      .select("id, name, type, balance")
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setWallets((data ?? []) as Wallet[]);
    setErrorMessage(null);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  async function handleAddWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      toast.error("Supabase is not configured.");
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
      type,
      balance: Number(balance || "0"),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("wallets").insert(payload as any);

    if (error) {
      setErrorMessage(error.message);
      toast.error("Failed to add wallet", { description: error.message });
      setIsSaving(false);
      return;
    }

    setName("");
    setType("business");
    setBalance("");
    toast.success("Wallet added successfully");
    setIsSaving(false);
    await loadWallets();
  }

  function openEditWallet(wallet: Wallet) {
    setEditTarget(wallet);
    setEditName(wallet.name);
    setEditType(wallet.type);
    setIsEditOpen(true);
  }

  async function handleEditWallet() {
    if (!supabase || !editTarget) return;
    setIsSavingEdit(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb: any = supabase;
    const { error } = await sb.from("wallets").update({
      name: editName.trim(),
      type: editType,
    } as any).eq("id", editTarget.id);

    if (error) {
      toast.error("Failed to update wallet", { description: error.message });
      setIsSavingEdit(false);
      return;
    }

    toast.success("Wallet updated successfully");
    setIsSavingEdit(false);
    setIsEditOpen(false);
    setEditTarget(null);
    await loadWallets();
  }

  return (
    <>
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">Manage your business and personal wallets.</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Add New Wallet</CardTitle>
          <CardDescription>Create a wallet with name, type, and initial balance.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={handleAddWallet}>
            <div className="grid gap-2">
              <Label htmlFor="wallet-name">Name</Label>
              <Input
                id="wallet-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Main Cash"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wallet-type">Type</Label>
              <select
                id="wallet-type"
                value={type}
                onChange={(e) => setType(e.target.value as WalletType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="business">Business</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wallet-balance">Initial Balance</Label>
              <Input
                id="wallet-balance"
                required
                type="number"
                min="0"
                step="0.01"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Wallet"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet List</CardTitle>
          <CardDescription>All wallets currently stored in Supabase.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading wallets...
                  </TableCell>
                </TableRow>
              ) : wallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No wallets found.
                  </TableCell>
                </TableRow>
              ) : (
                wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>{wallet.name}</TableCell>
                    <TableCell className="capitalize">{wallet.type}</TableCell>
                    <TableCell>{formatRupiah(wallet.balance)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        title="Edit Wallet"
                        onClick={() => openEditWallet(wallet)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-orange-500 hover:bg-orange-500/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>

      {/* Edit Wallet Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Wallet</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-wallet-name">Name</Label>
                <Input id="edit-wallet-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-wallet-type">Type</Label>
                <select
                  id="edit-wallet-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as WalletType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} disabled={isSavingEdit}>Cancel</Button>
                <Button onClick={handleEditWallet} disabled={isSavingEdit} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
