"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/utils";
import { reportsLabels } from "@/config/reports-labels";
import { useFinanceContext } from "@/context/FinanceContext";

type Transaction = {
  id: string;
  type: string;
  category?: string;
  amount: number;
  admin_fee?: number | null;
  date: string;
  notes?: string | null;
  product_id?: string | null;
  from_wallet_id?: string | null;
  to_wallet_id?: string | null;
  debt_id?: string | null;
};

function TransactionTable({ 
  transactions, 
  formatDate, 
  formatType,
  onPrint,
  onEdit,
  onDelete 
}: { 
  transactions: Transaction[]; 
  formatDate: (date: string) => string; 
  formatType: (type: string, category?: string) => string;
  onPrint: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-800/50">
          <TableHead className="text-slate-300">{reportsLabels.tableHeaders.date}</TableHead>
          <TableHead className="text-slate-300">{reportsLabels.tableHeaders.type}</TableHead>
          <TableHead className="text-slate-300">{reportsLabels.tableHeaders.amount}</TableHead>
          <TableHead className="text-slate-300">{reportsLabels.tableHeaders.adminFee}</TableHead>
          <TableHead className="text-slate-300">{reportsLabels.tableHeaders.notes}</TableHead>
          <TableHead className="text-right text-slate-300">{reportsLabels.tableHeaders.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-500">
              {reportsLabels.messages.noTransactions}
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((tx) => (
            <TableRow key={tx.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-colors">
              <TableCell className="whitespace-nowrap text-slate-300">{formatDate(tx.date)}</TableCell>
              <TableCell className="capitalize">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  tx.type === 'income' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : tx.type === 'expense'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-slate-700/30 text-slate-300 border-slate-700/50'
                }`}>
                  {formatType(tx.type, tx.category)}
                </span>
              </TableCell>
              <TableCell className={`font-mono font-semibold ${tx.type === 'expense' ? 'text-red-400' : tx.type === 'income' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {tx.type === 'expense' ? '- ' : tx.type === 'income' ? '+ ' : ''}{formatRupiah(tx.amount)}
              </TableCell>
              <TableCell className="text-slate-300">{tx.admin_fee ? formatRupiah(tx.admin_fee) : "-"}</TableCell>
              <TableCell className="max-w-xs truncate text-slate-300" title={tx.notes || ""}>
                {tx.notes || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onPrint(tx)} title={reportsLabels.buttons.printReceipt} className="text-slate-400 hover:text-white hover:bg-slate-700/50">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    title={reportsLabels.titles.editTransaction}
                    onClick={() => onEdit(tx)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 transition-all duration-200 hover:text-orange-400 hover:bg-orange-500/10"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title={reportsLabels.titles.deleteTransaction}
                    onClick={() => onDelete(tx)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 transition-all duration-200 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
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

export default function ReportsPage() {
  // Wire up to global context instead of Supabase
  const { transactions, deleteTransaction, updateTransaction } = useFinanceContext();

  const [activeTab, setActiveTab] = useState("all");

  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editAdminFee, setEditAdminFee] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // ─── Dynamic Summary Metrics ───────────────────────────────────────────
  const totalIncome = useMemo(() =>
    transactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const totalExpense = useMemo(() =>
    transactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : "0.0";

  // ─── Filter Types ──────────────────────────────────────────────────────
  const incomeTypes = ["income"];
  const expenseTypes = ["expense"];
  const transferTypes = ["transfer", "kasbon"];

  // Sort newest-first by date for display
  const sortedTransactions = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") return sortedTransactions;
    if (activeTab === "income") return sortedTransactions.filter((tx) => incomeTypes.includes(tx.type));
    if (activeTab === "operating-expenses") return sortedTransactions.filter((tx) => expenseTypes.includes(tx.type));
    if (activeTab === "assets-transfers") return sortedTransactions.filter((tx) => transferTypes.includes(tx.type));
    return sortedTransactions;
  }, [sortedTransactions, activeTab]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteTransaction(deleteTarget.id);
    toast.success(reportsLabels.messages.deleteSuccess);
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  }

  function openEdit(tx: Transaction) {
    setEditTarget(tx);
    setEditAmount(String(tx.amount));
    setEditAdminFee(String(tx.admin_fee || 0));
    setEditNotes(tx.notes || "");
    setIsEditOpen(true);
  }

  async function handleEditSave() {
    if (!editTarget) return;
    await updateTransaction(editTarget.id, {
      amount: Number(editAmount),
      admin_fee: Number(editAdminFee),
      notes: editNotes.trim(),
    });
    toast.success(reportsLabels.messages.updateSuccess);
    setIsEditOpen(false);
    setEditTarget(null);
  }

  function formatDate(dateString: string) {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateString;
    }
  }

  function formatType(type: string, category?: string) {
    // Show category if available (more descriptive), else humanize the type
    if (category) return category;
    if (!type) return "-";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function handleExportCSV() {
    if (sortedTransactions.length === 0) return;

    const headers = ["Tanggal", "Tipe", "Kategori", "Jumlah", "Biaya Admin", "Catatan"];
    const rows = sortedTransactions.map((tx) => [
      formatDate(tx.date).replace(/,/g, ""),
      tx.type,
      tx.category || "-",
      tx.amount.toString(),
      (tx.admin_fee || 0).toString(),
      `"${(tx.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Laporan_Keuangan_MicroERP.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(reportsLabels.messages.exportSuccess);
  }

  return (
    <div className="bg-[#020617] min-h-screen p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">{reportsLabels.titles.financialReports}</h2>
        <p className="text-slate-400 text-sm">{reportsLabels.titles.description}</p>
      </div>

      {/* Financial Summary Cards — Driven by context data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.totalRevenue}</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono">{formatRupiah(totalIncome)}</p>
          <p className="text-xs text-slate-500 mt-1">{transactions.filter(tx => tx.type === 'income').length} transaksi</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.totalExpenses}</p>
          <p className="text-3xl font-bold text-red-400 font-mono">{formatRupiah(totalExpense)}</p>
          <p className="text-xs text-slate-500 mt-1">{transactions.filter(tx => tx.type === 'expense').length} transaksi</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.netProfit}</p>
          <p className={`text-3xl font-bold font-mono ${netProfit >= 0 ? 'text-orange-400' : 'text-red-400'}`}>{netProfit >= 0 ? '' : '- '}{formatRupiah(Math.abs(netProfit))}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.profitMargin}</p>
          <p className={`text-3xl font-bold font-mono ${Number(profitMargin) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{profitMargin}%</p>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
        {/* Unified Control Bar */}
        <div className="flex flex-col gap-4 mb-6 bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <TabsList className="flex flex-wrap gap-2 bg-slate-800/50 h-auto p-1 w-full">
              <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-full px-4 py-2">{reportsLabels.filters.all}</TabsTrigger>
              <TabsTrigger value="income" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-full px-4 py-2">{reportsLabels.filters.income}</TabsTrigger>
              <TabsTrigger value="operating-expenses" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-full px-4 py-2">{reportsLabels.filters.operatingExpenses}</TabsTrigger>
              <TabsTrigger value="assets-transfers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-full px-4 py-2">{reportsLabels.filters.assetsTransfers}</TabsTrigger>
            </TabsList>
            <Button onClick={handleExportCSV} variant="outline" size="default" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)] transition-all shrink-0" disabled={sortedTransactions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {reportsLabels.buttons.exportToCSV}
            </Button>
          </div>
        </div>

        <TabsContent value="all">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{reportsLabels.titles.allTransactions}</h3>
              <p className="text-slate-400 text-sm">{reportsLabels.titles.allTransactionsDesc}</p>
            </div>
            <TransactionTable 
              transactions={filteredTransactions} 
              formatDate={formatDate}
              formatType={formatType}
              onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
              onEdit={openEdit}
              onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
            />
          </div>
        </TabsContent>

        <TabsContent value="income">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{reportsLabels.titles.incomeTransactions}</h3>
              <p className="text-slate-400 text-sm">{reportsLabels.titles.incomeTransactionsDesc}</p>
            </div>
            <TransactionTable 
              transactions={filteredTransactions} 
              formatDate={formatDate}
              formatType={formatType}
              onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
              onEdit={openEdit}
              onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
            />
          </div>
        </TabsContent>

        <TabsContent value="operating-expenses">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{reportsLabels.titles.operatingExpenses}</h3>
              <p className="text-slate-400 text-sm">{reportsLabels.titles.operatingExpensesDesc}</p>
            </div>
            <TransactionTable 
              transactions={filteredTransactions} 
              formatDate={formatDate}
              formatType={formatType}
              onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
              onEdit={openEdit}
              onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
            />
          </div>
        </TabsContent>

        <TabsContent value="assets-transfers">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{reportsLabels.titles.assetsTransfers}</h3>
              <p className="text-slate-400 text-sm">{reportsLabels.titles.assetsTransfersDesc}</p>
            </div>
            <TransactionTable 
              transactions={filteredTransactions} 
              formatDate={formatDate}
              formatType={formatType}
              onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
              onEdit={openEdit}
              onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Receipt Preview Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-white">{reportsLabels.titles.receiptPreview}</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="flex flex-col items-center justify-center py-4 print:py-0">
              <div 
                id="receipt-print-area" 
                className="w-[300px] bg-white text-black p-6 font-mono text-sm leading-tight border border-dashed border-gray-300 print:border-none print:w-full print:max-w-none print:p-0"
              >
                <div className="text-center font-bold text-lg mb-2">MicroERP Store</div>
                <div className="text-center text-xs mb-4">Jl. Teknologi No. 1, Jakarta<br/>Telp: 0812-3456-7890</div>
                <div className="border-b border-dashed border-black mb-2 pb-2">
                  <div>Date: {formatDate(selectedReceipt.date)}</div>
                  <div>Trx ID: {selectedReceipt.id.slice(0, 8).toUpperCase()}</div>
                </div>
                <div className="mb-4">
                  <div className="font-semibold">{formatType(selectedReceipt.type, selectedReceipt.category)}</div>
                  <div className="text-xs break-words">{selectedReceipt.notes || "-"}</div>
                </div>
                <div className="border-t border-dashed border-black mt-2 pt-2 flex justify-between items-center">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedReceipt.amount)}</span>
                </div>
                {(selectedReceipt.admin_fee ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span>Admin Fee</span>
                    <span>{formatRupiah(selectedReceipt.admin_fee!)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-black mt-2 pt-2 flex justify-between items-center font-bold">
                  <span>TOTAL</span>
                  <span>{formatRupiah(selectedReceipt.amount + (selectedReceipt.admin_fee || 0))}</span>
                </div>
                <div className="text-center text-xs mt-6">
                  Thank you for your business!
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4 print:hidden">
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>{reportsLabels.buttons.cancel}</Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              {reportsLabels.buttons.printReceipt}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Delete Confirmation Dialog ---------- */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{reportsLabels.titles.deleteTransaction}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            Apakah Anda yakin? Ini akan <span className="font-semibold text-red-400">menghapus permanen</span> catatan transaksi ini dan membalikkan saldo dompet.
          </p>
          {deleteTarget && (
            <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3 text-sm space-y-1">
              <p><span className="text-slate-400">Tipe:</span> {formatType(deleteTarget.type, deleteTarget.category)}</p>
              <p><span className="text-slate-400">Jumlah:</span> {formatRupiah(deleteTarget.amount)}</p>
              <p className="text-xs text-slate-400 truncate">{deleteTarget.notes || "No notes"}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null); }} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              {reportsLabels.buttons.cancel}
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all"
            >
              {reportsLabels.buttons.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Edit Transaction Dialog ---------- */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{reportsLabels.titles.editTransaction}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-amount" className="text-slate-300">{reportsLabels.tableHeaders.amount}</Label>
                <Input id="edit-amount" type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-slate-800/50 border-slate-700 text-white" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-admin-fee" className="text-slate-300">{reportsLabels.tableHeaders.adminFee}</Label>
                <Input id="edit-admin-fee" type="number" min="0" step="0.01" value={editAdminFee} onChange={(e) => setEditAdminFee(e.target.value)} className="bg-slate-800/50 border-slate-700 text-white" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes" className="text-slate-300">{reportsLabels.tableHeaders.notes}</Label>
                <Input id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Transaction notes" className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} className="border-slate-700 text-slate-300 hover:bg-slate-800">{reportsLabels.buttons.cancel}</Button>
                <Button onClick={handleEditSave} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
                  {reportsLabels.buttons.saveChanges}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
