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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type DebtType = "receivable" | "payable";

type Debt = {
  id: string;
  person_name: string;
  type: DebtType;
  amount: number | string;
  notes: string | null;
  status: "unpaid" | "paid";
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DebtType>("receivable");

  const [personName, setPersonName] = useState("");
  const [type, setType] = useState<DebtType>("receivable");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const loadDebts = useCallback(async () => {
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("debts")
      .select("id, person_name, type, amount, notes, status")
      .eq("status", "unpaid");

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setDebts((data ?? []) as Debt[]);
    setErrorMessage(null);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      toast.error("Supabase is not configured.");
      return;
    }

    setIsSaving(true);
    const payload = {
      person_name: personName.trim(),
      type,
      amount: Number(amount || "0"),
      notes: notes.trim() || null,
      status: "unpaid",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb: any = supabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.from("debts").insert(payload as any);
    if (error) {
      setErrorMessage(error.message);
      toast.error("Failed to add debt", { description: error.message });
      setIsSaving(false);
      return;
    }

    toast.success("Debt record added");
    setPersonName("");
    setType("receivable");
    setAmount("");
    setNotes("");
    setIsSaving(false);
    await loadDebts();
  }

  async function markAsPaid(debtId: string) {
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb: any = supabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.from("debts").update({ status: "paid" } as any).eq("id", debtId);
    if (error) {
      toast.error("Failed to update debt status", { description: error.message });
      return;
    }

    toast.success("Marked as paid");
    await loadDebts();
  }

  const receivables = debts.filter((item) => item.type === "receivable");
  const payables = debts.filter((item) => item.type === "payable");

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Debts</h2>
        <p className="text-muted-foreground">Manage Piutang (Receivables) and Hutang (Payables).</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Add Debt Record</CardTitle>
          <CardDescription>Create a new Piutang / Hutang entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="person-name">Person Name</Label>
              <Input
                id="person-name"
                required
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                placeholder="Name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="debt-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType((value as DebtType) ?? "receivable")}>
                <SelectTrigger id="debt-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receivable">Piutang (Receivable)</SelectItem>
                  <SelectItem value="payable">Hutang (Payable)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                required
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className="md:col-span-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Debts</CardTitle>
          <CardDescription>Only unpaid records are shown.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab((value as DebtType) ?? "receivable")}>
            <TabsList>
              <TabsTrigger value="receivable">Piutang</TabsTrigger>
              <TabsTrigger value="payable">Hutang</TabsTrigger>
            </TabsList>

            <TabsContent value="receivable" className="pt-4">
              <DebtTable rows={receivables} isLoading={isLoading} onMarkAsPaid={markAsPaid} />
            </TabsContent>

            <TabsContent value="payable" className="pt-4">
              <DebtTable rows={payables} isLoading={isLoading} onMarkAsPaid={markAsPaid} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}

function DebtTable({
  rows,
  isLoading,
  onMarkAsPaid,
}: {
  rows: Debt[];
  isLoading: boolean;
  onMarkAsPaid: (debtId: string) => Promise<void>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Person</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="w-[120px]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              Loading records...
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No unpaid records.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.person_name}</TableCell>
              <TableCell>{formatRupiah(item.amount)}</TableCell>
              <TableCell>{item.notes ?? "-"}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => onMarkAsPaid(item.id)}>
                  Mark as Paid
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}


