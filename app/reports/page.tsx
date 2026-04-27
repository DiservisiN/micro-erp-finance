"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { reportsLabels } from "@/config/reports-labels";

type Transaction = {
  id: string;
  date: string;
  created_at: string;
  type: string;
  amount: number;
  admin_fee: number;
  notes: string;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  product_id: string | null;
};

function TransactionTable({ 
  transactions, 
  isLoading, 
  formatDate, 
  formatType,
  onPrint,
  onEdit,
  onDelete 
}: { 
  transactions: Transaction[]; 
  isLoading: boolean; 
  formatDate: (date: string) => string; 
  formatType: (type: string) => string;
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
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-500">
              {reportsLabels.messages.loading}
            </TableCell>
          </TableRow>
        ) : transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-500">
              {reportsLabels.messages.noTransactions}
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((tx) => (
            <TableRow key={tx.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-colors">
              <TableCell className="whitespace-nowrap text-slate-300">{formatDate(tx.created_at || tx.date)}</TableCell>
              <TableCell className="capitalize">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-700/30 text-slate-300 border border-slate-700/50">
                  {formatType(tx.type)}
                </span>
              </TableCell>
              <TableCell className={`font-mono font-semibold ${tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                {tx.type === 'expense' ? '-' : ''}{formatRupiah(tx.amount)}
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editAdminFee, setEditAdminFee] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, created_at, type, amount, admin_fee, notes, from_wallet_id, to_wallet_id, product_id")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setTransactions((data ?? []) as Transaction[]);
    setErrorMessage(null);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function handleDelete() {
    if (!supabase || !deleteTarget) return;
    setIsDeleting(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const tx = deleteTarget;

    // Determine reversal strategy based on transaction type
    const incomeTypes = ["physical_sale", "electronic_service", "digital_ppob", "affiliate_passive_income", "internet_sharing_biznet"];
    const expenseTypes = ["inventory_purchase", "money_transfer_or_cash_withdrawal"];
    const isIncome = incomeTypes.includes(tx.type);
    const isExpense = expenseTypes.includes(tx.type);

    try {
      // --- REVERT WALLET BALANCES ---
      if (isIncome && tx.to_wallet_id) {
        const { data: wallet } = await sb.from("wallets").select("id, balance").eq("id", tx.to_wallet_id).single();
        if (wallet) {
          const newBalance = (Number(wallet.balance) || 0) - tx.amount;
          await sb.from("wallets").update({ balance: newBalance } as any).eq("id", wallet.id);
        }
      }

      if (isExpense && tx.from_wallet_id) {
        const { data: wallet } = await sb.from("wallets").select("id, balance").eq("id", tx.from_wallet_id).single();
        if (wallet) {
          const newBalance = (Number(wallet.balance) || 0) + tx.amount;
          await sb.from("wallets").update({ balance: newBalance } as any).eq("id", wallet.id);
        }
      }

      if (tx.type === "money_transfer_or_cash_withdrawal" && tx.to_wallet_id) {
        const { data: destWallet } = await sb.from("wallets").select("id, balance").eq("id", tx.to_wallet_id).single();
        if (destWallet) {
          const revertAmount = tx.amount + (tx.admin_fee || 0);
          const newBalance = (Number(destWallet.balance) || 0) - revertAmount;
          await sb.from("wallets").update({ balance: newBalance } as any).eq("id", destWallet.id);
        }
      }

      // --- REVERT PRODUCT STOCK ---
      if (isIncome && tx.product_id) {
        const { data: product } = await sb.from("products").select("id, stock, selling_price").eq("id", tx.product_id).single();
        if (product) {
          const sellingPrice = Number(product.selling_price) || 1;
          const restoredQty = sellingPrice > 0 ? Math.round(tx.amount / sellingPrice) : 1;
          const newStock = (product.stock || 0) + restoredQty;
          await sb.from("products").update({ stock: newStock } as any).eq("id", product.id);
        }
      }

      // --- DELETE THE TRANSACTION RECORD ---
      const { error } = await sb.from("transactions").delete().eq("id", tx.id);

      if (error) {
        toast.error("Failed to delete transaction", { description: error.message });
        setIsDeleting(false);
        return;
      }

      toast.success("Transaction deleted and balances reverted successfully");
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      await loadTransactions();
    } catch (err) {
      toast.error("An unexpected error occurred during reversal");
      setIsDeleting(false);
    }
  }

  function openEdit(tx: Transaction) {
    setEditTarget(tx);
    setEditAmount(String(tx.amount));
    setEditAdminFee(String(tx.admin_fee || 0));
    setEditNotes(tx.notes || "");
    setIsEditOpen(true);
  }

  async function handleEditSave() {
    if (!supabase || !editTarget) return;
    setIsSavingEdit(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("transactions").update({
      amount: Number(editAmount),
      admin_fee: Number(editAdminFee),
      notes: editNotes.trim(),
    } as any).eq("id", editTarget.id);

    if (error) {
      toast.error("Failed to update transaction", { description: error.message });
      setIsSavingEdit(false);
      return;
    }

    toast.success("Transaction updated successfully");
    setIsSavingEdit(false);
    setIsEditOpen(false);
    setEditTarget(null);
    await loadTransactions();
  }

  function formatDate(dateString: string) {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
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

  function formatType(type: string) {
    if (!type) return "-";
    // Convert e.g., "physical_sale" to "Physical Sale"
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Filter transactions based on type
  const incomeTypes = [
    "physical_sale",
    "electronic_service",
    "digital_ppob",
    "affiliate_passive_income",
    "internet_sharing_biznet",
    "income",
  ];

  const operatingExpenseTypes = [
    "expense",
  ];

  const assetTransferTypes = [
    "inventory_purchase",
    "money_transfer",
    "cash_withdrawal",
    "balance_transfer",
    "kasbon",
  ];

  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") return transactions;
    if (activeTab === "income") return transactions.filter((tx) => incomeTypes.includes(tx.type));
    if (activeTab === "operating-expenses") return transactions.filter((tx) => operatingExpenseTypes.includes(tx.type));
    if (activeTab === "assets-transfers") return transactions.filter((tx) => assetTransferTypes.includes(tx.type));
    return transactions;
  }, [transactions, activeTab]);

  function handleExportCSV() {
    if (transactions.length === 0) return;

    const headers = ["Date", "Type", "Amount", "Admin Fee", "Notes"];
    const rows = transactions.map((tx) => [
      formatDate(tx.created_at || tx.date).replace(/,/g, ""), // Basic comma removal for date string safety
      formatType(tx.type),
      tx.amount.toString(),
      (tx.admin_fee || 0).toString(),
      `"${(tx.notes || "").replace(/"/g, '""')}"`, // Escape quotes and wrap in quotes for robust CSV
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
  }

  return (
    <div className="bg-[#020617] min-h-screen p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">{reportsLabels.titles.financialReports}</h2>
        <p className="text-slate-400 text-sm">{reportsLabels.titles.description}</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive mb-4">{errorMessage}</p> : null}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.totalRevenue}</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono">{formatRupiah(transactions.filter(tx => !tx.type.includes('expense') && !tx.type.includes('withdrawal') && !tx.type.includes('transfer')).reduce((sum, tx) => sum + tx.amount, 0))}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.totalExpenses}</p>
          <p className="text-3xl font-bold text-red-400 font-mono">{formatRupiah(transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0))}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.netProfit}</p>
          <p className="text-3xl font-bold text-orange-400 font-mono">{formatRupiah(transactions.filter(tx => !tx.type.includes('expense') && !tx.type.includes('withdrawal') && !tx.type.includes('transfer')).reduce((sum, tx) => sum + tx.amount, 0) - transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0))}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-2">{reportsLabels.summaryCards.profitMargin}</p>
          <p className="text-3xl font-bold text-blue-400 font-mono">{(() => {
            const revenue = transactions.filter(tx => !tx.type.includes('expense') && !tx.type.includes('withdrawal') && !tx.type.includes('transfer')).reduce((sum, tx) => sum + tx.amount, 0);
            const expenses = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
            const margin = revenue > 0 ? ((revenue - expenses) / revenue * 100).toFixed(1) : '0.0';
            return `${margin}%`;
          })()}</p>
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
            <Button onClick={handleExportCSV} variant="outline" size="default" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)] transition-all shrink-0" disabled={isLoading || transactions.length === 0}>
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
              isLoading={isLoading} 
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
              isLoading={isLoading} 
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
              isLoading={isLoading} 
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
              isLoading={isLoading} 
              formatDate={formatDate}
              formatType={formatType}
              onPrint={(tx) => { setSelectedReceipt(tx); setIsReceiptOpen(true); }}
              onEdit={openEdit}
              onDelete={(tx) => { setDeleteTarget(tx); setIsDeleteOpen(true); }}
            />
          </div>
        </TabsContent>
      </Tabs>

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
                  <div>Date: {formatDate(selectedReceipt.created_at || selectedReceipt.date)}</div>
                  <div>Trx ID: {selectedReceipt.id.split('-')[0].toUpperCase()}</div>
                </div>
                <div className="mb-4">
                  <div className="font-semibold">{formatType(selectedReceipt.type)}</div>
                  <div className="text-xs break-words">{selectedReceipt.notes || "-"}</div>
                </div>
                <div className="border-t border-dashed border-black mt-2 pt-2 flex justify-between items-center">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedReceipt.amount)}</span>
                </div>
                {selectedReceipt.admin_fee > 0 && (
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span>Admin Fee</span>
                    <span>{formatRupiah(selectedReceipt.admin_fee)}</span>
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
            {reportsLabels.messages.deleteConfirm}
          </p>
          {deleteTarget && (
            <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3 text-sm space-y-1">
              <p><span className="text-slate-400">Type:</span> {formatType(deleteTarget.type)}</p>
              <p><span className="text-slate-400">Amount:</span> {formatRupiah(deleteTarget.amount)}</p>
              <p className="text-xs text-slate-400 truncate">{deleteTarget.notes || "No notes"}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null); }} disabled={isDeleting} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              {reportsLabels.buttons.cancel}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all"
            >
              {isDeleting ? "Deleting..." : reportsLabels.buttons.delete}
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
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} disabled={isSavingEdit} className="border-slate-700 text-slate-300 hover:bg-slate-800">{reportsLabels.buttons.cancel}</Button>
                <Button onClick={handleEditSave} disabled={isSavingEdit} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
                  {isSavingEdit ? "Saving..." : reportsLabels.buttons.saveChanges}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
