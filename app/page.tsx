"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, CalendarDays, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { useFinanceContext } from "@/context/FinanceContext";
import { formatRupiah } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ---------- chart colors ---------- */
const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

/* ---------- types ---------- */
type Debt = {
  id: string;
  personName: string;
  type: "receivable" | "payable";
  status: "unpaid" | "paid";
  amount: number;
  notes: string | null;
};

/* ---------- page ---------- */
export default function Home() {
  const { mode } = useAppContext();
  const { wallets, transactions, products, investments, debts } = useFinanceContext();

  const [dateRange, setDateRange] = useState<"7days" | "14days" | "30days">("14days");

  // Filter out neutral transactions (like "transfer" or "Return of Capital")
  const pureTransactions = useMemo(() => {
    return transactions.filter(tx => tx.type === "income" || tx.type === "expense");
  }, [transactions]);

  // 1. STATISTIK UTAMA
  const financeStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let allTimeIncome = 0;
    let allTimeExpenses = 0;

    for (const tx of pureTransactions) {
      const d = new Date(tx.date);
      const txMonth = d.getMonth();
      const txYear = d.getFullYear();
      const amount = safeNumber(tx.amount);
      const adminFee = safeNumber(tx.adminFee ?? 0);
      const isCurrentMonth = txMonth === currentMonth && txYear === currentYear;

      if (tx.type === "income") {
        allTimeIncome += amount;
        if (isCurrentMonth) monthlyIncome += amount;
      } else if (tx.type === "expense") {
        allTimeExpenses += amount + adminFee;
        if (isCurrentMonth) monthlyExpenses += amount + adminFee;
      }
    }

    const monthlyNetProfit = monthlyIncome - monthlyExpenses;
    const allTimeNetProfit = allTimeIncome - allTimeExpenses;

    return {
      monthlyIncome,
      monthlyExpenses,
      monthlyNetProfit,
      allTimeIncome,
      allTimeExpenses,
      allTimeNetProfit,
    };
  }, [pureTransactions]);

  // 2. KALKULASI ASET
  const totalWalletBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const totalInvestmentValue = investments.reduce((sum, inv) => {
    const qty = inv.quantity || 1;
    const price = inv.currentPrice || 0;
    return sum + (qty * price);
  }, 0);

  const totalInventoryValue = products
    .filter((product) => (product.status ?? "in_stock") === "in_stock")
    .reduce((sum, item) => {
      const stock = item.stock || 0;
      const price = item.costPrice || 0;
      return sum + (stock * price);
    }, 0);

  const totalReceivables = debts
    .filter(d => d.type === 'receivable' && d.status === 'unpaid')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalLiabilities = debts
    .filter(d => d.type === 'payable' && d.status === 'unpaid')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalAssets = totalWalletBalance + totalInvestmentValue + totalInventoryValue + totalReceivables;

  // 3. HUTANG & PIUTANG AKTIF
  const activeReceivables = useMemo(() => debts.filter(d => d.type === "receivable" && d.status === "unpaid"), [debts]);
  const activePayables = useMemo(() => debts.filter(d => d.type === "payable" && d.status === "unpaid"), [debts]);

  // 4. DATA GRAFIK PIE
  const pieData = useMemo(() => {
    const slices = [
      { name: "Liquid Cash & Bank", value: totalWalletBalance },
      { name: "Investments", value: totalInvestmentValue },
      { name: "Inventory Stock", value: totalInventoryValue },
      { name: "Receivables (Piutang)", value: totalReceivables },
    ].filter((s) => s.value > 0);

    return slices.length > 0 ? slices : [{ name: "No Data", value: 1 }];
  }, [totalWalletBalance, totalInvestmentValue, totalInventoryValue, totalReceivables]);

  // 5. TRANSAKSI TERBARU
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  const formatTransactionType = (type: string) => {
    return type.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" });
  };

  // 6. DATA GRAFIK BAR BULANAN
  const barDataMonthly = useMemo(() => {
    const monthMap = new Map<string, { income: number; expenses: number }>();

    for (const tx of pureTransactions) {
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) ?? { income: 0, expenses: 0 };

      const amount = safeNumber(tx.amount);
      const adminFee = safeNumber(tx.adminFee ?? 0);

      if (tx.type === "income") entry.income += amount;
      else if (tx.type === "expense") entry.expenses += amount + adminFee;

      monthMap.set(key, entry);
    }

    const sortedKeys = Array.from(monthMap.keys()).sort();
    const last6 = sortedKeys.slice(-6);

    if (last6.length === 0) {
      const now = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
      return [{ month: monthNames[now.getMonth()], Income: 0, Expenses: 0, Profit: 0 }];
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return last6.map((key) => {
      const entry = monthMap.get(key)!;
      const monthIdx = parseInt(key.split("-")[1], 10) - 1;
      const netProfit = entry.income - entry.expenses;
      return {
        month: monthNames[monthIdx],
        Income: Math.round(entry.income),
        Expenses: Math.round(entry.expenses),
        Profit: Math.round(netProfit),
      };
    });
  }, [pureTransactions]);

  // 7. DATA GRAFIK HARIAN
  const barDataDaily = useMemo(() => {
    const daysCount = dateRange === "7days" ? 7 : dateRange === "14days" ? 14 : 30;
    const dailyMap = new Map<string, { income: number; expenses: number }>();
    
    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { income: 0, expenses: 0 });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysCount);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    for (const tx of pureTransactions) {
      if (tx.date >= cutoffStr && dailyMap.has(tx.date)) {
        const entry = dailyMap.get(tx.date)!;
        const amount = safeNumber(tx.amount);
        const adminFee = safeNumber(tx.adminFee ?? 0);

        if (tx.type === "income") entry.income += amount;
        else if (tx.type === "expense") entry.expenses += amount + adminFee;
        
        dailyMap.set(tx.date, entry);
      }
    }

    return Array.from(dailyMap.entries()).map(([dateStr, stats]) => {
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
      const dayDate = d.getDate();
      const netProfit = stats.income - stats.expenses;
      return {
        dateFull: dateStr,
        day: `${dayDate} ${dayName}`,
        Income: stats.income,
        Expenses: stats.expenses,
        Profit: netProfit,
      };
    });
  }, [pureTransactions, dateRange]);

  /* ---------- custom tooltips ---------- */
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<any> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-lg">
        <p className="font-medium text-white">{payload[0].name}</p>
        <p className="text-slate-300 font-bold">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  };

  const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<any>; label?: string; }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 backdrop-blur-sm px-4 py-3 text-sm shadow-xl min-w-[180px]">
        <p className="mb-2 font-semibold text-white border-b border-slate-700 pb-1">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.name} className="flex justify-between items-center gap-4">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}
              </span>
              <span className="font-mono font-medium" style={{ color: entry.color }}>
                {formatRupiah(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
            <p className="text-slate-400 text-sm mt-1">
              Financial summary for {mode === "business" ? "Business Operations" : "Personal Finance"}.
            </p>
          </div>
        </div>

        {/* ROW 1: KARTU STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Liquid Assets"
            value={formatRupiah(totalAssets)}
            subtitle="Cash, Stock, & Receivables"
            accent="orange"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatRupiah(financeStats.monthlyIncome)}
            subtitle="Pure income this month"
            accent="green"
          />
          <StatCard
            title="Monthly Expenses"
            value={formatRupiah(financeStats.monthlyExpenses)}
            subtitle="Total spending this month"
            accent="red"
          />
          <NetProfitCard
            netProfit={financeStats.monthlyNetProfit}
            isLoading={false}
          />
        </div>

        {/* ROW 2: GRAFIK HARIAN & GRAFIK PIE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
            <CardHeader className="pb-2 border-b border-slate-800/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-orange-500" />
                  Daily Profit & Loss
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">Monitoring trend keuntungan setiap hari.</p>
              </div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1 focus:ring-orange-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="14days">Last 14 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barDataDaily} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => shortCurrency(v)} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#1e293b", opacity: 0.5 }} />
                  <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px", color: "#cbd5e1" }} />
                  <Bar dataKey="Expenses" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Income" name="Pendapatan (Kotor)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Profit" name="Laba Bersih" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl flex flex-col">
            <CardHeader className="pb-2 border-b border-slate-800/50">
              <CardTitle className="text-white text-lg">Asset Distribution</CardTitle>
              <p className="text-xs text-slate-400 mt-1">Pembagian nilai kekayaan saat ini.</p>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center">
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-2 gap-y-3 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                    <span className="text-xs text-slate-300 truncate" title={entry.name}>{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROW 3: GRAFIK BULANAN & AKTIVITAS TERBARU */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
            <CardHeader className="pb-2 border-b border-slate-800/50">
              <CardTitle className="text-white text-lg">Monthly Performance (6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barDataMonthly} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => shortCurrency(v)} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#1e293b", opacity: 0.5 }} />
                  <Bar dataKey="Income" name="Pendapatan" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Expenses" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Profit" name="Laba Bersih" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl overflow-hidden flex flex-col">
            <CardHeader className="pb-2 border-b border-slate-800/50">
              <CardTitle className="text-white text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              {recentTransactions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p className="text-slate-500 text-sm">Belum ada transaksi tercatat.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-950/50">
                    <TableRow className="border-slate-800/50">
                      <TableHead className="text-slate-400 font-medium h-10">Date</TableHead>
                      <TableHead className="text-slate-400 font-medium h-10">Type / Category</TableHead>
                      <TableHead className="text-slate-400 font-medium text-right h-10">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx) => {
                      const isIncome = tx.type === "income";
                      const isExpense = tx.type === "expense";
                      
                      return (
                        <TableRow key={tx.id} className="border-slate-800/50 hover:bg-slate-800/40">
                          <TableCell className="text-slate-300 text-sm py-3">{formatDate(tx.date)}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-200 text-sm font-medium">
                                {tx.category || formatTransactionType(tx.type)}
                              </span>
                              <span className="text-xs text-slate-500 truncate max-w-[180px]">
                                {tx.notes || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-medium text-sm py-3 ${
                            isIncome ? "text-emerald-400" : isExpense ? "text-red-400" : "text-slate-400"
                          }`}>
                            {isIncome ? "+" : isExpense ? "-" : ""}{formatRupiah(tx.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROW 4: HUTANG & PIUTANG AKTIF */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DebtTableCard 
            title="Piutang Belum Dibayar (Receivables)" 
            items={activeReceivables} 
            accent="green" 
            emptyMsg="Hore! Tidak ada piutang aktif di luar sana." 
          />
          <DebtTableCard 
            title="Hutang Belum Dibayar (Payables)" 
            items={activePayables} 
            accent="red" 
            emptyMsg="Kerja bagus! Kamu tidak memiliki tanggungan hutang." 
          />
        </div>

      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */
function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: "orange" | "blue" | "green" | "red";
}) {
  const accentColors = {
    orange: "text-orange-500",
    blue: "text-blue-500",
    green: "text-emerald-500",
    red: "text-red-500",
  };

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 hover:border-slate-700/80 transition-colors shadow-lg relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 blur-3xl rounded-full transition-opacity duration-500 bg-current ${accentColors[accent]}`}></div>
      
      <CardContent className="p-5 relative z-10">
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <p className={`text-3xl font-bold tracking-tight mb-2 ${accentColors[accent]}`}>{value}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function NetProfitCard({
  netProfit,
  isLoading,
}: {
  netProfit: number;
  isLoading: boolean;
}) {
  const isPositive = netProfit >= 0;
  const accentColor = isPositive ? "text-emerald-500" : "text-red-500";

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 hover:border-slate-700/80 transition-colors shadow-lg relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 blur-3xl rounded-full transition-opacity duration-500 bg-current ${accentColor}`}></div>

      <CardContent className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-slate-400 text-sm font-medium">Monthly Net Profit</p>
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? "Profit" : "Loss"}</span>
          </div>
        </div>
        <p className={`text-3xl font-bold tracking-tight mb-2 ${accentColor}`}>
          {isLoading ? "..." : formatRupiah(netProfit)}
        </p>
        <p className="text-xs text-slate-500">Pure Income - Expenses</p>
      </CardContent>
    </Card>
  );
}

function DebtTableCard({
  title,
  items,
  accent,
  emptyMsg,
}: {
  title: string;
  items: Debt[];
  accent: "green" | "red";
  emptyMsg: string;
}) {
  const accentColor = accent === "green" ? "text-emerald-400" : "text-red-400";
  const badgeColor = accent === "green" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl overflow-hidden flex flex-col">
      <CardHeader className="pb-2 border-b border-slate-800/50 flex flex-row items-center justify-between">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-400" />
          {title}
        </CardTitle>
        <span className={`font-mono font-bold text-sm ${accentColor}`}>
          {formatRupiah(totalAmount)}
        </span>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-slate-500 text-sm">{emptyMsg}</p>
          </div>
        ) : (
          <div className="max-h-[250px] overflow-y-auto">
            <Table>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-slate-800/50 hover:bg-slate-800/40">
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-200 text-sm font-medium">{item.personName}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">
                          {item.notes || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${badgeColor} ${accentColor}`}>
                        {formatRupiah(item.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- helpers ---------- */
function safeNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function shortCurrency(value: number) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const sign = isNegative ? "-" : "";

  if (absValue >= 1_000_000_000) return `${sign}Rp ${(absValue / 1_000_000_000).toFixed(1)}M`;
  if (absValue >= 1_000_000) return `${sign}Rp ${(absValue / 1_000_000).toFixed(1)}jt`;
  if (absValue >= 1_000) return `${sign}Rp ${(absValue / 1_000).toFixed(1)}rb`;
  return `${sign}Rp ${absValue}`;
}