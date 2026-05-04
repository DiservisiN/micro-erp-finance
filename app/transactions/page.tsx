"use client";

import { FormEvent, useMemo, useState, Suspense } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Receipt, FolderOpen } from "lucide-react";

import { useFinanceContext } from "@/context/FinanceContext";
import { formatRupiah } from "@/lib/utils";

type Transaction = {
  id: string;
  type: string;
  category?: string;
  amount: number;
  adminFee?: number | null;
  date: string;
  notes?: string | null;
  productId?: string | null;
  fromWalletId?: string | null;
  toWalletId?: string | null;
  debtId?: string | null;
};

// ==========================================
// FORM ADD EXPENSE
// ==========================================
function ExpensesForm({ onSuccess }: { onSuccess: () => void }) {
  const { wallets, categories, addTransaction } = useFinanceContext();
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseWalletId, setExpenseWalletId] = useState("");

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    const parsedAmount = Number(expenseAmount);

    if (parsedAmount <= 0) {
      toast.error("Amount must be greater than 0.");
      setIsSubmitting(false);
      return;
    }

    if (!expenseCategory) {
      toast.error("Please select a category.");
      setIsSubmitting(false);
      return;
    }

    const selectedWallet = wallets.find((wallet) => wallet.id === expenseWalletId);
    if (!selectedWallet) {
      toast.error("Please select a wallet.");
      setIsSubmitting(false);
      return;
    }

    if (selectedWallet.balance < parsedAmount) {
      toast.error("Insufficient wallet balance.");
      setIsSubmitting(false);
      return;
    }

    const newTransaction = {
      id: Date.now().toString(),
      date: expenseDate,
      type: "expense",
      category: expenseCategory,
      amount: parsedAmount,
      fromWalletId: selectedWallet.id,
      notes: expenseDescription,
    };
    
    await addTransaction(newTransaction as Transaction);

    toast.success("Expense recorded successfully");
    setIsSubmitting(false);
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseCategory("");
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseWalletId("");
    onSuccess();
  }

  return (
    <form onSubmit={handleAddExpense} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="expense-amount" className="text-slate-700 dark:text-slate-300">Amount *</Label>
        <Input
          id="expense-amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={expenseAmount}
          onChange={(e) => setExpenseAmount(e.target.value)}
          placeholder="0.00"
          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-description" className="text-slate-700 dark:text-slate-300">Description</Label>
        <Input
          id="expense-description"
          value={expenseDescription}
          onChange={(e) => setExpenseDescription(e.target.value)}
          placeholder="e.g. Office supplies purchase"
          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-category" className="text-slate-700 dark:text-slate-300">Category *</Label>
        <select
          id="expense-category"
          required
          value={expenseCategory}
          onChange={(e) => setExpenseCategory(e.target.value)}
          className="w-full flex h-10 items-center justify-between rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="" disabled>Select category...</option>
          {expenseCategories.length === 0 ? (
            <option value="" disabled>No categories — add in Settings</option>
          ) : (
            expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-date" className="text-slate-700 dark:text-slate-300">Date *</Label>
        <Input
          id="expense-date"
          type="date"
          required
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-wallet" className="text-slate-700 dark:text-slate-300">Select Wallet *</Label>
        <select
          id="expense-wallet"
          required
          value={expenseWalletId}
          onChange={(e) => setExpenseWalletId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select wallet</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onSuccess}
          disabled={isSubmitting}
          className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all"
        >
          {isSubmitting ? "Recording..." : "Record Expense"}
        </Button>
      </div>
    </form>
  );
}

// ==========================================
// DASHBOARD TRANSAKSI UTAMA
// ==========================================
function TransactionsDashboard() {
  const { wallets, transactions, deleteTransaction } = useFinanceContext();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const incomeTransactions = useMemo(() => transactions.filter(t => t.type !== "expense" && t.type !== "transfer" && t.type !== "asset_purchase"), [transactions]);
  
  const expenses = useMemo(() => transactions.filter(t => t.type === "expense" || t.type === "asset_purchase").map(t => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    description: t.notes || "",
    expense_category: t.category,
    from_wallet_id: t.fromWalletId,
    wallet_name: wallets.find(w => w.id === t.fromWalletId)?.name || "Unknown",
    type: t.type
  })), [transactions, wallets]);

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const currentBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getCategoryLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      physical_sale: "Physical Sale",
      money_transfer: "Money Transfer",
      cash_withdrawal: "Cash Withdrawal",
      balance_transfer: "Balance Transfer",
      electronic_service: "Electronic Service",
      digital_ppob: "Digital PPOB",
      affiliate_passive_income: "Affiliate",
      internet_sharing_biznet: "Internet Sharing",
      kasbon: "Kasbon",
    };
    return typeMap[type] || type;
  };

  const getGhostBadgeClasses = (color: string) => {
    const map: Record<string, string> = {
      emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
      blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
      amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
      purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
      cyan: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20",
      pink: "bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/20",
      violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
      sky: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
      orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
      red: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
      slate: "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/20",
    };
    return map[color] || map.slate;
  };

  const getCategoryColor = (type: string) => {
    const colorMap: Record<string, string> = {
      physical_sale: "emerald", money_transfer: "blue", cash_withdrawal: "amber",
      balance_transfer: "purple", electronic_service: "cyan", digital_ppob: "pink",
      affiliate_passive_income: "violet", internet_sharing_biznet: "sky", kasbon: "orange",
    };
    return colorMap[type] || "slate";
  };

  const filterBySearchAndDate = (items: any[], notesKey: string) => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        (item[notesKey] || "").toLowerCase().includes(q) ||
        (item.type ? getCategoryLabel(item.type).toLowerCase().includes(q) : false) ||
        (item.expense_category || "").toLowerCase().includes(q);
      const itemDate = item.date ? item.date.split("T")[0] : "";
      const matchesFrom = !dateFrom || itemDate >= dateFrom;
      const matchesTo = !dateTo || itemDate <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  };

  const filteredIncome = useMemo(() => filterBySearchAndDate(incomeTransactions, "notes"), [incomeTransactions, searchQuery, dateFrom, dateTo]);
  const filteredExpenses = useMemo(() => filterBySearchAndDate(expenses, "description"), [expenses, searchQuery, dateFrom, dateTo]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    await deleteTransaction(id);
    toast.success("Transaction deleted");
  };

  return (
    <div className="flex flex-col w-full gap-4 md:gap-6 bg-slate-50 dark:bg-[#020617] transition-colors duration-300 min-h-screen p-4 md:p-6">
      
      {/* HEADER & FILTERS */}
      <div className="w-full bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">Transactions Book</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">View all historical records. Use POS to add new income.</p>
          </div>
          <div className="flex w-full md:w-auto">
            <Button onClick={() => setIsExpenseModalOpen(true)} className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-[0_4px_14px_rgba(239,68,68,0.3)] transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3 pt-2">
          <div className="relative w-full md:flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
            <div className="flex flex-row items-center gap-1 sm:gap-2 w-full sm:w-auto bg-slate-50 dark:bg-slate-800/50 p-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700/50 overflow-hidden">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 flex-1 min-w-[90px] sm:w-[130px] bg-transparent text-[11px] sm:text-sm text-slate-700 dark:text-white focus:outline-none"
              />
              <span className="text-slate-400 text-[11px] sm:text-xs font-medium shrink-0">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 flex-1 min-w-[90px] sm:w-[130px] bg-transparent text-[11px] sm:text-sm text-slate-700 dark:text-white focus:outline-none"
              />
            </div>
            
            {(searchQuery || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearchQuery(""); setDateFrom(""); setDateTo(""); }}
                className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/30 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all w-full sm:w-auto"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6">
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Total Cash In (Uang Masuk)</p>
          <p className="text-xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-jetbrains">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6">
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Total Cash Out (Uang Keluar)</p>
          <p className="text-xl md:text-3xl font-bold text-red-600 dark:text-red-400 font-jetbrains">{formatRupiah(totalExpense)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6">
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Current Balance</p>
          <p className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white font-jetbrains">{formatRupiah(currentBalance)}</p>
        </div>
      </div>

      {/* TABLES */}
      <div className="w-full flex flex-col gap-6">
        
        {/* INCOME TABLE */}
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cash In (Pemasukan Uang)</h3>
          </div>
          <div className="overflow-x-auto w-full pb-2">
            <Table className="min-w-[800px] w-full">
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <TableHead className="text-slate-500 dark:text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Description</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Category</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Wallet</TableHead>
                  <TableHead className="text-right text-slate-500 dark:text-slate-400">Amount</TableHead>
                  <TableHead className="text-right text-slate-500 dark:text-slate-400 w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncome.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-700/60" strokeWidth={1} />
                        <p className="text-slate-400 dark:text-slate-500 text-sm">No income transactions recorded yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncome.map((transaction) => {
                    const wallet = wallets.find(w => w.id === transaction.to_wallet_id);
                    const catColor = getCategoryColor(transaction.type);
                    return (
                      <TableRow key={transaction.id} className="border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                        <TableCell className="text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                        <TableCell className="text-slate-800 dark:text-slate-300 text-sm max-w-[200px] truncate" title={transaction.notes || ""}>{transaction.notes || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getGhostBadgeClasses(catColor)}`}>
                            {getCategoryLabel(transaction.type)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {wallet ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20">
                              {wallet.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-jetbrains text-emerald-600 dark:text-emerald-400 font-semibold text-sm tabular-nums whitespace-nowrap">
                          +{formatRupiah(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDelete(transaction.id)} className="p-1.5 md:p-2 rounded-md border border-slate-200 dark:border-transparent hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* EXPENSE TABLE */}
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none rounded-xl p-4 md:p-6 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cash Out (Pengeluaran Uang)</h3>
          </div>
          <div className="overflow-x-auto w-full pb-2">
            <Table className="min-w-[800px] w-full">
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <TableHead className="text-slate-500 dark:text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Description</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Category</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Wallet</TableHead>
                  <TableHead className="text-right text-slate-500 dark:text-slate-400">Amount</TableHead>
                  <TableHead className="text-right text-slate-500 dark:text-slate-400 w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <FolderOpen className="h-12 w-12 text-slate-300 dark:text-slate-700/60" strokeWidth={1} />
                        <p className="text-slate-400 dark:text-slate-500 text-sm">No expense transactions recorded yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => {
                    const expWallet = wallets.find(w => w.id === expense.from_wallet_id);
                    return (
                      <TableRow key={expense.id} className="border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                        <TableCell className="text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap">{formatDate(expense.date)}</TableCell>
                        <TableCell className="text-slate-800 dark:text-slate-300 text-sm max-w-[200px] truncate" title={expense.description || ""}>{expense.description || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getGhostBadgeClasses("red")}`}>
                            {expense.expense_category || "Uncategorized"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {expWallet ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20">
                              {expWallet.name}
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20">
                              {expense.wallet_name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-jetbrains text-red-600 dark:text-red-400 font-semibold text-sm tabular-nums whitespace-nowrap">
                          -{formatRupiah(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDelete(expense.id)} className="p-1.5 md:p-2 rounded-md border border-slate-200 dark:border-transparent hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isExpenseModalOpen} onOpenChange={(open) => { setIsExpenseModalOpen(open); }}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Add Expense</DialogTitle>
          </DialogHeader>
          <ExpensesForm onSuccess={() => setIsExpenseModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500 p-6">Loading transactions module...</p>}>
      <TransactionsDashboard />
    </Suspense>
  );
}