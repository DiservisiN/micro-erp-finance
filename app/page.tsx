"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WalletIcon, ArrowRightIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

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
};

/* ---------- chart colors ---------- */
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/* ---------- page ---------- */
export default function Home() {
  const { mode } = useAppContext();
  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    async function loadNeracaData() {
      if (!supabase) {
        setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb: any = supabase;
      const [walletsResult, productsResult, investmentsResult, debtsResult, transactionsResult] =
        await Promise.all([
          sb.from("wallets").select("id, name, balance, type"),
          sb.from("products").select("id, name, cost_price, stock, status"),
          sb.from("investments").select("id, quantity, current_price"),
          sb.from("debts").select("id, type, status, amount"),
          sb.from("transactions").select("id, type, amount, admin_fee, date").order("date", { ascending: false }).limit(200),
        ]);

      if (
        walletsResult.error ||
        productsResult.error ||
        investmentsResult.error ||
        debtsResult.error
      ) {
        setErrorMessage(
          walletsResult.error?.message ??
            productsResult.error?.message ??
            investmentsResult.error?.message ??
            debtsResult.error?.message ??
            "Failed to load dashboard data.",
        );
        setIsLoading(false);
        return;
      }

      setWallets((walletsResult.data ?? []) as WalletRow[]);
      setProducts((productsResult.data ?? []) as ProductRow[]);
      setInvestments((investmentsResult.data ?? []) as InvestmentRow[]);
      setDebts((debtsResult.data ?? []) as DebtRow[]);
      setTransactions((transactionsResult.data ?? []) as TransactionRow[]);
      setErrorMessage(null);
      setIsLoading(false);
    }

    loadNeracaData();
  }, [supabase]);

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

  /* ---------- bar chart data (Income vs Expenses) ---------- */
  const barData = useMemo(() => {
    // Aggregate last 6 months from transaction data
    const monthMap = new Map<string, { income: number; expenses: number }>();

    // Income transaction types
    const incomeTypes = new Set([
      "physical_sale",
      "electronic_service",
      "digital_ppob",
      "affiliate_passive_income",
      "internet_sharing_biznet",
    ]);
    // Expense transaction types
    const expenseTypes = new Set([
      "money_transfer_or_cash_withdrawal",
      "expense",
      "purchase",
    ]);

    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) ?? { income: 0, expenses: 0 };

      const amount = safeNumber(tx.amount);
      const adminFee = safeNumber(tx.admin_fee ?? 0);

      if (incomeTypes.has(tx.type)) {
        entry.income += amount;
      } else if (expenseTypes.has(tx.type)) {
        entry.expenses += amount + adminFee;
      } else {
        // Treat transfers as expenses (outflow)
        entry.expenses += amount;
      }

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
        },
      ];
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return last6.map((key) => {
      const entry = monthMap.get(key)!;
      const monthIdx = parseInt(key.split("-")[1], 10) - 1;
      return {
        month: monthNames[monthIdx],
        Income: Math.round(entry.income * 100) / 100,
        Expenses: Math.round(entry.expenses * 100) / 100,
      };
    });
  }, [transactions]);

  /* ---------- custom tooltip for pie ---------- */
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-muted-foreground">{formatRupiah(payload[0].value)}</p>
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
      <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
        <p className="mb-1 font-medium">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {formatRupiah(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Neraca Dashboard</h2>
        <p className="text-muted-foreground">
          {mode === "business"
            ? "Business mode: assets include business liquid assets + inventory + receivables."
            : "Personal mode: assets include personal liquid assets + investments + receivables."}
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {/* Metric cards row */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Assets (Aktiva)"
          description="Mode-based assets + receivables"
          value={isLoading ? "Loading..." : formatRupiah(totalAssets)}
          accentColor="var(--chart-1)"
        />
        <MetricCard
          title="Liabilities (Pasiva)"
          description="Unpaid payable debts (hutang usaha)"
          value={isLoading ? "Loading..." : formatRupiah(liabilities)}
          accentColor="var(--chart-4)"
        />
        <MetricCard
          title="Net Worth (Ekuitas)"
          description="Combined assets – liabilities"
          value={isLoading ? "Loading..." : formatRupiah(netWorth)}
          accentColor="var(--chart-3)"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie Chart – Asset Distribution */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--chart-1)" }} />
              Asset Distribution
            </CardTitle>
            <CardDescription>
              {mode === "business"
                ? "Liquid Cash vs Inventory vs Receivables"
                : "Liquid Cash vs Investments vs Receivables"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="var(--card)"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={10}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart – Income vs Expenses */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--chart-2)" }} />
              Income vs Expenses
            </CardTitle>
            <CardDescription>Monthly income and expenses from recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => shortCurrency(v)}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="Income"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="Expenses"
                    fill="var(--chart-4)"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Digital Wallets Panel */}
      <Card className="border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Digital Wallets / Accounts</CardTitle>
            <CardDescription>Compact overview of all active wallet balances.</CardDescription>
          </div>
          <Link href="/investments" className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors">
            Manage Wallets <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {wallets.map((wallet) => (
              <div 
                key={wallet.id} 
                className="flex items-center justify-between p-3 rounded-md bg-slate-900 border border-slate-800 transition-all duration-300 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] hover:border-orange-500/50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-slate-800 group-hover:bg-orange-500/10 transition-colors">
                    <WalletIcon className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-wide text-foreground group-hover:text-orange-500 transition-colors">
                      {wallet.name}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      {wallet.type} Wallet
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-sm tracking-tight">
                  {formatRupiah(wallet.balance)}
                </span>
              </div>
            ))}
            {wallets.length === 0 && !isLoading && (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-slate-800 rounded-md">
                No wallets found.
              </div>
            )}
            {isLoading && (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-slate-800 rounded-md">
                Loading wallets...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert Panel */}
      <LowStockPanel products={products} isLoading={isLoading} />

      {/* Assets Breakdown table card */}
      <Card>
        <CardHeader>
          <CardTitle>Assets Breakdown</CardTitle>
          <CardDescription>Calculated sources for current mode and combined equity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <p className="text-sm">
            Liquid Assets ({mode}): <span className="font-semibold">{formatRupiah(modeLiquidAssets)}</span>
          </p>
          <p className="text-sm">
            {mode === "business" ? "Inventory Asset" : "Investment Asset"}:{" "}
            <span className="font-semibold">{formatRupiah(modeSpecificAsset)}</span>
          </p>
          <p className="text-sm">
            Receivables (Piutang): <span className="font-semibold">{formatRupiah(receivables)}</span>
          </p>
          <p className="text-sm flex items-center gap-2">
            Inventory in Transit:{" "}
            <span className="font-semibold">{formatRupiah(inventoryInTransit)}</span>
            {inventoryInTransit > 0 && (
              <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.4)]">
                On The Way
              </span>
            )}
          </p>
          <p className="text-sm">
            Combined Assets (All Modules): <span className="font-semibold">{formatRupiah(combinedAssets)}</span>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

/* ---------- sub-components ---------- */
function MetricCard({
  title,
  description,
  value,
  accentColor,
}: {
  title: string;
  description: string;
  value: string;
  accentColor?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      {accentColor && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ background: accentColor }}
        />
      )}
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Low Stock Alert ---------- */
const LOW_STOCK_THRESHOLD = 5;

function LowStockPanel({ products, isLoading }: { products: ProductRow[]; isLoading: boolean }) {
  const lowStockItems = useMemo(
    () =>
      products.filter(
        (p) => (p.status ?? "in_stock") === "in_stock" && safeNumber(p.stock) <= LOW_STOCK_THRESHOLD && safeNumber(p.stock) >= 0,
      ).sort((a, b) => safeNumber(a.stock) - safeNumber(b.stock)),
    [products],
  );

  return (
    <Card className="border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            {lowStockItems.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            Low Stock Alert
          </CardTitle>
          <CardDescription>
            Products with stock ≤ {LOW_STOCK_THRESHOLD} units need restocking.
          </CardDescription>
        </div>
        {lowStockItems.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.3)]">
            {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-slate-800 rounded-md">
            Checking stock levels...
          </div>
        ) : lowStockItems.length === 0 ? (
          <div className="flex items-center gap-3 py-6 justify-center text-sm text-green-500 border border-dashed border-green-900/50 bg-green-500/5 rounded-md">
            <CheckCircle2 className="h-5 w-5" />
            All inventory levels are healthy.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {lowStockItems.map((product) => {
              const stockCount = safeNumber(product.stock);
              const isCritical = stockCount <= 2;
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-md bg-slate-900 border border-slate-800 transition-all duration-300 hover:shadow-[0_0_10px_rgba(239,68,68,0.25)] hover:border-red-500/40 group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full transition-colors ${isCritical ? "bg-red-500/15" : "bg-amber-500/15"}`}>
                      <AlertTriangle className={`h-4 w-4 ${isCritical ? "text-red-400 animate-pulse" : "text-amber-500"}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-red-400 transition-colors">
                      {product.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold tabular-nums ${isCritical ? "text-red-400" : "text-amber-500"}`}>
                      {stockCount}
                    </span>
                    <span className="text-[11px] text-slate-500">left</span>
                  </div>
                </div>
              );
            })}
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
  if (Math.abs(value) >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(value) >= 1_000) return `Rp ${(value / 1_000).toFixed(1)}rb`;
  return `Rp ${value}`;
}
