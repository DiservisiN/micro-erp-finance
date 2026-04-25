"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type InvestmentType = "gold" | "bibit";

type Investment = {
  id: string;
  name: string;
  type: InvestmentType;
  quantity: number | string;
  average_buy_price: number | string;
  current_price: number | string;
};

type Wallet = {
  id: string;
  type: "business" | "personal";
  balance: number | string;
};

const DEFAULT_GOLD_PRICE = 1_300_000;

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<InvestmentType>("gold");
  const [quantity, setQuantity] = useState("");
  const [averageBuyPrice, setAverageBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [currentGoldPrice, setCurrentGoldPrice] = useState(String(DEFAULT_GOLD_PRICE));

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb: any = supabase;
    const [investmentsResult, walletsResult] = await Promise.all([
      sb
        .from("investments")
        .select("id, name, type, quantity, average_buy_price, current_price")
        .order("name", { ascending: true }),
      sb.from("wallets").select("id, type, balance"),
    ]);

    if (investmentsResult.error || walletsResult.error) {
      setErrorMessage(
        investmentsResult.error?.message ?? walletsResult.error?.message ?? "Failed to load investments data.",
      );
      setIsLoading(false);
      return;
    }

    setInvestments((investmentsResult.data ?? []) as Investment[]);
    setWallets((walletsResult.data ?? []) as Wallet[]);
    setErrorMessage(null);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      toast.error("Supabase is not configured.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: name.trim(),
      type,
      quantity: Number(quantity || "0"),
      average_buy_price: Number(averageBuyPrice || "0"),
      current_price: Number(currentPrice || "0"),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("investments").insert(payload as any);
    if (error) {
      setErrorMessage(error.message);
      toast.error("Failed to add investment", { description: error.message });
      setIsSaving(false);
      return;
    }

    toast.success("Investment added");
    setName("");
    setType("gold");
    setQuantity("");
    setAverageBuyPrice("");
    setCurrentPrice("");
    setIsSaving(false);
    await loadData();
  }

  const totalLiquidCash = wallets
    .filter((wallet) => wallet.type === "business" || wallet.type === "personal")
    .reduce((sum, wallet) => sum + safeNumber(wallet.balance), 0);

  const totalGoldValue = investments
    .filter((item) => item.type === "gold")
    .reduce((sum, item) => sum + safeNumber(item.quantity) * safeNumber(item.current_price), 0);

  const totalWealth = totalLiquidCash + totalGoldValue;
  const nishab = 85 * safeNumber(currentGoldPrice);
  const hasReachedNishab = totalWealth >= nishab;
  const estimatedZakat = hasReachedNishab ? totalWealth * 0.025 : 0;

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Investments</h2>
        <p className="text-muted-foreground">Track investment performance and calculate Zakat Mal eligibility.</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card className="border-primary/40 ring-2 ring-primary/20">
        <CardHeader>
          <CardTitle>Zakat Mal Calculator</CardTitle>
          <CardDescription>
            Formula: Nishab = 85 x Current Gold Price. Zakat due is 2.5% when wealth reaches Nishab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="current-gold-price">Current Gold Price per Gram</Label>
              <Input
                id="current-gold-price"
                type="number"
                min="0"
                step="1"
                value={currentGoldPrice}
                onChange={(event) => setCurrentGoldPrice(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <p className="text-sm">Total Liquid Cash: <span className="font-semibold">{formatRupiah(totalLiquidCash)}</span></p>
            <p className="text-sm">Total Gold Value: <span className="font-semibold">{formatRupiah(totalGoldValue)}</span></p>
            <p className="text-sm">Total Wealth: <span className="font-semibold">{formatRupiah(totalWealth)}</span></p>
            <p className="text-sm">Nishab Boundary: <span className="font-semibold">{formatRupiah(nishab)}</span></p>
          </div>

          {hasReachedNishab ? (
            <Alert className="border-destructive bg-destructive/10 text-destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Nishab Reached</AlertTitle>
              <AlertDescription>
                Your wealth has reached Nishab. Estimated Zakat Mal (2.5%):{" "}
                <span className="font-semibold">{formatRupiah(estimatedZakat)}</span>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>Below Nishab</AlertTitle>
              <AlertDescription>Your current tracked wealth has not reached Nishab yet.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Investment</CardTitle>
          <CardDescription>Insert a new investment entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="investment-name">Name</Label>
              <Input
                id="investment-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Antam Gold"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="investment-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType((value as InvestmentType) ?? "gold")}>
                <SelectTrigger id="investment-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="bibit">Bibit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                required
                type="number"
                min="0"
                step="0.0001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avg-buy-price">Average Buy Price</Label>
              <Input
                id="avg-buy-price"
                required
                type="number"
                min="0"
                step="0.01"
                value={averageBuyPrice}
                onChange={(event) => setAverageBuyPrice(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current-price">Current Price</Label>
              <Input
                id="current-price"
                required
                type="number"
                min="0"
                step="0.01"
                value={currentPrice}
                onChange={(event) => setCurrentPrice(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-5">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Investment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Investments</CardTitle>
          <CardDescription>Monitor total value and gain/loss for each item.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Average Buy Price</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Total Gain/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading investments...
                  </TableCell>
                </TableRow>
              ) : investments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No investments found.
                  </TableCell>
                </TableRow>
              ) : (
                investments.map((item) => {
                  const qty = safeNumber(item.quantity);
                  const buy = safeNumber(item.average_buy_price);
                  const current = safeNumber(item.current_price);
                  const totalValue = qty * current;
                  const totalCost = qty * buy;
                  const gainLoss = totalValue - totalCost;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="capitalize">{item.type}</TableCell>
                      <TableCell>{qty}</TableCell>
                      <TableCell>{formatRupiah(buy)}</TableCell>
                      <TableCell>{formatRupiah(current)}</TableCell>
                      <TableCell>{formatRupiah(totalValue)}</TableCell>
                      <TableCell className={gainLoss >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {formatRupiah(gainLoss)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function safeNumber(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}


