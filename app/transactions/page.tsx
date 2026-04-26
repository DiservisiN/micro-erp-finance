"use client";

import { FormEvent, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Plus, Minus } from "lucide-react";

import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";

type TransactionType =
  | "Physical Sale"
  | "Money Transfer"
  | "Cash Withdrawal"
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

const expenseCategories = [
  "Operational",
  "Supplies",
  "Personnel",
  "Marketing",
  "Transportation",
  "Miscellaneous",
];

const transactionTypes: TransactionType[] = [
  "Physical Sale",
  "Money Transfer",
  "Cash Withdrawal",
  "Electronic Service",
  "Digital PPOB (Pulsa/Game)",
  "Affiliate / Passive Income",
  "Internet Sharing (BIZNET)",
  "Kasbon (Employee Loan)",
];

function TransactionsForm() {
  const searchParams = useSearchParams();
  const [transactionType, setTransactionType] = useState<TransactionType>(
    (searchParams.get("type") as TransactionType) || "Physical Sale"
  );
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
      const [walletResult, productResult] = await Promise.all([
        supabase.from("wallets").select("id, name, type, balance").order("name", { ascending: true }),
        supabase.from("products").select("id, name, selling_price, stock").order("name", { ascending: true }),
      ]);

      if (walletResult.error || productResult.error) {
        setDataError(walletResult.error?.message ?? productResult.error?.message ?? "Failed to load data.");
        setIsLoadingData(false);
        return;
      }

      setWallets((walletResult.data ?? []) as Wallet[]);
      setProducts((productResult.data ?? []) as Product[]);
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
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <p className="text-muted-foreground">Record all ERP income modules with wallet and stock updates.</p>
      </div>

      <form className="space-y-4 rounded-xl border p-4 md:p-6" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="transaction-type">Transaction Type</Label>
          <select
            id="transaction-type"
            value={transactionType}
            onChange={(e) => setTransactionType((e.target.value as TransactionType) || "Physical Sale")}
            className="flex h-10 w-full md:w-72 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Product</Label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={isLoadingData}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} />
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

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" />
        </div>

        {dataError ? <p className="text-sm text-destructive">{dataError}</p> : null}

        <Button type="submit" disabled={isSubmitting || isLoadingData}>
          {isSubmitting ? "Saving..." : "Save Transaction"}
        </Button>
      </form>
    </section>
  );
}

function safeNumber(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function ExpensesComponent() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Form state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
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
    async function loadData() {
      if (!supabase) {
        setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const [walletResult, expenseResult] = await Promise.all([
        supabase.from("wallets").select("id, name, type, balance").order("name", { ascending: true }),
        supabase
          .from("transactions")
          .select("id, date, amount, notes, expense_category, from_wallet_id")
          .eq("type", "expense")
          .order("date", { ascending: false })
          .limit(50),
      ]);

      if (walletResult.error) {
        setErrorMessage(walletResult.error.message);
        setIsLoading(false);
        return;
      }

      setWallets((walletResult.data ?? []) as Wallet[]);

      if (expenseResult.error) {
        setErrorMessage(expenseResult.error.message);
        setIsLoading(false);
        return;
      }

      // Join with wallet names
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
      setErrorMessage(null);
      setIsLoading(false);
    }

    loadData();
  }, [supabase]);

  const loadExpenses = async () => {
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, amount, notes, expense_category, from_wallet_id")
      .eq("type", "expense")
      .order("date", { ascending: false })
      .limit(50);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const expenseData = (data ?? []) as any[];
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
  };

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    if (!expenseWalletId || !expenseAmount || !expenseCategory) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    const selectedWallet = wallets.find((wallet) => wallet.id === expenseWalletId);
    if (!selectedWallet) {
      toast.error("Invalid wallet selected");
      setIsSubmitting(false);
      return;
    }

    const parsedAmount = Number(expenseAmount);
    if (parsedAmount <= 0) {
      toast.error("Amount must be greater than zero");
      setIsSubmitting(false);
      return;
    }

    if (safeNumber(selectedWallet.balance) < parsedAmount) {
      toast.error("Insufficient wallet balance");
      setIsSubmitting(false);
      return;
    }

    // Deduct from wallet balance
    const walletResult = await (supabase as any)
      .from("wallets")
      .update({ balance: safeNumber(selectedWallet.balance) - parsedAmount } as any)
      .eq("id", selectedWallet.id);

    if (walletResult.error) {
      toast.error("Failed to update wallet balance", { description: walletResult.error.message });
      setIsSubmitting(false);
      return;
    }

    // Insert expense transaction
    const transactionResult = await (supabase as any)
      .from("transactions")
      .insert({
        date: new Date(expenseDate).toISOString(),
        type: "expense",
        amount: parsedAmount,
        from_wallet_id: selectedWallet.id,
        expense_category: expenseCategory,
        notes: expenseDescription.trim() || null,
      } as any);

    if (transactionResult.error) {
      toast.error("Failed to record expense", { description: transactionResult.error.message });
      setIsSubmitting(false);
      return;
    }

    toast.success("Expense recorded successfully");
    setIsSubmitting(false);
    setIsAddExpenseOpen(false);
    
    // Reset form
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseCategory("");
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseWalletId("");

    // Reload data
    await loadData();
  }

  async function loadData() {
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [walletResult, expenseResult] = await Promise.all([
      supabase.from("wallets").select("id, name, type, balance").order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select("id, date, amount, notes, expense_category, from_wallet_id")
        .eq("type", "expense")
        .order("date", { ascending: false })
        .limit(50),
    ]);

    if (walletResult.error) {
      setErrorMessage(walletResult.error.message);
      setIsLoading(false);
      return;
    }

    setWallets((walletResult.data ?? []) as Wallet[]);

    if (expenseResult.error) {
      setErrorMessage(expenseResult.error.message);
      setIsLoading(false);
      return;
    }

    const expenseData = (expenseResult.data ?? []) as any[];
    const expensesWithWalletNames = expenseData.map((expense) => {
      const wallet = (walletResult.data ?? []).find((w: any) => w.id === expense.from_wallet_id);
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
    setErrorMessage(null);
    setIsLoading(false);
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Expenses (Kas Keluar)</h2>
        <p className="text-muted-foreground">Record and track business expenses with automatic wallet balance deduction.</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Latest 50 expense transactions</CardDescription>
            </div>
            <Button
              onClick={() => setIsAddExpenseOpen(true)}
              className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading expenses...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No expenses recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        {expense.expense_category || "Uncategorized"}
                      </span>
                    </TableCell>
                    <TableCell>{expense.wallet_name}</TableCell>
                    <TableCell className="text-right text-red-500 font-medium">
                      -{formatRupiah(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-orange-500" />
              Add New Expense
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount *</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg font-medium"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-description">Description</Label>
              <Input
                id="expense-description"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="e.g. Office supplies purchase"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-category">Category *</Label>
              <select
                id="expense-category"
                required
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select category</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-date">Date *</Label>
              <Input
                id="expense-date"
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-wallet">Select Wallet *</Label>
              <select
                id="expense-wallet"
                required
                value={expenseWalletId}
                onChange={(e) => setExpenseWalletId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                onClick={() => setIsAddExpenseOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all"
              >
                {isSubmitting ? "Recording..." : "Record Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground p-6">Loading transactions module...</p>}>
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="income">Income Transactions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses (Kas Keluar)</TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <TransactionsForm />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesComponent />
        </TabsContent>
      </Tabs>
    </Suspense>
  );
}
