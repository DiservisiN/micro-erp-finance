"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
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
  adminFee?: number | null;
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
        <TableRow className="border-slate-200 dark:border-slate-800/50">
          <TableHead className="text-slate-500 dark:text-slate-400">{reportsLabels.tableHeaders.date}</TableHead>
          <TableHead className="text-slate-500 dark:text-slate-400">{reportsLabels.tableHeaders.type}</TableHead>
          <TableHead className="text-slate-500 dark:text-slate-400">{reportsLabels.tableHeaders.amount}</TableHead>
          <TableHead className="text-slate-500 dark:text-slate-400">{reportsLabels.tableHeaders.adminFee}</TableHead>
          <TableHead className="text-slate-500 dark:text-slate-400">{reportsLabels.tableHeaders.notes}</TableHead>
          <TableHead className="text-right text-slate-500 dark:text-slate-400">{reportsLabels.tableHeaders.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400">
              {reportsLabels.messages.noTransactions}
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((tx) => (
            <TableRow key={tx.id} className="border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <TableCell className="whitespace-nowrap text-slate-700 dark:text-slate-300">{formatDate(tx.date)}</TableCell>
              <TableCell className="capitalize">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  tx.type === 'income' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                    : (tx.type === 'expense' || tx.type === 'asset_purchase')
                      ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
                      : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-700/50'
                }`}>
                  {formatType(tx.type, tx.category)}
                </span>
              </TableCell>
              <TableCell className={`font-mono font-semibold tabular-nums ${(tx.type === 'expense' || tx.type === 'asset_purchase') ? 'text-red-600 dark:text-red-400' : tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {(tx.type === 'expense' || tx.type === 'asset_purchase') ? '- ' : tx.type === 'income' ? '+ ' : ''}{formatRupiah(tx.amount)}
              </TableCell>
              <TableCell className="text-slate-700 dark:text-slate-300 font-mono tabular-nums">{tx.adminFee ? formatRupiah(tx.adminFee) : "-"}</TableCell>
              <TableCell className="max-w-[200px] truncate text-slate-700 dark:text-slate-300" title={tx.notes || ""}>
                {tx.notes || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onPrint(tx)} title={reportsLabels.buttons.printReceipt} className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700/50">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    title={reportsLabels.titles.editTransaction}
                    onClick={() => onEdit(tx)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 h-8 w-8 text-slate-400 transition-all duration-200 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/10"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title={reportsLabels.titles.deleteTransaction}
                    onClick={() => onDelete(tx)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 h-8 w-8 text-slate-400 transition-all duration-200 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10"
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

// DOKUMENTASI: Komponen untuk menghitung dan menampilkan Neraca Keuangan (Balance Sheet)
// Pastikan kamu sudah mengimpor useAppContext di bagian atas file jika belum ada:
// import { useAppContext } from "@/context/AppContext";

function BalanceSheetView() {
  const { mode } = useAppContext(); // <-- KUNCI RAHASIA: Ambil status mode saat ini
  const { wallets, products, investments, debts } = useFinanceContext();

  // 1. Hitung HARTA (Aktiva)
  // Kas & Piutang dihitung berdasarkan dompet yang sedang aktif (sudah difilter di FinanceContext)
  const totalKas = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const totalPiutang = debts.filter(d => d.type === 'receivable' && d.status === 'unpaid').reduce((sum, d) => sum + d.amount, 0);
  
  // LOGIKA PINTAR: Filter berdasarkan Mode
  // Inventory hanya dihitung di mode Bisnis
  const totalPersediaan = mode === "business" 
    ? products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0) 
    : 0;
    
  // Investasi hanya dihitung di mode Personal
  const totalInvestasi = mode === "personal"
    ? investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0)
    : 0;

  const totalAktiva = totalKas + totalPiutang + totalPersediaan + totalInvestasi;

  // 2. Hitung HUTANG (Kewajiban)
  const totalHutang = debts.filter(d => d.type === 'payable' && d.status === 'unpaid').reduce((sum, d) => sum + d.amount, 0);

  // 3. Hitung MODAL (Ekuitas) = Harta - Hutang
  const totalModal = totalAktiva - totalHutang;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
      {/* Kolom Kiri: HARTA (Aktiva) */}
      <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-5 md:p-6 w-full h-fit">
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800/50 pb-2">Harta (Aktiva)</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Kas & Bank (Wallets)</span>
            <span className="text-slate-800 dark:text-slate-200 font-mono">{formatRupiah(totalKas)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Piutang Pelanggan</span>
            <span className="text-slate-800 dark:text-slate-200 font-mono">{formatRupiah(totalPiutang)}</span>
          </div>
          
          {/* Sembunyikan baris Persediaan jika di mode Personal */}
          {mode === "business" && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Persediaan Barang (Inventory)</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">{formatRupiah(totalPersediaan)}</span>
            </div>
          )}

          {/* Sembunyikan baris Investasi jika di mode Bisnis */}
          {mode === "personal" && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Investasi Jangka Panjang</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">{formatRupiah(totalInvestasi)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800/50 mt-2">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Total Harta</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatRupiah(totalAktiva)}</span>
          </div>
        </div>
      </div>

      {/* Kolom Kanan: HUTANG & MODAL (Pasiva) */}
      <div className="flex flex-col gap-4 md:gap-6 w-full">
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-5 md:p-6 w-full h-fit">
          <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800/50 pb-2">Hutang (Kewajiban)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Hutang Usaha / Kasbon</span>
              <span className="text-red-600 dark:text-red-400 font-mono">{formatRupiah(totalHutang)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800/50 mt-2">
              <span className="font-semibold text-red-600 dark:text-red-400">Total Hutang</span>
              <span className="font-bold text-red-600 dark:text-red-400 font-mono">{formatRupiah(totalHutang)}</span>
            </div>
          </div>
        </div>

        <div className="bg-orange-50/50 dark:bg-slate-900/40 backdrop-blur-sm border border-orange-200 dark:border-orange-500/30 ring-1 ring-orange-100 dark:ring-orange-500/10 rounded-xl p-5 md:p-6 shadow-sm dark:shadow-[0_0_15px_rgba(249,115,22,0.05)] w-full h-fit">
          <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-orange-200 dark:border-slate-800/50 pb-2">Modal (Ekuitas)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Kekayaan Bersih (Net Worth)</span>
              <span className="text-orange-600 dark:text-orange-400 font-mono">{formatRupiah(totalModal)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-orange-200 dark:border-slate-800/50 mt-2">
              <span className="font-semibold text-orange-600 dark:text-orange-400">Total Pasiva (Hutang + Modal)</span>
              <span className="font-bold text-orange-600 dark:text-orange-400 font-mono">{formatRupiah(totalHutang + totalModal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
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

  const incomeTypes = ["income"];
  const expenseTypes = ["expense"];
  const transferTypes = ["transfer", "kasbon", "asset_purchase"];

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
    setEditAdminFee(String(tx.adminFee || 0));
    setEditNotes(tx.notes || "");
    setIsEditOpen(true);
  }

  async function handleEditSave() {
    if (!editTarget) return;
    await updateTransaction(editTarget.id, {
      amount: Number(editAmount),
      adminFee: Number(editAdminFee),
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
      (tx.adminFee || 0).toString(),
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
    <div className="bg-slate-50 dark:bg-[#020617] transition-colors duration-300 min-h-screen p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{reportsLabels.titles.financialReports}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{reportsLabels.titles.description}</p>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{reportsLabels.summaryCards.totalRevenue}</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{formatRupiah(totalIncome)}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{transactions.filter(tx => tx.type === 'income').length} transaksi</p>
          </div>
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{reportsLabels.summaryCards.totalExpenses}</p>
            <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 font-mono tracking-tight">{formatRupiah(totalExpense)}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{transactions.filter(tx => tx.type === 'expense').length} transaksi</p>
          </div>
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{reportsLabels.summaryCards.netProfit}</p>
            <p className={`text-2xl md:text-3xl font-bold font-mono tracking-tight ${netProfit >= 0 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>{netProfit >= 0 ? '' : '- '}{formatRupiah(Math.abs(netProfit))}</p>
          </div>
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{reportsLabels.summaryCards.profitMargin}</p>
            <p className={`text-2xl md:text-3xl font-bold font-mono tracking-tight ${Number(profitMargin) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{profitMargin}%</p>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
          {/* Unified Control Bar */}
          <div className="flex flex-col mb-6 bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 w-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full overflow-hidden">
              <div className="w-full lg:w-auto overflow-x-auto pb-1 custom-scrollbar">
                <TabsList className="flex flex-row w-max min-w-full bg-slate-100 dark:bg-slate-800/50 h-auto p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <TabsTrigger value="balance-sheet" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-slate-500 dark:text-slate-400 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-md px-4 py-2 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-200">Neraca Keuangan</TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-slate-500 dark:text-slate-400 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-md px-4 py-2 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-200">{reportsLabels.filters.all}</TabsTrigger>
                  <TabsTrigger value="income" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-slate-500 dark:text-slate-400 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-md px-4 py-2 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-200">{reportsLabels.filters.income}</TabsTrigger>
                  <TabsTrigger value="operating-expenses" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-slate-500 dark:text-slate-400 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-md px-4 py-2 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-200">{reportsLabels.filters.operatingExpenses}</TabsTrigger>
                  <TabsTrigger value="assets-transfers" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-slate-500 dark:text-slate-400 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all rounded-md px-4 py-2 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-200">{reportsLabels.filters.assetsTransfers}</TabsTrigger>
                </TabsList>
              </div>
              <Button onClick={handleExportCSV} variant="outline" className="w-full lg:w-auto border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-orange-600 dark:hover:text-orange-400 shadow-sm dark:shadow-[0_0_10px_rgba(249,115,22,0.1)] transition-all shrink-0 font-medium" disabled={sortedTransactions.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {reportsLabels.buttons.exportToCSV}
              </Button>
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{reportsLabels.titles.allTransactions}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">{reportsLabels.titles.allTransactionsDesc}</p>
              </div>
              <div className="overflow-x-auto">
                <TransactionTable 
                  transactions={filteredTransactions} 
                  formatDate={formatDate}
                  formatType={formatType}
                  onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
                  onEdit={openEdit}
                  onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="income" className="mt-0">
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{reportsLabels.titles.incomeTransactions}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">{reportsLabels.titles.incomeTransactionsDesc}</p>
              </div>
              <div className="overflow-x-auto">
                <TransactionTable 
                  transactions={filteredTransactions} 
                  formatDate={formatDate}
                  formatType={formatType}
                  onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
                  onEdit={openEdit}
                  onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="operating-expenses" className="mt-0">
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{reportsLabels.titles.operatingExpenses}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">{reportsLabels.titles.operatingExpensesDesc}</p>
              </div>
              <div className="overflow-x-auto">
                <TransactionTable 
                  transactions={filteredTransactions} 
                  formatDate={formatDate}
                  formatType={formatType}
                  onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
                  onEdit={openEdit}
                  onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assets-transfers" className="mt-0">
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{reportsLabels.titles.assetsTransfers}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">{reportsLabels.titles.assetsTransfersDesc}</p>
              </div>
              <div className="overflow-x-auto">
                <TransactionTable 
                  transactions={filteredTransactions} 
                  formatDate={formatDate}
                  formatType={formatType}
                  onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
                  onEdit={openEdit}
                  onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="balance-sheet" className="mt-0">
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 w-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Neraca Keuangan (Balance Sheet)</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Ringkasan posisi keuangan: Harta, Hutang, dan Modal Bersih.</p>
                </div>
              </div>
              <BalanceSheetView />
            </div>
          </TabsContent>
        </Tabs>

        {/* Receipt Preview Dialog */}
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl">
            <DialogHeader className="print:hidden">
              <DialogTitle className="text-slate-900 dark:text-white">{reportsLabels.titles.receiptPreview}</DialogTitle>
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
                  {(selectedReceipt.adminFee ?? 0) > 0 && (
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span>Admin Fee</span>
                      <span>{formatRupiah(selectedReceipt.adminFee!)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-black mt-2 pt-2 flex justify-between items-center font-bold">
                    <span>TOTAL</span>
                    <span>{formatRupiah(selectedReceipt.amount + (selectedReceipt.adminFee || 0))}</span>
                  </div>
                  <div className="text-center text-xs mt-6">
                    Thank you for your business!
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4 print:hidden">
              <Button variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setIsReceiptOpen(false)}>{reportsLabels.buttons.cancel}</Button>
              <Button onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                <Printer className="h-4 w-4 mr-2" />
                {reportsLabels.buttons.printReceipt}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------- Delete Confirmation Dialog ---------- */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{reportsLabels.titles.deleteTransaction}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Apakah Anda yakin? Ini akan <span className="font-semibold text-red-600 dark:text-red-400">menghapus permanen</span> catatan transaksi ini dan membalikkan saldo dompet.
            </p>
            {deleteTarget && (
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm space-y-1 mt-2">
                <p><span className="text-slate-500 dark:text-slate-400">Tipe:</span> <span className="font-medium">{formatType(deleteTarget.type, deleteTarget.category)}</span></p>
                <p><span className="text-slate-500 dark:text-slate-400">Jumlah:</span> <span className="font-medium font-mono">{formatRupiah(deleteTarget.amount)}</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-2 italic">"{deleteTarget.notes || "No notes"}"</p>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null); }} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                {reportsLabels.buttons.cancel}
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700 shadow-[0_4px_14px_rgba(239,68,68,0.3)] transition-all"
              >
                {reportsLabels.buttons.delete}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------- Edit Transaction Dialog ---------- */}
        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
          <DialogContent className="sm:max-w-[420px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{reportsLabels.titles.editTransaction}</DialogTitle>
            </DialogHeader>
            {editTarget && (
              <div className="space-y-4 pt-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount" className="text-slate-700 dark:text-slate-300">{reportsLabels.tableHeaders.amount}</Label>
                  <Input id="edit-amount" type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-admin-fee" className="text-slate-700 dark:text-slate-300">{reportsLabels.tableHeaders.adminFee}</Label>
                  <Input id="edit-admin-fee" type="number" min="0" step="0.01" value={editAdminFee} onChange={(e) => setEditAdminFee(e.target.value)} className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes" className="text-slate-700 dark:text-slate-300">{reportsLabels.tableHeaders.notes}</Label>
                  <Input id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Transaction notes" className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400" />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{reportsLabels.buttons.cancel}</Button>
                  <Button onClick={handleEditSave} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition-all">
                    {reportsLabels.buttons.saveChanges}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
      </div>
    </div>
  );
}