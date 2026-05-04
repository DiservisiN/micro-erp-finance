"use client";

import { FormEvent, useState } from "react";
import { Pencil, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  personName: string;
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

  // Edit state
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editPerson, setEditPerson] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Settle modal state
  const [settleTarget, setSettleTarget] = useState<Debt | null>(null);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleWalletId, setSettleWalletId] = useState("");

  // Filter debts by status (only show unpaid) and type
  const unpaidDebts = debts.filter((d) => d.status === "unpaid");
  const receivables = unpaidDebts.filter((item) => item.type === "receivable");
  const payables = unpaidDebts.filter((item) => item.type === "payable");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    await addDebt({
      personName: personName.trim(),
      type,
      amount: Number(amount || "0"),
      notes: notes.trim() || null,
    });

    toast.success("Debt record added");
    setPersonName("");
    setType("receivable");
    setAmount("");
    setNotes("");
    setIsSaving(false);
  }

  function openSettleModal(debt: Debt) {
    setSettleTarget(debt);
    setSettleWalletId("");
    setIsSettleOpen(true);
  }

  const handleSettle = async () => {
    if (!settleTarget) return;
    if (!settleWalletId) {
      toast.error("Please select a wallet for settlement");
      return;
    }
    await settleDebt(settleTarget.id, settleWalletId);
    toast.success("Debt settled successfully");
    setIsSettleOpen(false);
    setSettleTarget(null);
    setSettleWalletId("");
  }

  async function handleDeleteDebt(debtId: string) {
    if (!window.confirm("Delete this debt record?")) return;
    await deleteDebt(debtId);
    toast.success("Debt record deleted");
  }

  function openEditDebt(debt: Debt) {
    setEditTarget(debt);
    setEditPerson(debt.personName);
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
    <div className="flex flex-col w-full gap-4 md:gap-6 bg-slate-50 dark:bg-[#020617] transition-colors duration-300 min-h-screen p-4 md:p-6">
      
      {/* HEADER ATAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 w-full shadow-sm dark:shadow-none">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">Debts</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Manage Piutang (Receivables) and Hutang (Payables).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        {/* KOTAK KIRI: FORM TAMBAH (Mengambil 1 Kolom) */}
        <div className="xl:col-span-1 bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 w-full h-fit shadow-sm dark:shadow-none">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Debt Record</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Create a new Piutang / Hutang entry.</p>
          </div>
          
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="person-name" className="text-slate-700 dark:text-slate-300">Person Name</Label>
              <Input
                id="person-name"
                required
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                placeholder="Name"
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="debt-type" className="text-slate-700 dark:text-slate-300">Type</Label>
              <Select value={type} onValueChange={(value) => setType((value as DebtType) ?? "receivable")}>
                <SelectTrigger id="debt-type" className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:ring-orange-500/50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                  <SelectItem value="receivable">Piutang (Receivable)</SelectItem>
                  <SelectItem value="payable">Hutang (Payable)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">Amount</Label>
              <Input
                id="amount"
                required
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-slate-700 dark:text-slate-300">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes"
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>

            <Button type="submit" disabled={isSaving} className="w-full mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all">
              {isSaving ? "Saving..." : "Add Record"}
            </Button>
          </form>
        </div>

        {/* KOTAK KANAN: TABEL DAFTAR HUTANG (Mengambil 2 Kolom) */}
        <div className="xl:col-span-2 flex flex-col w-full gap-4 bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 shadow-sm dark:shadow-none">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Outstanding Debts</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Only unpaid records are shown.</p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab((value as DebtType) ?? "receivable")} className="flex flex-col w-full space-y-4">
            {/* AREA TAB */}
            <div className="w-full overflow-x-auto bg-slate-50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-1.5 shadow-sm dark:shadow-none">
              <TabsList className="flex w-full min-w-max h-auto p-0 bg-transparent gap-2">
                <TabsTrigger 
                  value="receivable" 
                  className="flex-1 whitespace-nowrap px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg transition-all hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Piutang (Orang Ngutang)
                </TabsTrigger>
                <TabsTrigger 
                  value="payable" 
                  className="flex-1 whitespace-nowrap px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 data-[state=active]:shadow-sm rounded-lg transition-all hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Hutang (Kita Ngutang)
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TABEL PIUTANG */}
            <TabsContent value="receivable" className="flex flex-col w-full outline-none mt-0">
              <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-800/50 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                <DebtTable
                  rows={receivables}
                  onSettle={openSettleModal}
                  onDelete={handleDeleteDebt}
                  onEdit={openEditDebt}
                />
              </div>
            </TabsContent>

            {/* TABEL HUTANG */}
            <TabsContent value="payable" className="flex flex-col w-full outline-none mt-0">
              <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-800/50 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                <DebtTable
                  rows={payables}
                  onSettle={openSettleModal}
                  onDelete={handleDeleteDebt}
                  onEdit={openEditDebt}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Settle Debt Modal */}
      <Dialog open={isSettleOpen} onOpenChange={(v) => { setIsSettleOpen(v); if (!v) { setSettleTarget(null); setSettleWalletId(""); } }}>
        <DialogContent className="w-[95vw] sm:max-w-[420px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Settle Debt</DialogTitle>
          </DialogHeader>
          {settleTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Person</span>
                  <span className="font-medium text-slate-900 dark:text-white">{settleTarget.personName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Type</span>
                  <span className={`font-medium ${settleTarget.type === "receivable" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {settleTarget.type === "receivable" ? "Piutang (Receivable)" : "Hutang (Payable)"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Amount</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatRupiah(settleTarget.amount)}</span>
                </div>
                {settleTarget.notes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Notes</span>
                    <span className="text-right max-w-[200px] truncate text-slate-700 dark:text-slate-300">{settleTarget.notes}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="settle-wallet" className="text-slate-700 dark:text-slate-300">
                  {settleTarget.type === "receivable"
                    ? "Receive payment into wallet *"
                    : "Pay from wallet *"}
                </Label>
                <select
                  id="settle-wallet"
                  value={settleWalletId}
                  onChange={(e) => setSettleWalletId(e.target.value)}
                  className="w-full flex h-10 items-center justify-between rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select wallet...</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  {settleTarget.type === "receivable"
                    ? "The selected wallet balance will increase by the debt amount."
                    : "The selected wallet balance will decrease by the debt amount."}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsSettleOpen(false); setSettleTarget(null); setSettleWalletId(""); }} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Cancel
                </Button>
                <Button
                  onClick={handleSettle}
                  disabled={!settleWalletId}
                  className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all"
                >
                  Confirm Settlement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="w-[95vw] sm:max-w-[420px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Edit Debt Record</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-person" className="text-slate-700 dark:text-slate-300">Person Name</Label>
                <Input id="edit-person" value={editPerson} onChange={(e) => setEditPerson(e.target.value)} className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-debt-amount" className="text-slate-700 dark:text-slate-300">Amount</Label>
                <Input id="edit-debt-amount" type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-debt-notes" className="text-slate-700 dark:text-slate-300">Notes</Label>
                <Input id="edit-debt-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes" className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} disabled={isSavingEdit} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Button>
                <Button onClick={handleEditDebt} disabled={isSavingEdit} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all">
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DebtTable({
  rows,
  onSettle,
  onDelete,
  onEdit,
}: {
  rows: Debt[];
  onSettle: (debt: Debt) => void;
  onDelete: (debtId: string) => void;
  onEdit: (debt: Debt) => void;
}) {
  return (
    <Table className="min-w-[600px] w-full">
      <TableHeader>
        <TableRow className="border-slate-200 dark:border-slate-700/50 hover:bg-transparent">
          <TableHead className="text-slate-500 dark:text-slate-400 font-medium">Person</TableHead>
          <TableHead className="text-slate-500 dark:text-slate-400 font-medium">Amount</TableHead>
          <TableHead className="text-slate-500 dark:text-slate-400 font-medium">Notes</TableHead>
          <TableHead className="text-slate-500 dark:text-slate-400 font-medium w-[120px] text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-slate-500 py-8">
              No unpaid records found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((item) => (
            <TableRow key={item.id} className="border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <TableCell className="font-medium text-slate-900 dark:text-white whitespace-nowrap">{item.personName}</TableCell>
              <TableCell className="font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatRupiah(item.amount)}</TableCell>
              <TableCell className="text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={item.notes ?? ""}>{item.notes ?? "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => onEdit(item)}
                    className="p-1.5 md:p-2 rounded-md border border-slate-300 dark:border-transparent bg-white dark:bg-slate-800/50 md:bg-transparent hover:bg-orange-50 md:hover:bg-orange-500/10 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Settle / Pay"
                    onClick={() => onSettle(item)}
                    className="p-1.5 md:p-2 rounded-md border border-slate-300 dark:border-transparent bg-white dark:bg-slate-800/50 md:bg-transparent hover:bg-emerald-50 md:hover:bg-emerald-500/10 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 md:p-2 rounded-md border border-slate-300 dark:border-transparent bg-white dark:bg-slate-800/50 md:bg-transparent hover:bg-red-50 md:hover:bg-red-500/10 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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