"use client";

import { useMemo, useState, useEffect } from "react";
import { TrendingUp, TrendingDown, CalendarDays, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { useFinanceContext } from "@/context/FinanceContext";
import { formatRupiah } from "@/lib/utils";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

type Debt = {
  id: string;
  personName: string;
  type: "receivable" | "payable";
  status: "unpaid" | "paid";
  amount: number;
  notes: string | null;
};

export default function Home() {
  // DOKUMENTASI: State isMounted digunakan untuk mencegah Hydration Error saat refresh di Vercel
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { mode } = useAppContext();
  const { 
    wallets, transactions, products, investments, debts,
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear 
  } = useFinanceContext();

  // 1. FILTER DATA BERDASARKAN BULAN & TAHUN YANG DIPILIH
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (!tx.date) return false;
      // DOKUMENTASI: Menggunakan split manual agar terhindar dari Timezone Bug
      const parts = tx.date.split('-'); 
      if (parts.length < 3) return false;
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10) - 1; // -1 karena array dimulai dari 0
      
      return txMonth === selectedMonth && txYear === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Pisahkan transaksi netral (transfer) untuk kalkulasi laba/rugi
  const pureMonthlyTransactions = useMemo(() => {
    return filteredTransactions.filter(tx => tx.type === "income" || tx.type === "expense");
  }, [filteredTransactions]);

  // Semua transaksi murni untuk grafik 6 bulan terakhir
  const pureAllTransactions = useMemo(() => {
    return transactions.filter(tx => tx.type === "income" || tx.type === "expense");
  }, [transactions]);

  // 2. STATISTIK BULANAN
  const financeStats = useMemo(() => {
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    for (const tx of pureMonthlyTransactions) {
      const amount = safeNumber(tx.amount);
      const adminFee = safeNumber(tx.adminFee ?? 0);

      if (tx.type === "income") {
        monthlyIncome += amount;
      } else if (tx.type === "expense") {
        monthlyExpenses += amount + adminFee;
      }
    }

    const monthlyNetProfit = monthlyIncome - monthlyExpenses;
    return { monthlyIncome, monthlyExpenses, monthlyNetProfit };
  }, [pureMonthlyTransactions]);

  // 3. KALKULASI ASET SAAT INI
  const totalWalletBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const totalInvestmentValue = investments.reduce((sum, inv) => sum + ((inv.quantity || 1) * (inv.currentPrice || 0)), 0);
  const totalInventoryValue = products
    .filter((product) => (product.status ?? "in_stock") === "in_stock")
    .reduce((sum, item) => sum + ((item.stock || 0) * (item.costPrice || 0)), 0);
  const totalReceivables = debts
    .filter(d => d.type === 'receivable' && d.status === 'unpaid')
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  
  const totalAssets = totalWalletBalance + totalInvestmentValue + totalInventoryValue + totalReceivables;

  // 4. HUTANG & PIUTANG AKTIF
  const activeReceivables = useMemo(() => debts.filter(d => d.type === "receivable" && d.status === "unpaid"), [debts]);
  const activePayables = useMemo(() => debts.filter(d => d.type === "payable" && d.status === "unpaid"), [debts]);

  // 5. DATA GRAFIK PIE
  const pieData = useMemo(() => {
    const slices = [
      { name: "Liquid Cash & Bank", value: totalWalletBalance },
      { name: "Investments", value: totalInvestmentValue },
      { name: "Inventory Stock", value: totalInventoryValue },
      { name: "Receivables (Piutang)", value: totalReceivables },
    ].filter((s) => s.value > 0);
    return slices.length > 0 ? slices : [{ name: "No Data", value: 1 }];
  }, [totalWalletBalance, totalInvestmentValue, totalInventoryValue, totalReceivables]);

  // 6. TRANSAKSI TERBARU (Hanya bulan terpilih)
  const recentTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")) // Sort string manual (Aman & Cepat)
      .slice(0, 5);
  }, [filteredTransactions]);

  const formatTransactionType = (type: string) => type.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  
  // Format tanggal manual aman zona waktu
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${MONTHS[m].substring(0, 3)} ${y}`;
  };

  // 7. DATA GRAFIK HARIAN
  const barDataDaily = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailyMap = new Map<string, { income: number; expenses: number }>();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dailyMap.set(dateStr, { income: 0, expenses: 0 });
    }

    for (const tx of pureMonthlyTransactions) {
      if (tx.date && dailyMap.has(tx.date)) {
        const entry = dailyMap.get(tx.date)!;
        const amount = safeNumber(tx.amount);
        const adminFee = safeNumber(tx.adminFee ?? 0);
        if (tx.type === "income") entry.income += amount;
        else if (tx.type === "expense") entry.expenses += amount + adminFee;
        dailyMap.set(tx.date, entry);
      }
    }

    return Array.from(dailyMap.entries()).map(([dateStr, stats]) => {
      const parts = dateStr.split('-');
      const d = parseInt(parts[2], 10);
      return {
        dateFull: dateStr,
        day: `${d}`, // Menampilkan "1", "2", dst
        Income: stats.income,
        Expenses: stats.expenses,
        Profit: stats.income - stats.expenses,
      };
    });
  }, [pureMonthlyTransactions, selectedMonth, selectedYear]);

  // 8. DATA GRAFIK BULANAN (6 Bulan Terakhir)
  const barDataMonthly = useMemo(() => {
    const monthMap = new Map<string, { income: number; expenses: number }>();

    for (const tx of pureAllTransactions) {
      if (!tx.date) continue;
      const parts = tx.date.split('-');
      if (parts.length < 2) continue;
      const key = `${parts[0]}-${parts[1]}`; // Contoh: "2026-05"

      const entry = monthMap.get(key) ?? { income: 0, expenses: 0 };
      const amount = safeNumber(tx.amount);
      const adminFee = safeNumber(tx.adminFee ?? 0);

      if (tx.type === "income") entry.income += amount;
      else if (tx.type === "expense") entry.expenses += amount + adminFee;

      monthMap.set(key, entry);
    }

    const sortedKeys = Array.from(monthMap.keys()).sort();
    const last6 = sortedKeys.slice(-6);

    if (last6.length === 0) return [{ month: MONTHS[selectedMonth].substring(0, 3), Income: 0, Expenses: 0, Profit: 0 }];

    return last6.map((key) => {
      const entry = monthMap.get(key)!;
      const monthIdx = parseInt(key.split("-")[1], 10) - 1;
      return {
        month: MONTHS[monthIdx].substring(0, 3),
        Income: Math.round(entry.income),
        Expenses: Math.round(entry.expenses),
        Profit: Math.round(entry.income - entry.expenses),
      };
    });
  }, [pureAllTransactions, selectedMonth]);

  /* ---------- Tooltips ---------- */
  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-lg">
        <p className="font-medium text-white">{payload[0].name}</p>
        <p className="text-slate-300 font-bold">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 backdrop-blur-sm px-4 py-3 text-sm shadow-xl min-w-[180px] z-50">
        <p className="mb-2 font-semibold text-white border-b border-slate-700 pb-1">Tanggal {label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Jika halaman sedang dirakit di server Vercel, jangan render grafiknya dulu
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <p className="text-orange-500 font-medium animate-pulse">Menyiapkan Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER & MONTH PICKER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
            <p className="text-slate-400 text-sm mt-1">
              {mode === "business" ? "Business Operations" : "Personal Finance"} Report.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KARTU STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Liquid Assets" value={formatRupiah(totalAssets)} subtitle="Cash, Stock, & Receivables" accent="orange" />
          <StatCard title="Revenue" value={formatRupiah(financeStats.monthlyIncome)} subtitle={`Income in ${MONTHS[selectedMonth]}`} accent="green" />
          <StatCard title="Expenses" value={formatRupiah(financeStats.monthlyExpenses)} subtitle={`Spending in ${MONTHS[selectedMonth]}`} accent="red" />
          <NetProfitCard netProfit={financeStats.monthlyNetProfit} monthName={MONTHS[selectedMonth]} />
        </div>

        {/* GRAFIK HARIAN & GRAFIK PIE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
            <CardHeader className="pb-2 border-b border-slate-800/50">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-orange-500" />
                Daily Trend: {MONTHS[selectedMonth]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barDataDaily} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => shortCurrency(v)} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#1e293b", opacity: 0.5 }} />
                  <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px", color: "#cbd5e1" }} />
                  <Bar dataKey="Expenses" name="Pengeluaran" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={15} />
                  <Bar dataKey="Income" name="Pendapatan" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={15} />
                  <Bar dataKey="Profit" name="Laba Bersih" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl flex flex-col">
            <CardHeader className="pb-2 border-b border-slate-800/50">
              <CardTitle className="text-white text-lg">Asset Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center">
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
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

        {/* GRAFIK BULANAN & AKTIVITAS TERBARU */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
            <CardHeader className="pb-2 border-b border-slate-800/50">
              <CardTitle className="text-white text-lg">6-Month Trend Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barDataMonthly} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={shortCurrency} />
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
              <CardTitle className="text-white text-lg">Recent Activities ({MONTHS[selectedMonth]})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              <div className="overflow-x-auto">
                {recentTransactions.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <p className="text-slate-500 text-sm">Tidak ada transaksi di bulan ini.</p>
                  </div>
                ) : (
                  <Table className="min-w-[400px]">
                    <TableHeader className="bg-slate-950/50">
                      <TableRow className="border-slate-800/50">
                        <TableHead className="text-slate-400 font-medium h-10">Date</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Category</TableHead>
                        <TableHead className="text-slate-400 font-medium text-right h-10">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((tx) => {
                        const isIncome = tx.type === "income";
                        const isExpense = tx.type === "expense";
                        return (
                          <TableRow key={tx.id} className="border-slate-800/50 hover:bg-slate-800/40">
                            <TableCell className="text-slate-300 text-sm py-3 whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-slate-200 text-sm font-medium whitespace-nowrap">{tx.category || formatTransactionType(tx.type)}</span>
                              </div>
                            </TableCell>
                            <TableCell className={`text-right font-mono font-medium text-sm py-3 whitespace-nowrap ${isIncome ? "text-emerald-400" : isExpense ? "text-red-400" : "text-slate-400"}`}>
                              {isIncome ? "+" : isExpense ? "-" : ""}{formatRupiah(tx.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HUTANG & PIUTANG AKTIF */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DebtTableCard title="Piutang Belum Dibayar (Receivables)" items={activeReceivables} accent="green" emptyMsg="Tidak ada piutang aktif." />
          <DebtTableCard title="Hutang Belum Dibayar (Payables)" items={activePayables} accent="red" emptyMsg="Kamu tidak memiliki tanggungan hutang." />
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */
function StatCard({ title, value, subtitle, accent }: { title: string, value: string, subtitle: string, accent: "orange" | "blue" | "green" | "red" }) {
  const accentColors = { orange: "text-orange-500", blue: "text-blue-500", green: "text-emerald-500", red: "text-red-500" };
  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 hover:border-slate-700/80 transition-colors shadow-lg relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 blur-3xl rounded-full transition-opacity duration-500 bg-current ${accentColors[accent]}`}></div>
      <CardContent className="p-5 relative z-10">
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <p className={`text-2xl font-bold tracking-tight mb-2 ${accentColors[accent]}`}>{value}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function NetProfitCard({ netProfit, monthName }: { netProfit: number, monthName: string }) {
  const isPositive = netProfit >= 0;
  const accentColor = isPositive ? "text-emerald-500" : "text-red-500";
  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 hover:border-slate-700/80 transition-colors shadow-lg relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 blur-3xl rounded-full transition-opacity duration-500 bg-current ${accentColor}`}></div>
      <CardContent className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-slate-400 text-sm font-medium">Net Profit</p>
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? "Profit" : "Loss"}</span>
          </div>
        </div>
        <p className={`text-2xl font-bold tracking-tight mb-2 ${accentColor}`}>{formatRupiah(netProfit)}</p>
        <p className="text-xs text-slate-500">In {monthName}</p>
      </CardContent>
    </Card>
  );
}

function DebtTableCard({ title, items, accent, emptyMsg }: { title: string, items: Debt[], accent: "green" | "red", emptyMsg: string }) {
  const accentColor = accent === "green" ? "text-emerald-400" : "text-red-400";
  const badgeColor = accent === "green" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
  const totalAmount = items.reduce((sum: number, item: Debt) => sum + item.amount, 0);

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl overflow-hidden flex flex-col">
      <CardHeader className="pb-2 border-b border-slate-800/50 flex flex-row items-center justify-between">
        <CardTitle className="text-white text-lg flex items-center gap-2"><Users className="h-5 w-5 text-slate-400" />{title}</CardTitle>
        <span className={`font-mono font-bold text-sm ${accentColor}`}>{formatRupiah(totalAmount)}</span>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-8"><p className="text-slate-500 text-sm">{emptyMsg}</p></div>
        ) : (
          <div className="max-h-[250px] overflow-y-auto">
            <Table className="min-w-[300px]">
              <TableBody>
                {items.map((item: Debt) => (
                  <TableRow key={item.id} className="border-slate-800/50 hover:bg-slate-800/40">
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-200 text-sm font-medium">{item.personName}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">{item.notes || "-"}</span>
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
function safeNumber(value: any) {
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