"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  return (
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
              <Select value={type} onValueChange={(value) => setType((value as WalletType) ?? "business")}>
                <SelectTrigger id="wallet-type" className="w-full">
                  <SelectValue placeholder="Select wallet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Loading wallets...
                  </TableCell>
                </TableRow>
              ) : wallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No wallets found.
                  </TableCell>
                </TableRow>
              ) : (
                wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>{wallet.name}</TableCell>
                    <TableCell className="capitalize">{wallet.type}</TableCell>
                    <TableCell>{formatRupiah(wallet.balance)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
