"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ---------- types ---------- */
type WalletRow = {
  id: string;
  name: string;
  balance: number | string;
  type: "business" | "personal";
};

type ProductRow = {
  id: string;
  name: string;
  cost_price: number | string;
  stock: number;
  status: string;
};

type InvestmentRow = {
  id: string;
  quantity: number | string;
  current_price: number | string;
};

type DebtRow = {
  id: string;
  type: "receivable" | "payable";
  status: "unpaid" | "paid";
  amount: number | string;
};

type TransactionRow = {
  id: string;
  type: string;
  amount: number | string;
  admin_fee?: number | string | null;
  date: string;
  notes?: string | null;
  product_id?: string | null;
};

/* ---------- chart colors ---------- */
const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

/* ---------- page ---------- */
export default function Home() {
  const { mode } = useAppContext();
  const { wallets, transactions, products, investments, debts } = useFinanceContext();

  // Calculate income, expenses, and profit
  const financeStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const incomeTypes = new Set([
      "physical_sale",
      "electronic_service",
      "digital_ppob",
      "affiliate_passive_income",
      "internet_sharing_biznet",
    ]);
    const expenseTypes = new Set(["expense"]);

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let monthlyCOGS = 0;
    let allTimeIncome = 0;
    let allTimeExpenses = 0;
    let allTimeCOGS = 0;

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const txMonth = d.getMonth();
      const txYear = d.getFullYear();
      const amount = safeNumber(tx.amount);
      const adminFee = safeNumber(tx.admin_fee ?? 0);
      const isCurrentMonth = txMonth === currentMonth && txYear === currentYear;

      if (incomeTypes.has(tx.type)) {
        allTimeIncome += amount;
        if (isCurrentMonth) monthlyIncome += amount;

        // Calculate COGS for physical sales and digital PPOB
        if ((tx.type === "physical_sale" || tx.type === "digital_ppob") && tx.product_id) {
          const product = products.find((p) => p.id === tx.product_id);
          if (product) {
            const costPrice = safeNumber(product.cost_price);
            allTimeCOGS += costPrice;
            if (isCurrentMonth) monthlyCOGS += costPrice;
          }
        }
      } else if (expenseTypes.has(tx.type)) {
        allTimeExpenses += amount + adminFee;
        if (isCurrentMonth) monthlyExpenses += amount + adminFee;
      }
    }

    const monthlyGrossProfit = monthlyIncome - monthlyCOGS;
    const monthlyNetProfit = monthlyGrossProfit - monthlyExpenses;
    const allTimeGrossProfit = allTimeIncome - allTimeCOGS;
    const allTimeNetProfit = allTimeGrossProfit - allTimeExpenses;

    return {
      monthlyIncome, monthlyExpenses, monthlyCOGS,
      monthlyGrossProfit, monthlyNetProfit,
      allTimeIncome, allTimeExpenses, allTimeCOGS,
      allTimeGrossProfit, allTimeNetProfit,
    };
  }, [transactions, products]);

  /* ---------- computed values ---------- */
  const businessWalletsTotal = wallets
    .filter((wallet) => wallet.type === "business")
    .reduce((sum, wallet) => sum + safeNumber(wallet.balance), 0);
  const personalWalletsTotal = wallets
    .filter((wallet) => wallet.type === "personal")
    .reduce((sum, wallet) => sum + safeNumber(wallet.balance), 0);
  const inventoryAsset = products
    .filter((product) => (product.status ?? "in_stock") === "in_stock")
    .reduce(
      (sum, product) => sum + safeNumber(product.stock) * safeNumber(product.cost_price),
      0,
    );
  const inventoryInTransit = products
    .filter((product) => product.status === "in_transit")
    .reduce(
      (sum, product) => sum + safeNumber(product.stock) * safeNumber(product.cost_price),
      0,
    );
  const investmentAsset = investments.reduce(
    (sum, investment) =>
      sum + safeNumber(investment.quantity) * safeNumber(investment.current_price),
    0,
  );
  const receivables = debts
    .filter((debt) => debt.type === "receivable" && debt.status === "unpaid")
    .reduce((sum, debt) => sum + safeNumber(debt.amount), 0);
  const liabilities = debts
    .filter((debt) => debt.type === "payable" && debt.status === "unpaid")
    .reduce((sum, debt) => sum + safeNumber(debt.amount), 0);

  const modeLiquidAssets = mode === "business" ? businessWalletsTotal : personalWalletsTotal;
  const modeSpecificAsset = mode === "business" ? inventoryAsset : investmentAsset;
  const totalAssets = modeLiquidAssets + modeSpecificAsset + receivables + inventoryInTransit;

  const combinedAssets =
    businessWalletsTotal + personalWalletsTotal + inventoryAsset + investmentAsset + receivables + inventoryInTransit;
  const netWorth = combinedAssets - liabilities;

  /* ---------- pie chart data (Asset Distribution) ---------- */
  const pieData = useMemo(() => {
    const slices = [
      { name: "Liquid Cash", value: modeLiquidAssets },
      { name: mode === "business" ? "Inventory" : "Investments", value: modeSpecificAsset },
      { name: "Receivables", value: receivables },
    ].filter((s) => s.value > 0);

    return slices.length > 0 ? slices : [{ name: "No Data", value: 1 }];
  }, [modeLiquidAssets, modeSpecificAsset, receivables, mode]);

  /* ---------- recent transactions ---------- */
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const incomeTypes = new Set([
    "physical_sale",
    "electronic_service",
    "digital_ppob",
    "affiliate_passive_income",
    "internet_sharing_biznet",
  ]);

  const formatTransactionType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  /* ---------- bar chart data (Income vs Expenses vs Profit) ---------- */
  const barData = useMemo(() => {
    // Aggregate last 6 months from transaction data
    const monthMap = new Map<string, { income: number; expenses: number; cogs: number }>();

    // Income transaction types
    const incomeTypes = new Set([
      "physical_sale",
      "electronic_service",
      "digital_ppob",
      "affiliate_passive_income",
      "internet_sharing_biznet",
    ]);
    // Expense transaction types - ONLY pure operating expenses
    const expenseTypes = new Set([
      "expense",
    ]);

    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) continue;
      // Use local time for consistent comparison
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) ?? { income: 0, expenses: 0, cogs: 0 };

      const amount = safeNumber(tx.amount);
      const adminFee = safeNumber(tx.admin_fee ?? 0);

      if (incomeTypes.has(tx.type)) {
        entry.income += amount;

        // Calculate COGS for physical sales and digital PPOB
        // Note: quantity is not stored in transactions table, assuming quantity = 1 for now
        if (tx.type === "physical_sale" && tx.product_id) {
          const product = products.find((p) => p.id === tx.product_id);
          if (product) {
            entry.cogs += safeNumber(product.cost_price);
          }
        }
        if (tx.type === "digital_ppob" && tx.product_id) {
          const product = products.find((p) => p.id === tx.product_id);
          if (product) {
            entry.cogs += safeNumber(product.cost_price);
          }
        }
      } else if (expenseTypes.has(tx.type)) {
        entry.expenses += amount + adminFee;
      }
      // Asset exchanges (inventory_purchase, money_transfer) are excluded from both income and expenses

      monthMap.set(key, entry);
    }

    // Sort by month and take last 6
    const sortedKeys = Array.from(monthMap.keys()).sort();
    const last6 = sortedKeys.slice(-6);

    if (last6.length === 0) {
      // Show placeholder with current month
      const now = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return [
        {
          month: monthNames[now.getMonth()],
          Income: 0,
          Expenses: 0,
          Profit: 0,
        },
      ];
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return last6.map((key) => {
      const entry = monthMap.get(key)!;
      const monthIdx = parseInt(key.split("-")[1], 10) - 1;
      const grossProfit = entry.income - entry.cogs;
      const netProfit = grossProfit - entry.expenses;
      return {
        month: monthNames[monthIdx],
        Income: Math.round(entry.income * 100) / 100,
        Expenses: Math.round(entry.expenses * 100) / 100,
        Profit: Math.round(netProfit * 100) / 100,
      };
    });
  }, [transactions, products]);

  /* ---------- custom tooltip for pie ---------- */
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-lg">
        <p className="font-medium text-white">{payload[0].name}</p>
        <p className="text-slate-400">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  };

  /* ---------- custom tooltip for bar ---------- */
  const BarTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-lg">
        <p className="mb-1 font-medium text-white">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {formatRupiah(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              {mode === "business" ? "Business Mode" : "Personal Mode"}
            </p>
          </div>
        </div>


        {/* Top Row - 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Assets"
            value={formatRupiah(totalAssets)}
            trend="+5.2%"
            trendUp={true}
            accent="orange"
          />
          <StatCard
            title="Monthly Income"
            value={formatRupiah(financeStats.monthlyIncome)}
            trend={financeStats.monthlyIncome > 0 ? "+" + Math.round((financeStats.monthlyIncome / Math.max(financeStats.allTimeIncome, 1)) * 100) + "%" : "0%"}
            trendUp={financeStats.monthlyIncome > 0}
            accent="green"
          />
          <StatCard
            title="Total Expenses"
            value={formatRupiah(financeStats.monthlyExpenses)}
            trend={financeStats.monthlyExpenses > 0 ? "-" + Math.round((financeStats.monthlyExpenses / Math.max(financeStats.allTimeExpenses, 1)) * 100) + "%" : "0%"}
            trendUp={false}
            accent="purple"
          />
          <NetProfitCard
            netProfit={financeStats.monthlyNetProfit}
            grossProfit={financeStats.monthlyGrossProfit}
            isLoading={false}
          />
        </div>

        {/* Middle Row - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart - Income vs Expenses vs Profit (2/3 width) */}
          <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Income vs Expenses vs Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} barGap={4}>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => shortCurrency(v)}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#334155", opacity: 0.3 }} />
                  <Bar
                    dataKey="Income"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="Expenses"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="Profit"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Asset Distribution (1/3 width) */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Asset Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Recent Activity Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No recent transactions</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-slate-800/50">
                    <TableHead className="text-slate-400 font-medium">Date</TableHead>
                    <TableHead className="text-slate-400 font-medium">Type</TableHead>
                    <TableHead className="text-slate-400 font-medium">Amount</TableHead>
                    <TableHead className="text-slate-400 font-medium text-right">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="text-slate-300 text-sm">{formatDate(tx.date)}</TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {incomeTypes.has(tx.type) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 text-xs font-medium">
                            {formatTransactionType(tx.type)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">{formatTransactionType(tx.type)}</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-sm font-medium ${incomeTypes.has(tx.type) ? "text-orange-500" : "text-slate-300"}`}>
                        {formatRupiah(tx.amount)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm text-right truncate max-w-[200px]">
                        {tx.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */
function StatCard({
  title,
  value,
  trend,
  trendUp,
  accent,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  accent: "orange" | "blue" | "green" | "purple";
}) {
  const accentColors = {
    orange: "text-orange-500",
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
  };

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <div className={`flex items-center gap-1 text-xs ${trendUp ? "text-green-500" : "text-red-500"}`}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trend}</span>
          </div>
        </div>
        <p className={`text-2xl font-bold ${accentColors[accent]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function NetProfitCard({
  netProfit,
  grossProfit,
  isLoading,
}: {
  netProfit: number;
  grossProfit: number;
  isLoading: boolean;
}) {
  const isPositive = netProfit >= 0;
  const accentColor = isPositive ? "text-green-500" : "text-red-500";
  const bgColor = isPositive ? "bg-green-500/10" : "bg-red-500/10";
  const borderColor = isPositive ? "border-green-500/30" : "border-red-500/30";

  return (
    <Card className={`bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-400 text-sm font-medium">Estimated Net Profit</p>
          <div className={`flex items-center gap-1 text-xs ${accentColor}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? "Profit" : "Loss"}</span>
          </div>
        </div>
        <p className={`text-2xl font-bold ${accentColor}`}>
          {isLoading ? "Loading..." : formatRupiah(netProfit)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          (Revenue - HPP - Expenses)
        </p>
        <div className={`mt-2 p-2 rounded ${bgColor} border ${borderColor}`}>
          <p className="text-xs text-slate-300">
            Gross: {formatRupiah(grossProfit)}
          </p>
        </div>
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
  if (Math.abs(value) >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(value) >= 1_000) return `Rp ${(value / 1_000).toFixed(1)}rb`;
  return `Rp ${value}`;
}
