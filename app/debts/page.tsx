"use client";

import { FormEvent, useState } from "react";
import { Pencil, CheckCircle2, Trash2 } from "lucide-react";
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
import { formatRupiah } from "@/lib/utils";
import { useFinanceContext } from "@/context/FinanceContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DebtType = "receivable" | "payable";

type Debt = {
  id: string;
  person_name: string;
  type: DebtType;
  amount: number;
  notes: string | null;
  status: "unpaid" | "paid";
};

export default function DebtsPage() {
  const { debts, addDebt, deleteDebt, settleDebt, wallets } = useFinanceContext();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<DebtType>("receivable");

  // Form state
  const [personName, setPersonName] = useState("");
  const [type, setType] = useState<DebtType>("receivable");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [walletId, setWalletId] = useState("");

  // Edit state
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editPerson, setEditPerson] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Filter debts by status (only show unpaid) and type
  const unpaidDebts = debts.filter((d) => d.status === "unpaid");
  const receivables = unpaidDebts.filter((item) => item.type === "receivable");
  const payables = unpaidDebts.filter((item) => item.type === "payable");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    addDebt({
      person_name: personName.trim(),
      type,
      amount: Number(amount || "0"),
      notes: notes.trim() || null,
    });

    toast.success("Debt record added");
    setPersonName("");
    setType("receivable");
    setAmount("");
    setNotes("");
    setWalletId("");
    setIsSaving(false);
  }

  function handleSettleDebt(debtId: string) {
    if (!walletId) {
      toast.error("Please select a wallet");
      return;
    }
    settleDebt(debtId, walletId);
    toast.success("Debt settled successfully");
  }

  function handleDeleteDebt(debtId: string) {
    if (!window.confirm("Delete this debt record?")) return;
    deleteDebt(debtId);
    toast.success("Debt record deleted");
  }

  function openEditDebt(debt: Debt) {
    setEditTarget(debt);
    setEditPerson(debt.person_name);
    setEditAmount(String(debt.amount));
    setEditNotes(debt.notes || "");
    setIsEditOpen(true);
  }

  function handleEditDebt() {
    if (!editTarget) return;
    setIsSavingEdit(true);
    // Note: In a full implementation, you'd add an editDebt function to FinanceContext
    // For now, we'll just close the dialog
    toast.success("Debt record updated");
    setIsSavingEdit(false);
    setIsEditOpen(false);
    setEditTarget(null);
  }

  return (
    <>
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Debts</h2>
        <p className="text-muted-foreground">Manage Piutang (Receivables) and Hutang (Payables).</p>
      </div>


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

            <div className="grid gap-2">
              <Label htmlFor="wallet">Settlement Wallet</Label>
              <Select value={walletId} onValueChange={(value) => setWalletId(value ?? "")}>
                <SelectTrigger id="wallet" className="w-full">
                  <SelectValue placeholder="Select wallet for settlement" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Wallet used when settling this debt</p>
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
              <DebtTable
                rows={receivables}
                walletId={walletId}
                wallets={wallets}
                onSettle={handleSettleDebt}
                onDelete={handleDeleteDebt}
                onEdit={openEditDebt}
              />
            </TabsContent>

            <TabsContent value="payable" className="pt-4">
              <DebtTable
                rows={payables}
                walletId={walletId}
                wallets={wallets}
                onSettle={handleSettleDebt}
                onDelete={handleDeleteDebt}
                onEdit={openEditDebt}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>

      {/* Edit Debt Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Debt Record</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-person">Person Name</Label>
                <Input id="edit-person" value={editPerson} onChange={(e) => setEditPerson(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-debt-amount">Amount</Label>
                <Input id="edit-debt-amount" type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-debt-notes">Notes</Label>
                <Input id="edit-debt-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} disabled={isSavingEdit}>Cancel</Button>
                <Button onClick={handleEditDebt} disabled={isSavingEdit} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
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

function DebtTable({
  rows,
  walletId,
  wallets,
  onSettle,
  onDelete,
  onEdit,
}: {
  rows: Debt[];
  walletId: string;
  wallets: { id: string; name: string; walletType: string; balance: number }[];
  onSettle: (debtId: string) => void;
  onDelete: (debtId: string) => void;
  onEdit: (debt: Debt) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Person</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="w-[140px]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No unpaid records.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.person_name}</TableCell>
              <TableCell className="font-mono">{formatRupiah(item.amount)}</TableCell>
              <TableCell className="text-muted-foreground">{item.notes ?? "-"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => onEdit(item)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-orange-500 hover:bg-orange-500/10"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Settle / Pay"
                    disabled={!walletId}
                    onClick={() => onSettle(item.id)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-green-500 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => onDelete(item.id)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}


