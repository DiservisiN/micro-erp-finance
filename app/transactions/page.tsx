"use client";

import { FormEvent, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Minus, ArrowRightLeft } from "lucide-react";

import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";

type TransactionType =
  | "Physical Sale"
  | "Money Transfer"
  | "Cash Withdrawal"
  | "Balance Transfer"
  | "Electronic Service"
  | "Digital PPOB (Pulsa/Game)"
  | "Affiliate / Passive Income"
  | "Internet Sharing (BIZNET)"
  | "Kasbon (Employee Loan)";

type Wallet = {
  id: string;
  name: string;
  type: "business" | "personal";
  balance: number | string;
};

type Product = {
  id: string;
  name: string;
  selling_price: number | string;
  stock: number;
  status?: string;
};

type Expense = {
  id: string;
  date: string;
  amount: number;
  description: string;
  expense_category: string | null;
  from_wallet_id: string;
  wallet_name: string;
};


const transactionTypes: TransactionType[] = [
  "Physical Sale",
  "Money Transfer",
  "Cash Withdrawal",
  "Balance Transfer",
  "Electronic Service",
  "Digital PPOB (Pulsa/Game)",
  "Affiliate / Passive Income",
  "Internet Sharing (BIZNET)",
  "Kasbon (Employee Loan)",
];

function TransactionsForm({ onSuccess }: { onSuccess: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactionType, setTransactionType] = useState<TransactionType>(
    (searchParams.get("type") as TransactionType) || "Physical Sale"
  );
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [destinationWalletId, setDestinationWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [adminFee, setAdminFee] = useState("0");
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [serviceFee, setServiceFee] = useState(searchParams.get("fee") || "");
  const [sparepartProductId, setSparepartProductId] = useState("");
  const [ppobProductName, setPpobProductName] = useState("");
  const [ppobCost, setPpobCost] = useState("");
  const [ppobSellingPrice, setPpobSellingPrice] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [internetAmount, setInternetAmount] = useState("");
  const [notes, setNotes] = useState(searchParams.get("notes") || "");
  const [employeeName, setEmployeeName] = useState("");

  // Balance Transfer states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferFromWallet, setTransferFromWallet] = useState("");
  const [transferToWallet, setTransferToWallet] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Kasbon states
  const [paymentMethod, setPaymentMethod] = useState<"lunas" | "kasbon">(
    (searchParams.get("paymentMethod") as "lunas" | "kasbon") || "lunas"
  );
  const [personName, setPersonName] = useState("");

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setDataError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      const [walletResult, productResult, categoryResult] = await Promise.all([
        supabase.from("wallets").select("id, name, type, balance").order("name", { ascending: true }),
        supabase.from("products").select("id, name, selling_price, stock, status").order("name", { ascending: true }),
        supabase.from("categories").select("id, name").eq("type", "expense").order("name", { ascending: true }),
      ]);

      if (walletResult.error || productResult.error || categoryResult.error) {
        setDataError(walletResult.error?.message ?? productResult.error?.message ?? categoryResult.error?.message ?? "Failed to load data.");
        setIsLoadingData(false);
        return;
      }

      setWallets((walletResult.data ?? []) as Wallet[]);
      // Filter products to only show 'in_stock' items for sales
      const allProducts = (productResult.data ?? []) as Product[];
      setProducts(allProducts.filter((p) => (p.status ?? "in_stock") === "in_stock"));
      setCategories((categoryResult.data ?? []) as { id: string; name: string }[]);
      setDataError(null);
      setIsLoadingData(false);
    }

    loadData();
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    if (isLoadingData) {
      toast.info("Please wait until wallets and products finish loading.");
      return;
    }

    setIsSubmitting(true);

    const selectedSourceWallet = wallets.find((wallet) => wallet.id === sourceWalletId);
    const selectedDestinationWallet = wallets.find((wallet) => wallet.id === destinationWalletId);
    const selectedProduct = products.find((product) => product.id === productId);
    const selectedSparepart = products.find((product) => product.id === sparepartProductId);

    const parsedAmount = Number(amount || "0");
    const parsedAdminFee = Number(adminFee || "0");
    const parsedQuantity = Number(quantity || "0");
    const parsedServiceFee = Number(serviceFee || "0");
    const parsedPpobCost = Number(ppobCost || "0");
    const parsedPpobSelling = Number(ppobSellingPrice || "0");
    const parsedCommission = Number(commissionAmount || "0");
    const parsedInternetAmount = Number(internetAmount || "0");

    const fail = (message: string) => {
      toast.error("Transaction failed", { description: message });
      setIsSubmitting(false);
    };

    const updateWalletBalance = async (wallet: Wallet, nextBalance: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (supabase as any).from("wallets").update({ balance: nextBalance } as any).eq("id", wallet.id);
    };

    const updateProductStock = async (product: Product, nextStock: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (supabase as any).from("products").update({ stock: nextStock } as any).eq("id", product.id);
    };

    const logTransaction = async (payload: {
      type: string;
      amount: number;
      admin_fee?: number;
      from_wallet_id?: string | null;
      to_wallet_id?: string | null;
      product_id?: string | null;
      quantity?: number;
      notes?: string | null;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (supabase as any).from("transactions").insert({ date: new Date().toISOString(), ...payload } as any);
    };

    const insertDebt = async (debtAmount: number, description: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (supabase as any).from("debts").insert({
        person_name: personName.trim(),
        amount: debtAmount,
        type: "receivable",
        status: "unpaid",
        notes: notes || description,
      });
    };

    if (transactionType === "Physical Sale") {
      if (!selectedProduct || (paymentMethod === "lunas" && !selectedDestinationWallet) || parsedQuantity <= 0) {
        return fail("Product, quantity, and destination wallet are required.");
      }
      if (paymentMethod === "kasbon" && !personName.trim()) {
        return fail("Customer Name is required for Kasbon.");
      }
      if (selectedProduct.stock < parsedQuantity) {
        return fail("Insufficient product stock.");
      }
      // Safety check: Prevent selling 'On the Way' items
      if ((selectedProduct.status ?? "in_stock") !== "in_stock") {
        return fail("Product is still in transit and cannot be sold yet.");
      }

      const saleAmount = safeNumber(selectedProduct.selling_price) * parsedQuantity;
      const stockResult = await updateProductStock(selectedProduct, selectedProduct.stock - parsedQuantity);
      if (stockResult.error) {
        return fail(stockResult.error.message);
      }

      if (paymentMethod === "lunas") {
        const walletResult = await updateWalletBalance(
          selectedDestinationWallet!,
          safeNumber(selectedDestinationWallet!.balance) + saleAmount,
        );
        if (walletResult.error) return fail(walletResult.error.message);
      } else {
        const debtResult = await insertDebt(saleAmount, `From transaction: Physical sale (${parsedQuantity}x ${selectedProduct.name})`);
        if (debtResult.error) return fail(debtResult.error.message);
      }

      const logResult = await logTransaction({
        type: "physical_sale",
        amount: saleAmount,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        product_id: selectedProduct.id,
        quantity: parsedQuantity,
        notes: notes || `Physical sale (${parsedQuantity}x ${selectedProduct.name})`,
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Money Transfer") {
      if (!selectedSourceWallet || !selectedDestinationWallet || parsedAmount <= 0 || parsedAdminFee < 0) {
        return fail("Amount, admin fee, source wallet, and destination wallet are required.");
      }
      if (selectedSourceWallet.id === selectedDestinationWallet.id) {
        return fail("Source and destination wallet must be different.");
      }
      if (safeNumber(selectedSourceWallet.balance) < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Deduct from source wallet (Digital)
      const sourceResult = await updateWalletBalance(
        selectedSourceWallet,
        safeNumber(selectedSourceWallet.balance) - parsedAmount,
      );
      if (sourceResult.error) return fail(sourceResult.error.message);

      // Add to destination wallet (usually Cash) if Lunas, or record as debt if Kasbon
      if (paymentMethod === "lunas") {
        const destinationResult = await updateWalletBalance(
          selectedDestinationWallet,
          safeNumber(selectedDestinationWallet.balance) + parsedAmount + parsedAdminFee,
        );
        if (destinationResult.error) return fail(destinationResult.error.message);
      } else {
        const debtResult = await insertDebt(parsedAmount + parsedAdminFee, "Money Transfer");
        if (debtResult.error) return fail(debtResult.error.message);
      }

      const logResult = await logTransaction({
        type: "money_transfer",
        amount: parsedAmount,
        admin_fee: parsedAdminFee,
        from_wallet_id: selectedSourceWallet.id,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet.id : null,
        notes: notes || "Money transfer",
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Cash Withdrawal") {
      if (!selectedSourceWallet || !selectedDestinationWallet || parsedAmount <= 0 || parsedAdminFee < 0) {
        return fail("Amount, admin fee, source wallet, and destination wallet are required.");
      }
      if (selectedSourceWallet.id === selectedDestinationWallet.id) {
        return fail("Source and destination wallet must be different.");
      }
      if (safeNumber(selectedSourceWallet.balance) < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Deduct from source wallet (usually Cash)
      const sourceResult = await updateWalletBalance(
        selectedSourceWallet,
        safeNumber(selectedSourceWallet.balance) - parsedAmount,
      );
      if (sourceResult.error) return fail(sourceResult.error.message);

      // Add to destination wallet (Digital) if Lunas, or record as debt if Kasbon
      if (paymentMethod === "lunas") {
        const destinationResult = await updateWalletBalance(
          selectedDestinationWallet,
          safeNumber(selectedDestinationWallet.balance) + parsedAmount + parsedAdminFee,
        );
        if (destinationResult.error) return fail(destinationResult.error.message);
      } else {
        const debtResult = await insertDebt(parsedAmount + parsedAdminFee, "Cash Withdrawal");
        if (debtResult.error) return fail(debtResult.error.message);
      }

      const logResult = await logTransaction({
        type: "cash_withdrawal",
        amount: parsedAmount,
        admin_fee: parsedAdminFee,
        from_wallet_id: selectedSourceWallet.id,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet.id : null,
        notes: notes || "Cash withdrawal",
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Balance Transfer") {
      if (!selectedSourceWallet || !selectedDestinationWallet || parsedAmount <= 0) {
        return fail("Amount, source wallet, and destination wallet are required.");
      }
      if (selectedSourceWallet.id === selectedDestinationWallet.id) {
        return fail("Source and destination wallet must be different.");
      }
      if (safeNumber(selectedSourceWallet.balance) < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Deduct from source wallet
      const sourceResult = await updateWalletBalance(
        selectedSourceWallet,
        safeNumber(selectedSourceWallet.balance) - parsedAmount,
      );
      if (sourceResult.error) return fail(sourceResult.error.message);

      // Add to destination wallet
      const destinationResult = await updateWalletBalance(
        selectedDestinationWallet,
        safeNumber(selectedDestinationWallet.balance) + parsedAmount,
      );
      if (destinationResult.error) return fail(destinationResult.error.message);

      // Log balance transfer transaction
      const logResult = await logTransaction({
        type: "balance_transfer",
        amount: parsedAmount,
        from_wallet_id: selectedSourceWallet.id,
        to_wallet_id: selectedDestinationWallet.id,
        notes: notes || "Balance transfer",
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Electronic Service") {
      if ((paymentMethod === "lunas" && !selectedDestinationWallet) || parsedServiceFee < 0) {
        return fail("Service fee and destination wallet are required.");
      }
      if (paymentMethod === "kasbon" && !personName.trim()) {
        return fail("Customer Name is required for Kasbon.");
      }

      let totalIncome = parsedServiceFee;
      if (selectedSparepart) {
        if (selectedSparepart.stock < 1) {
          return fail("Selected sparepart is out of stock.");
        }
        const stockResult = await updateProductStock(selectedSparepart, selectedSparepart.stock - 1);
        if (stockResult.error) return fail(stockResult.error.message);
        totalIncome += safeNumber(selectedSparepart.selling_price);
      }

      if (paymentMethod === "lunas") {
        const walletResult = await updateWalletBalance(
          selectedDestinationWallet!,
          safeNumber(selectedDestinationWallet!.balance) + totalIncome,
        );
        if (walletResult.error) return fail(walletResult.error.message);
      } else {
        const debtResult = await insertDebt(totalIncome, `From transaction: Electronic service fee` + (selectedSparepart ? ` + sparepart` : ""));
        if (debtResult.error) return fail(debtResult.error.message);
      }

      const logResult = await logTransaction({
        type: "electronic_service",
        amount: totalIncome,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        product_id: selectedSparepart?.id ?? null,
        notes: notes || (selectedSparepart ? `Service fee + sparepart (${selectedSparepart.name})` : "Electronic service fee"),
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Digital PPOB (Pulsa/Game)") {
      if (!selectedSourceWallet || (paymentMethod === "lunas" && !selectedDestinationWallet) || !ppobProductName.trim()) {
        return fail("Product name, source wallet, and destination wallet are required.");
      }
      if (paymentMethod === "kasbon" && !personName.trim()) {
        return fail("Customer Name is required for Kasbon.");
      }
      if (parsedPpobCost <= 0 || parsedPpobSelling <= 0) {
        return fail("Capital and selling price must be greater than zero.");
      }
      if (safeNumber(selectedSourceWallet.balance) < parsedPpobCost) {
        return fail("Insufficient source wallet balance.");
      }

      // Always deduct cost from source wallet
      const sourceResult = await updateWalletBalance(
        selectedSourceWallet,
        safeNumber(selectedSourceWallet.balance) - parsedPpobCost,
      );
      if (sourceResult.error) return fail(sourceResult.error.message);

      if (paymentMethod === "lunas") {
        const destinationResult = await updateWalletBalance(
          selectedDestinationWallet!,
          safeNumber(selectedDestinationWallet!.balance) + parsedPpobSelling,
        );
        if (destinationResult.error) return fail(destinationResult.error.message);
      } else {
        const debtResult = await insertDebt(parsedPpobSelling, `From transaction: PPOB ${ppobProductName.trim()}`);
        if (debtResult.error) return fail(debtResult.error.message);
      }

      const logResult = await logTransaction({
        type: "digital_ppob",
        amount: parsedPpobSelling,
        from_wallet_id: selectedSourceWallet.id,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        notes: notes || `PPOB ${ppobProductName.trim()} (Cost: ${formatRupiah(parsedPpobCost)}, Sell: ${formatRupiah(parsedPpobSelling)})`,
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Affiliate / Passive Income") {
      if ((paymentMethod === "lunas" && !selectedDestinationWallet) || !platformName.trim() || parsedCommission <= 0) {
        return fail("Platform, commission amount, and destination wallet are required.");
      }
      if (paymentMethod === "kasbon" && !personName.trim()) {
        return fail("Customer Name is required for Kasbon.");
      }

      if (paymentMethod === "lunas") {
        const walletResult = await updateWalletBalance(
          selectedDestinationWallet!,
          safeNumber(selectedDestinationWallet!.balance) + parsedCommission,
        );
        if (walletResult.error) return fail(walletResult.error.message);
      } else {
        const debtResult = await insertDebt(parsedCommission, `From transaction: Commission from ${platformName.trim()}`);
        if (debtResult.error) return fail(debtResult.error.message);
      }

      const logResult = await logTransaction({
        type: "affiliate_passive_income",
        amount: parsedCommission,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        notes: notes || `Commission from ${platformName.trim()}`,
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Internet Sharing (BIZNET)") {
      if ((paymentMethod === "lunas" && !selectedDestinationWallet) || !customerName.trim() || parsedInternetAmount <= 0) {
        return fail("Customer name, amount, and destination wallet are required.");
      }
      if (paymentMethod === "kasbon" && !personName.trim()) {
        return fail("Customer Name is required for Kasbon.");
      }

      if (paymentMethod === "lunas") {
        const walletResult = await updateWalletBalance(
          selectedDestinationWallet!,
          safeNumber(selectedDestinationWallet!.balance) + parsedInternetAmount,
        );
        if (walletResult.error) return fail(walletResult.error.message);
      } else {
        const debtResult = await insertDebt(parsedInternetAmount, `From transaction: Internet sharing payment from ${customerName.trim()}`);
        if (debtResult.error) return fail(debtResult.error.message);
      }

      const logResult = await logTransaction({
        type: "internet_sharing_biznet",
        amount: parsedInternetAmount,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        notes: notes || `Internet sharing payment from ${customerName.trim()}`,
      });
      if (logResult.error) return fail(logResult.error.message);

    } else if (transactionType === "Kasbon (Employee Loan)") {
      if (!selectedSourceWallet || !employeeName.trim() || parsedAmount <= 0) {
        return fail("Source wallet, employee name, and amount are required.");
      }
      if (safeNumber(selectedSourceWallet.balance) < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Deduct from source wallet
      const walletResult = await updateWalletBalance(
        selectedSourceWallet,
        safeNumber(selectedSourceWallet.balance) - parsedAmount,
      );
      if (walletResult.error) return fail(walletResult.error.message);

      // Log kasbon transaction
      const kasbonNotes = notes ? `${employeeName.trim()} - ${notes}` : employeeName.trim();
      const logResult = await logTransaction({
        type: "kasbon",
        amount: parsedAmount,
        from_wallet_id: selectedSourceWallet.id,
        notes: kasbonNotes,
      });
      if (logResult.error) return fail(logResult.error.message);
    }

    toast.success("Transaction saved");
    // Refresh the dashboard to update monthly stats
    router.refresh();
    onSuccess();
    setProductId("");
    setQuantity("1");
    setDestinationWalletId("");
    setAmount("");
    setAdminFee("0");
    setSourceWalletId("");
    setServiceFee("");
    setSparepartProductId("");
    setPpobProductName("");
    setPpobCost("");
    setPpobSellingPrice("");
    setPlatformName("");
    setCommissionAmount("");
    setCustomerName("");
    setInternetAmount("");
    setPersonName("");
    setNotes("");
    setPaymentMethod("lunas");
    setEmployeeName("");
    setIsSubmitting(false);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Transactions</h2>
          <p className="text-slate-400 text-sm">Record all ERP income modules with wallet and stock updates.</p>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="transaction-type" className="text-slate-300">Transaction Type</Label>
          <select
            id="transaction-type"
            value={transactionType}
            onChange={(e) => setTransactionType((e.target.value as TransactionType) || "Physical Sale")}
            className="flex h-10 w-full md:w-72 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select transaction type</option>
            {transactionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {transactionType === "Physical Sale" ? (
          <div className="grid gap-4 rounded-lg border border-slate-800/50 bg-slate-800/30 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-slate-300">Product</Label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">{isLoadingData ? "Loading products..." : "Choose product"}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock}, Price: {formatRupiah(product.selling_price)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity" className="text-slate-300">Quantity</Label>
                <Input id="quantity" type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="bg-slate-800/50 border-slate-700 text-white" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-2">
              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="lunas">Lunas (Paid)</option>
                  <option value="kasbon">Kasbon (Unpaid Debt)</option>
                </select>
              </div>

              {paymentMethod === "kasbon" ? (
                <div className="grid gap-2">
                  <Label htmlFor="person-name">Customer Name</Label>
                  <Input id="person-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Required for Kasbon" />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Destination Wallet</Label>
                  <select
                    value={destinationWalletId}
                    onChange={(e) => setDestinationWalletId(e.target.value)}
                    disabled={isLoadingData}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">{isLoadingData ? "Loading wallets..." : "Choose destination wallet"}</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {transactionType === "Money Transfer" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="transfer-amount">Amount</Label>
                <Input id="transfer-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transfer-admin-fee">Admin Fee</Label>
                <Input id="transfer-admin-fee" type="number" min="0" step="0.01" required value={adminFee} onChange={(event) => setAdminFee(event.target.value)} className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="transfer-source-wallet">Sending Wallet (Digital) *</Label>
                <select
                  id="transfer-source-wallet"
                  value={sourceWalletId}
                  onChange={(e) => setSourceWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose sending wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transfer-destination-wallet">Receiving Wallet (Cash) *</Label>
                <select
                  id="transfer-destination-wallet"
                  value={destinationWalletId}
                  onChange={(e) => setDestinationWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose receiving wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="transfer-payment-method">Payment Method</Label>
                <select
                  id="transfer-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="lunas">Lunas (Paid)</option>
                  <option value="kasbon">Kasbon (Unpaid Debt)</option>
                </select>
              </div>
              {paymentMethod === "kasbon" && (
                <div className="grid gap-2">
                  <Label htmlFor="transfer-person-name">Kasbon Name *</Label>
                  <Input id="transfer-person-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Required for Kasbon" className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
                </div>
              )}
            </div>
          </div>
        ) : null}

        {transactionType === "Cash Withdrawal" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="withdrawal-amount">Amount</Label>
                <Input id="withdrawal-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="withdrawal-admin-fee">Admin Fee</Label>
                <Input id="withdrawal-admin-fee" type="number" min="0" step="0.01" required value={adminFee} onChange={(event) => setAdminFee(event.target.value)} className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="withdrawal-source-wallet">Source Wallet (Cash) *</Label>
                <select
                  id="withdrawal-source-wallet"
                  value={sourceWalletId}
                  onChange={(e) => setSourceWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose source wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="withdrawal-destination-wallet">Destination Wallet (Digital) *</Label>
                <select
                  id="withdrawal-destination-wallet"
                  value={destinationWalletId}
                  onChange={(e) => setDestinationWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose destination wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="withdrawal-payment-method">Payment Method</Label>
                <select
                  id="withdrawal-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="lunas">Lunas (Paid)</option>
                  <option value="kasbon">Kasbon (Unpaid Debt)</option>
                </select>
              </div>
              {paymentMethod === "kasbon" && (
                <div className="grid gap-2">
                  <Label htmlFor="withdrawal-person-name">Kasbon Name *</Label>
                  <Input id="withdrawal-person-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Required for Kasbon" className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
                </div>
              )}
            </div>
          </div>
        ) : null}

        {transactionType === "Electronic Service" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="service-fee">Service Fee</Label>
                <Input id="service-fee" type="number" min="0" step="0.01" required value={serviceFee} onChange={(event) => setServiceFee(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Sparepart Used (Optional)</Label>
                <select
                  value={sparepartProductId}
                  onChange={(e) => setSparepartProductId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">No Sparepart</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock}, Price: {formatRupiah(product.selling_price)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-2">
              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="lunas">Lunas (Paid)</option>
                  <option value="kasbon">Kasbon (Unpaid Debt)</option>
                </select>
              </div>

              {paymentMethod === "kasbon" ? (
                <div className="grid gap-2">
                  <Label htmlFor="person-name">Customer Name</Label>
                  <Input id="person-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Required for Kasbon" />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Destination Wallet</Label>
                  <select
                    value={destinationWalletId}
                    onChange={(e) => setDestinationWalletId(e.target.value)}
                    disabled={isLoadingData}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">{isLoadingData ? "Loading wallets..." : "Choose destination wallet"}</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {transactionType === "Digital PPOB (Pulsa/Game)" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="ppob-product-name">Product Name</Label>
                <Input id="ppob-product-name" required value={ppobProductName} onChange={(event) => setPpobProductName(event.target.value)} placeholder="e.g. Pulsa 20K" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ppob-cost">Capital / Cost</Label>
                <Input id="ppob-cost" required type="number" min="0.01" step="0.01" value={ppobCost} onChange={(event) => setPpobCost(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ppob-selling-price">Selling Price</Label>
                <Input id="ppob-selling-price" required type="number" min="0.01" step="0.01" value={ppobSellingPrice} onChange={(event) => setPpobSellingPrice(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-2">
              <div className="grid gap-2">
                <Label>Source Wallet (Capital)</Label>
                <select
                  value={sourceWalletId}
                  onChange={(e) => setSourceWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose source wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="lunas">Lunas (Paid)</option>
                  <option value="kasbon">Kasbon (Unpaid Debt)</option>
                </select>
              </div>

              {paymentMethod === "kasbon" ? (
                <div className="grid gap-2">
                  <Label htmlFor="person-name">Customer Name</Label>
                  <Input id="person-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Required for Kasbon" />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Destination Wallet (Income)</Label>
                  <select
                    value={destinationWalletId}
                    onChange={(e) => setDestinationWalletId(e.target.value)}
                    disabled={isLoadingData}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">{isLoadingData ? "Loading wallets..." : "Choose destination wallet"}</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {transactionType === "Affiliate / Passive Income" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input id="platform-name" required value={platformName} onChange={(event) => setPlatformName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commission-amount">Commission Amount</Label>
                <Input id="commission-amount" required type="number" min="0.01" step="0.01" value={commissionAmount} onChange={(event) => setCommissionAmount(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-2">
              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="lunas">Lunas (Paid)</option>
                  <option value="kasbon">Kasbon (Unpaid Debt)</option>
                </select>
              </div>

              {paymentMethod === "kasbon" ? (
                <div className="grid gap-2">
                  <Label htmlFor="person-name">Customer Name</Label>
                  <Input id="person-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Required for Kasbon" />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Destination Wallet</Label>
                  <select
                    value={destinationWalletId}
                    onChange={(e) => setDestinationWalletId(e.target.value)}
                    disabled={isLoadingData}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">{isLoadingData ? "Loading wallets..." : "Choose destination wallet"}</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {transactionType === "Internet Sharing (BIZNET)" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input id="customer-name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="internet-amount">Amount</Label>
                <Input id="internet-amount" required type="number" min="0.01" step="0.01" value={internetAmount} onChange={(event) => setInternetAmount(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-2">
              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="lunas">Lunas (Paid)</option>
                  <option value="kasbon">Kasbon (Unpaid Debt)</option>
                </select>
              </div>

              {paymentMethod === "kasbon" ? (
                <div className="grid gap-2">
                  <Label htmlFor="person-name">Kasbon Name</Label>
                  <Input id="person-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Required for Kasbon" />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Destination Wallet</Label>
                  <select
                    value={destinationWalletId}
                    onChange={(e) => setDestinationWalletId(e.target.value)}
                    disabled={isLoadingData}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">{isLoadingData ? "Loading wallets..." : "Choose destination wallet"}</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {transactionType === "Kasbon (Employee Loan)" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="kasbon-source-wallet">Source Wallet *</Label>
                <select
                  id="kasbon-source-wallet"
                  value={sourceWalletId}
                  onChange={(e) => setSourceWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose source wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kasbon-amount">Amount *</Label>
                <Input
                  id="kasbon-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kasbon-employee-name">Employee / Borrower Name *</Label>
              <Input
                id="kasbon-employee-name"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. John Doe"
                className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              />
            </div>
          </div>
        ) : null}

        {transactionType === "Balance Transfer" ? (
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="balance-transfer-source">From Wallet *</Label>
                <select
                  id="balance-transfer-source"
                  value={sourceWalletId}
                  onChange={(e) => setSourceWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose source wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="balance-transfer-destination">To Wallet *</Label>
                <select
                  id="balance-transfer-destination"
                  value={destinationWalletId}
                  onChange={(e) => setDestinationWalletId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">{isLoadingData ? "Loading wallets..." : "Choose destination wallet"}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="balance-transfer-amount">Amount *</Label>
              <Input
                id="balance-transfer-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="notes" className="text-slate-300">Notes</Label>
          <Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" />
        </div>

        {dataError ? <p className="text-sm text-destructive">{dataError}</p> : null}

        <Button type="submit" disabled={isSubmitting || isLoadingData} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
          {isSubmitting ? "Saving..." : "Save Transaction"}
        </Button>
      </form>
      </div>

      {/* Balance Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Balance Transfer</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) {
                toast.error("Supabase is not configured.");
                return;
              }

              const fromWallet = wallets.find((w) => w.id === transferFromWallet);
              const toWallet = wallets.find((w) => w.id === transferToWallet);
              const parsedAmount = Number(transferAmount || "0");

              if (!fromWallet || !toWallet) {
                toast.error("Please select both source and destination wallets.");
                return;
              }
              if (fromWallet.id === toWallet.id) {
                toast.error("Source and destination wallet must be different.");
                return;
              }
              if (parsedAmount <= 0) {
                toast.error("Amount must be greater than 0.");
                return;
              }
              if (safeNumber(fromWallet.balance) < parsedAmount) {
                toast.error("Insufficient source wallet balance.");
                return;
              }

              setIsTransferring(true);

              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sb: any = supabase;

                // Decrement source wallet
                const sourceResult = await sb
                  .from("wallets")
                  .update({ balance: safeNumber(fromWallet.balance) - parsedAmount } as any)
                  .eq("id", fromWallet.id);

                if (sourceResult.error) {
                  toast.error("Failed to update source wallet", { description: sourceResult.error.message });
                  setIsTransferring(false);
                  return;
                }

                // Increment destination wallet
                const destResult = await sb
                  .from("wallets")
                  .update({ balance: safeNumber(toWallet.balance) + parsedAmount } as any)
                  .eq("id", toWallet.id);

                if (destResult.error) {
                  toast.error("Failed to update destination wallet", { description: destResult.error.message });
                  setIsTransferring(false);
                  return;
                }

                // Log transaction
                const logResult = await sb.from("transactions").insert({
                  date: transferDate,
                  type: "balance_transfer",
                  amount: parsedAmount,
                  from_wallet_id: fromWallet.id,
                  to_wallet_id: toWallet.id,
                  notes: transferNotes || "Balance transfer",
                } as any);

                if (logResult.error) {
                  toast.error("Failed to log transaction", { description: logResult.error.message });
                  setIsTransferring(false);
                  return;
                }

                toast.success("Balance transferred successfully");
                setIsTransferDialogOpen(false);
                setTransferFromWallet("");
                setTransferToWallet("");
                setTransferAmount("");
                setTransferNotes("");
                setTransferDate(new Date().toISOString().split('T')[0]);

                // Reload wallets data
                const [newWalletResult] = await Promise.all([
                  supabase.from("wallets").select("id, name, type, balance").order("name", { ascending: true }),
                ]);
                if (!newWalletResult.error) {
                  setWallets(newWalletResult.data as Wallet[]);
                }
              } catch (error) {
                toast.error("Transfer failed", { description: error instanceof Error ? error.message : "Unknown error" });
              } finally {
                setIsTransferring(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="transfer-from">From Wallet</Label>
              <select
                id="transfer-from"
                value={transferFromWallet}
                onChange={(e) => setTransferFromWallet(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <option value="">Select source wallet</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-to">To Wallet</Label>
              <select
                id="transfer-to"
                value={transferToWallet}
                onChange={(e) => setTransferToWallet(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <option value="">Select destination wallet</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input
                id="transfer-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-date">Date</Label>
              <Input
                id="transfer-date"
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-notes">Notes</Label>
              <Input
                id="transfer-notes"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Optional note"
                className="bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferDialogOpen(false)}
                disabled={isTransferring}
                className="border-slate-700 text-white hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isTransferring}
                className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all"
              >
                {isTransferring ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Balance Button */}
      <Button
        onClick={() => setIsTransferDialogOpen(true)}
        className="fixed bottom-6 right-6 bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all z-50"
        size="lg"
      >
        <ArrowRightLeft className="mr-2 h-5 w-5" />
        Transfer Balance
      </Button>
    </section>
  );
}

function safeNumber(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function ExpensesForm({ wallets, onSuccess }: { wallets: Wallet[]; onSuccess: () => void }) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseWalletId, setExpenseWalletId] = useState("");

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    async function loadCategories() {
      if (!supabase) return;
      const { data, error } = await supabase.from("categories").select("id, name").eq("type", "expense").order("name", { ascending: true });
      if (!error) {
        setCategories((data ?? []) as { id: string; name: string }[]);
      }
    }
    loadCategories();
  }, [supabase]);

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    setIsSubmitting(true);
    const parsedAmount = Number(expenseAmount);

    if (parsedAmount <= 0) {
      toast.error("Amount must be greater than 0.");
      setIsSubmitting(false);
      return;
    }

    const selectedWallet = wallets.find((wallet) => wallet.id === expenseWalletId);
    if (!selectedWallet) {
      toast.error("Please select a wallet.");
      setIsSubmitting(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Deduct from wallet
    const walletResult = await sb.from("wallets").update({ balance: safeNumber(selectedWallet.balance) - parsedAmount } as any).eq("id", selectedWallet.id);

    if (walletResult.error) {
      toast.error("Failed to update wallet", { description: walletResult.error.message });
      setIsSubmitting(false);
      return;
    }

    // Log expense transaction
    const logResult = await sb.from("transactions").insert({
      date: expenseDate,
      type: "expense",
      amount: parsedAmount,
      from_wallet_id: selectedWallet.id,
      notes: expenseDescription,
      expense_category: expenseCategory,
    } as any);

    if (logResult.error) {
      toast.error("Failed to log expense", { description: logResult.error.message });
      setIsSubmitting(false);
      return;
    }

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
        <Label htmlFor="expense-amount" className="text-slate-300">Amount *</Label>
        <Input
          id="expense-amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={expenseAmount}
          onChange={(e) => setExpenseAmount(e.target.value)}
          placeholder="0.00"
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-description" className="text-slate-300">Description</Label>
        <Input
          id="expense-description"
          value={expenseDescription}
          onChange={(e) => setExpenseDescription(e.target.value)}
          placeholder="e.g. Office supplies purchase"
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-category" className="text-slate-300">Category *</Label>
        <select
          id="expense-category"
          required
          value={expenseCategory}
          onChange={(e) => setExpenseCategory(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-date" className="text-slate-300">Date *</Label>
        <Input
          id="expense-date"
          type="date"
          required
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="bg-slate-800/50 border-slate-700 text-white"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-wallet" className="text-slate-300">Select Wallet *</Label>
        <select
          id="expense-wallet"
          required
          value={expenseWalletId}
          onChange={(e) => setExpenseWalletId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select wallet</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name} ({wallet.type}) - {formatRupiah(wallet.balance)}
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
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all"
        >
          {isSubmitting ? "Recording..." : "Record Expense"}
        </Button>
      </div>
    </form>
  );
}

function TransactionsDashboard() {
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [incomeTransactions, setIncomeTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const loadData = async () => {
    if (!supabase) {
      setDataError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [walletResult, expenseResult, transactionResult] = await Promise.all([
      supabase.from("wallets").select("id, name, type, balance").order("name", { ascending: true }),
      supabase.from("transactions").select("*").eq("type", "expense").order("date", { ascending: false }).limit(50),
      supabase.from("transactions").select("*").neq("type", "expense").order("date", { ascending: false }).limit(50),
    ]);

    if (walletResult.error || expenseResult.error || transactionResult.error) {
      setDataError(walletResult.error?.message ?? expenseResult.error?.message ?? transactionResult.error?.message ?? "Failed to load data.");
      setIsLoading(false);
      return;
    }

    setWallets((walletResult.data ?? []) as Wallet[]);

    // Process expense transactions
    const expenseData = (expenseResult.data ?? []) as any[];
    const expensesWithWalletNames = expenseData.map((expense) => {
      const wallet = wallets.find((w) => w.id === expense.from_wallet_id);
      return {
        id: expense.id,
        date: expense.date,
        amount: expense.amount,
        description: expense.notes || "",
        expense_category: expense.expense_category,
        from_wallet_id: expense.from_wallet_id,
        wallet_name: wallet?.name || "Unknown",
      } as Expense;
    });

    setExpenses(expensesWithWalletNames);
    setIncomeTransactions(transactionResult.data ?? []);
    setDataError(null);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const currentBalance = wallets.reduce((sum, w) => sum + safeNumber(w.balance), 0);

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

  const handleExpenseSuccess = () => {
    setIsExpenseModalOpen(false);
    loadData();
  };

  const handleIncomeSuccess = () => {
    setIsIncomeModalOpen(false);
    loadData();
  };

  return (
    <div className="flex flex-col w-full gap-6 bg-[#020617] min-h-screen p-6">
      {/* 1. HEADER WITH ADD BUTTONS (FULL WIDTH) */}
      <div className="w-full flex items-center justify-between bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Transactions</h2>
          <p className="text-slate-400 text-sm">View and manage all income and expense transactions.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsIncomeModalOpen(true)} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* 2. STATS BAR (FULL WIDTH) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm">Total Income</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm">Total Expense</p>
          <p className="text-3xl font-bold text-red-400 font-mono">{formatRupiah(totalExpense)}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm">Current Balance</p>
          <p className="text-3xl font-bold text-white font-mono">{formatRupiah(currentBalance)}</p>
        </div>
      </div>

      {dataError && <p className="text-sm text-destructive">{dataError}</p>}

      {/* 3. MAIN DATA & TABLES (FULL WIDTH) */}
      <div className="w-full flex flex-col gap-6">
        {/* Income Table */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Income Transactions</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800/50">
              <TableHead className="text-slate-300">Date</TableHead>
              <TableHead className="text-slate-300">Description</TableHead>
              <TableHead className="text-slate-300">Category</TableHead>
              <TableHead className="text-slate-300">Wallet</TableHead>
              <TableHead className="text-right text-slate-300">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : incomeTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No income transactions recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              incomeTransactions.map((transaction) => {
                const wallet = wallets.find(w => w.id === transaction.to_wallet_id);
                return (
                  <TableRow key={transaction.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <TableCell className="text-slate-300">{formatDate(transaction.date)}</TableCell>
                    <TableCell className="text-slate-300">{transaction.notes || "-"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {getCategoryLabel(transaction.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300">{wallet?.name || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-400 font-semibold">
                      +{formatRupiah(transaction.amount)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

        {/* Expenses Table */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Expense Transactions</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800/50">
              <TableHead className="text-slate-300">Date</TableHead>
              <TableHead className="text-slate-300">Description</TableHead>
              <TableHead className="text-slate-300">Category</TableHead>
              <TableHead className="text-slate-300">Wallet</TableHead>
              <TableHead className="text-right text-slate-300">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  Loading expenses...
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No expense transactions recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <TableCell className="text-slate-300">{formatDate(expense.date)}</TableCell>
                  <TableCell className="text-slate-300">{expense.description || "-"}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      {expense.expense_category || "Uncategorized"}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300">{expense.wallet_name}</TableCell>
                  <TableCell className="text-right font-mono text-red-400 font-semibold">
                    -{formatRupiah(expense.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>

      {/* Add Income Modal */}
      <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Add Income Transaction</DialogTitle>
          </DialogHeader>
          <TransactionsForm onSuccess={handleIncomeSuccess} />
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Expense</DialogTitle>
          </DialogHeader>
          <ExpensesForm wallets={wallets} onSuccess={handleExpenseSuccess} />
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
