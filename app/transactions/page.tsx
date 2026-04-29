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
import { Plus, Minus, ArrowRightLeft, Search, CalendarDays, Pencil, Trash2, Receipt, FolderOpen } from "lucide-react";

import { useFinanceContext } from "@/context/FinanceContext";
import { formatRupiah } from "@/lib/utils";

// Transaction type from FinanceContext
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
  walletType: string;
  balance: number;
};

type Product = {
  id: string;
  name: string;
  selling_price: number;
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

function TransactionsForm({ onSuccess, editingTransaction }: { onSuccess: () => void; editingTransaction: Transaction | null }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { wallets, products, transactions, addDebt, handleTransfer, handleBankTransferService, handleCashWithdrawalService, handlePPOBTransaction, handleProductSale, editProduct, setTransactions, deleteTransaction, updateTransaction } = useFinanceContext();
  const [transactionType, setTransactionType] = useState<TransactionType>(
    (searchParams.get("type") as TransactionType) || "Physical Sale"
  );
  // Categories are hardcoded for now - can be moved to context if needed
  const categories = [
    { id: "1", name: "Operational" },
    { id: "2", name: "Inventory" },
    { id: "3", name: "Marketing" },
    { id: "4", name: "Utilities" },
  ];
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

  // Filter products to only show 'in_stock' items for sales
  const availableProducts = products.filter((p) => (p.status ?? "in_stock") === "in_stock");

  // Populate form fields when editing
  useEffect(() => {
    if (editingTransaction) {
      const cat = (editingTransaction.category || "").toLowerCase();
      const note = (editingTransaction.notes || "").toLowerCase();
      const combined = `${cat} ${note}`;

      // Smart Transaction Type Mapping: inspect category + notes to determine the correct form type
      let txType: TransactionType = "Physical Sale"; // final fallback

      if (
        combined.includes("repair") ||
        combined.includes("electronic service") ||
        combined.includes("service fee") ||
        cat === "electronic service"
      ) {
        txType = "Electronic Service";
      } else if (
        combined.includes("ppob") ||
        combined.includes("pulsa") ||
        combined.includes("token") ||
        combined.includes("digital ppob")
      ) {
        txType = "Digital PPOB (Pulsa/Game)";
      } else if (
        combined.includes("jasa transfer") ||
        combined.includes("fee jasa transfer") ||
        combined.includes("money transfer") ||
        (combined.includes("transfer") && combined.includes("admin"))
      ) {
        txType = "Money Transfer";
      } else if (
        combined.includes("tarik tunai") ||
        combined.includes("fee tarik tunai") ||
        combined.includes("cash withdrawal")
      ) {
        txType = "Cash Withdrawal";
      } else if (
        cat === "balance transfer" ||
        (editingTransaction.type === "transfer" && combined.includes("balance transfer"))
      ) {
        txType = "Balance Transfer";
      } else if (
        combined.includes("affiliate") ||
        combined.includes("commission") ||
        combined.includes("passive income")
      ) {
        txType = "Affiliate / Passive Income";
      } else if (
        combined.includes("internet sharing") ||
        combined.includes("biznet")
      ) {
        txType = "Internet Sharing (BIZNET)";
      } else if (
        combined.includes("kasbon") ||
        (editingTransaction.type === "kasbon")
      ) {
        txType = "Kasbon (Employee Loan)";
      } else if (
        cat === "sales" ||
        editingTransaction.product_id
      ) {
        txType = "Physical Sale";
      }

      setTransactionType(txType);
      setNotes(editingTransaction.notes || "");
      setAdminFee(editingTransaction.admin_fee?.toString() || "0");

      // Populate wallet IDs correctly for the determined type
      setDestinationWalletId(editingTransaction.to_wallet_id || "");
      setSourceWalletId(editingTransaction.from_wallet_id || "");

      // Populate the correct amount/input fields based on the resolved transaction type
      // Reset all amount-related fields first to avoid stale values
      setAmount("");
      setServiceFee("");
      setPpobCost("");
      setPpobSellingPrice("");
      setPpobProductName("");
      setCommissionAmount("");
      setPlatformName("");
      setInternetAmount("");
      setCustomerName("");
      setEmployeeName("");
      setProductId("");
      setQuantity("1");
      setSparepartProductId("");
      setPaymentMethod("lunas");
      setPersonName("");

      switch (txType) {
        case "Electronic Service":
          setServiceFee(editingTransaction.amount?.toString() || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          if (editingTransaction.product_id) {
            setSparepartProductId(editingTransaction.product_id);
          }
          break;

        case "Digital PPOB (Pulsa/Game)":
          // For PPOB income transactions, the amount is the profit; populate selling price
          // Try to extract cost and selling price from notes if available
          const costMatch = (editingTransaction.notes || "").match(/Cost:\s*Rp\s*([\d.,]+)/i);
          const sellMatch = (editingTransaction.notes || "").match(/Sell:\s*Rp\s*([\d.,]+)/i);
          if (costMatch && sellMatch) {
            setPpobCost(costMatch[1].replace(/\./g, "").replace(",", ""));
            setPpobSellingPrice(sellMatch[1].replace(/\./g, "").replace(",", ""));
          } else {
            setPpobCost(editingTransaction.amount?.toString() || "");
            setPpobSellingPrice(editingTransaction.amount?.toString() || "");
          }
          // Extract product name from notes
          const ppobNameMatch = (editingTransaction.notes || "").match(/(?:PPOB|Profit from PPOB):\s*(.+?)(?:\s*\(|$)/i);
          if (ppobNameMatch) {
            setPpobProductName(ppobNameMatch[1].trim());
          }
          setSourceWalletId(editingTransaction.from_wallet_id || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          break;

        case "Money Transfer":
          setAmount(editingTransaction.amount?.toString() || "");
          setSourceWalletId(editingTransaction.from_wallet_id || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          setAdminFee(editingTransaction.admin_fee?.toString() || "0");
          break;

        case "Cash Withdrawal":
          setAmount(editingTransaction.amount?.toString() || "");
          setSourceWalletId(editingTransaction.from_wallet_id || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          setAdminFee(editingTransaction.admin_fee?.toString() || "0");
          break;

        case "Balance Transfer":
          setAmount(editingTransaction.amount?.toString() || "");
          setSourceWalletId(editingTransaction.from_wallet_id || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          break;

        case "Affiliate / Passive Income":
          setCommissionAmount(editingTransaction.amount?.toString() || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          // Try to extract platform name from notes
          const platformMatch = (editingTransaction.notes || "").match(/(?:Commission from|from)\s+(.+)/i);
          if (platformMatch) {
            setPlatformName(platformMatch[1].trim());
          }
          break;

        case "Internet Sharing (BIZNET)":
          setInternetAmount(editingTransaction.amount?.toString() || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          // Try to extract customer name from notes
          const internetCustomerMatch = (editingTransaction.notes || "").match(/(?:payment from|from)\s+(.+)/i);
          if (internetCustomerMatch) {
            setCustomerName(internetCustomerMatch[1].trim());
          }
          break;

        case "Kasbon (Employee Loan)":
          setAmount(editingTransaction.amount?.toString() || "");
          setSourceWalletId(editingTransaction.from_wallet_id || "");
          // Try to extract employee name from notes
          const kasbonNameMatch = (editingTransaction.notes || "").match(/^([^-]+)/);
          if (kasbonNameMatch) {
            setEmployeeName(kasbonNameMatch[1].trim());
          }
          break;

        case "Physical Sale":
        default:
          setProductId(editingTransaction.product_id || "");
          setDestinationWalletId(editingTransaction.to_wallet_id || "");
          setAmount(editingTransaction.amount?.toString() || "");
          break;
      }
    } else {
      // Reset all fields when not editing
      setTransactionType("Physical Sale");
      setAmount("");
      setNotes("");
      setDestinationWalletId("");
      setSourceWalletId("");
      setAdminFee("0");
      setProductId("");
      setQuantity("1");
      setServiceFee("");
      setSparepartProductId("");
      setPpobProductName("");
      setPpobCost("");
      setPpobSellingPrice("");
      setPlatformName("");
      setCommissionAmount("");
      setCustomerName("");
      setInternetAmount("");
      setEmployeeName("");
      setPaymentMethod("lunas");
      setPersonName("");
    }
  }, [editingTransaction]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    // Bug Fix: If editing an existing transaction, rollback (reverse wallet balances
    // and remove) the old transaction FIRST, before applying the new one.
    // This prevents duplicates when converting between types (e.g. Income → Debt).
    if (editingTransaction) {
      deleteTransaction(editingTransaction.id);
    }

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

      const saleAmount = selectedProduct.selling_price * parsedQuantity;

      // Use handleProductSale for lunas payment, or addDebt for kasbon
      if (paymentMethod === "lunas" && selectedDestinationWallet) {
        handleProductSale(selectedProduct.id, parsedQuantity, selectedProduct.selling_price, selectedDestinationWallet.id);
      } else {
        // Add as debt for kasbon
        addDebt({
          person_name: personName.trim(),
          type: "receivable",
          amount: saleAmount,
          notes: `Kasbon: Physical sale (${parsedQuantity}x ${selectedProduct.name})`,
        });
      }

    } else if (transactionType === "Money Transfer") {
      if (!selectedSourceWallet || !selectedDestinationWallet || parsedAmount <= 0 || parsedAdminFee < 0) {
        return fail("Amount, admin fee, source wallet, and destination wallet are required.");
      }
      if (selectedSourceWallet.id === selectedDestinationWallet.id) {
        return fail("Source and destination wallet must be different.");
      }
      if (selectedSourceWallet.balance < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Use handleBankTransferService for Jasa Transfer Bank
      if (paymentMethod === "lunas" && selectedDestinationWallet) {
        handleBankTransferService(selectedSourceWallet.id, selectedDestinationWallet.id, parsedAmount, parsedAdminFee);
      } else {
        // Just deduct from source and record as debt
        handleBankTransferService(selectedSourceWallet.id, "kasbon", parsedAmount, parsedAdminFee);
        addDebt({
          person_name: personName.trim(),
          type: "receivable",
          amount: parsedAmount + parsedAdminFee,
          notes: `Kasbon: Money Transfer`,
        });
      }

    } else if (transactionType === "Cash Withdrawal") {
      if (!selectedSourceWallet || !selectedDestinationWallet || parsedAmount <= 0 || parsedAdminFee < 0) {
        return fail("Amount, admin fee, source wallet, and destination wallet are required.");
      }
      if (selectedSourceWallet.id === selectedDestinationWallet.id) {
        return fail("Source and destination wallet must be different.");
      }
      if (selectedSourceWallet.balance < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Use handleCashWithdrawalService for Jasa Tarik Tunai
      if (paymentMethod === "lunas" && selectedDestinationWallet) {
        handleCashWithdrawalService(selectedSourceWallet.id, selectedDestinationWallet.id, parsedAmount, parsedAdminFee);
      } else {
        // Deduct from source and record as debt
        handleCashWithdrawalService(selectedSourceWallet.id, "kasbon", parsedAmount, parsedAdminFee);
        addDebt({
          person_name: personName.trim(),
          type: "receivable",
          amount: parsedAmount + parsedAdminFee,
          notes: `Kasbon: Cash Withdrawal`,
        });
      }

    } else if (transactionType === "Balance Transfer") {
      if (!selectedSourceWallet || !selectedDestinationWallet || parsedAmount <= 0) {
        return fail("Amount, source wallet, and destination wallet are required.");
      }
      if (selectedSourceWallet.id === selectedDestinationWallet.id) {
        return fail("Source and destination wallet must be different.");
      }
      if (selectedSourceWallet.balance < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Use handleTransfer for balance transfer
      handleTransfer(selectedSourceWallet.id, selectedDestinationWallet.id, parsedAmount, 0);

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
        // Update product stock using editProduct from context
        editProduct(selectedSparepart.id, { stock: selectedSparepart.stock - 1 });
        totalIncome += selectedSparepart.selling_price;
      }

      // Handle wallet updates and debt recording
      if (paymentMethod === "lunas" && selectedDestinationWallet) {
        // Use handleTransfer to add income to wallet
        handleTransfer("income", selectedDestinationWallet.id, totalIncome, 0);
      } else {
        // Record as debt
        addDebt({
          person_name: personName.trim() || "Customer",
          type: "receivable",
          amount: totalIncome,
          notes: `Electronic service fee` + (selectedSparepart ? ` + sparepart (${selectedSparepart.name})` : ""),
        });
      }

      // Log transaction
      const newTransaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: "electronic_service" as const,
        amount: totalIncome,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        product_id: selectedSparepart?.id ?? null,
        notes: notes || (selectedSparepart ? `Service fee + sparepart (${selectedSparepart.name})` : "Electronic service fee"),
      };
      setTransactions([...transactions, newTransaction as Transaction]);

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
      if (selectedSourceWallet.balance < parsedPpobCost) {
        return fail("Insufficient source wallet balance.");
      }

      // Use handlePPOBTransaction for proper profit tracking
      if (paymentMethod === "lunas" && selectedDestinationWallet) {
        handlePPOBTransaction(ppobProductName.trim(), parsedPpobCost, parsedPpobSelling, selectedSourceWallet.id, selectedDestinationWallet.id);
      } else {
        // For kasbon, deduct cost and record debt for selling price
        handlePPOBTransaction(ppobProductName.trim(), parsedPpobCost, parsedPpobSelling, selectedSourceWallet.id, "kasbon");
        addDebt({
          person_name: personName.trim() || "Customer",
          type: "receivable",
          amount: parsedPpobSelling,
          notes: `PPOB ${ppobProductName.trim()}`,
        });
      }

    } else if (transactionType === "Affiliate / Passive Income") {
      if ((paymentMethod === "lunas" && !selectedDestinationWallet) || !platformName.trim() || parsedCommission <= 0) {
        return fail("Platform, commission amount, and destination wallet are required.");
      }
      if (paymentMethod === "kasbon" && !personName.trim()) {
        return fail("Customer Name is required for Kasbon.");
      }

      if (paymentMethod === "lunas" && selectedDestinationWallet) {
        // Add commission to destination wallet
        handleTransfer("income", selectedDestinationWallet.id, parsedCommission, 0);
      } else {
        // Record as debt
        addDebt({
          person_name: personName.trim() || "Affiliate",
          type: "receivable",
          amount: parsedCommission,
          notes: `Commission from ${platformName.trim()}`,
        });
      }

      // Log transaction
      const newTransaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: "affiliate_passive_income" as const,
        amount: parsedCommission,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        notes: notes || `Commission from ${platformName.trim()}`,
      };
      setTransactions([...transactions, newTransaction as Transaction]);

    } else if (transactionType === "Internet Sharing (BIZNET)") {
      if ((paymentMethod === "lunas" && !selectedDestinationWallet) || !customerName.trim() || parsedInternetAmount <= 0) {
        return fail("Customer name, amount, and destination wallet are required.");
      }
      if (paymentMethod === "kasbon" && !personName.trim()) {
        return fail("Customer Name is required for Kasbon.");
      }

      if (paymentMethod === "lunas" && selectedDestinationWallet) {
        // Add payment to destination wallet
        handleTransfer("income", selectedDestinationWallet.id, parsedInternetAmount, 0);
      } else {
        // Record as debt
        addDebt({
          person_name: personName.trim() || customerName.trim(),
          type: "receivable",
          amount: parsedInternetAmount,
          notes: `Internet sharing payment from ${customerName.trim()}`,
        });
      }

      // Log transaction
      const newTransaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: "internet_sharing_biznet" as const,
        amount: parsedInternetAmount,
        to_wallet_id: paymentMethod === "lunas" ? selectedDestinationWallet!.id : null,
        notes: notes || `Internet sharing payment from ${customerName.trim()}`,
      };
      setTransactions([...transactions, newTransaction as Transaction]);

    } else if (transactionType === "Kasbon (Employee Loan)") {
      if (!selectedSourceWallet || !employeeName.trim() || parsedAmount <= 0) {
        return fail("Source wallet, employee name, and amount are required.");
      }
      if (selectedSourceWallet.balance < parsedAmount) {
        return fail("Insufficient source wallet balance.");
      }

      // Deduct from source wallet using handleTransfer
      handleTransfer(selectedSourceWallet.id, "expense", parsedAmount, 0);

      // Log kasbon transaction
      const kasbonNotes = notes ? `${employeeName.trim()} - ${notes}` : employeeName.trim();
      const newTransaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: "kasbon" as const,
        amount: parsedAmount,
        from_wallet_id: selectedSourceWallet.id,
        notes: kasbonNotes,
      };
      setTransactions([...transactions, newTransaction as Transaction]);
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
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Choose product</option>
                  {availableProducts.map((product) => (
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
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">"Choose destination wallet"</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">"Choose sending wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">"Choose receiving wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">"Choose source wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">"Choose destination wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">"Choose destination wallet"</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">"Choose source wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">"Choose destination wallet"</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">"Choose destination wallet"</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">"Choose destination wallet"</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">"Choose source wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">"Choose source wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <option value="">"Choose destination wallet"</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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

        <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
          {isSubmitting ? "Saving..." : (editingTransaction ? "Update Transaction" : "Save Transaction")}
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
              if (fromWallet.balance < parsedAmount) {
                toast.error("Insufficient source wallet balance.");
                return;
              }

              setIsTransferring(true);

              try {
                // Use handleTransfer from FinanceContext
                handleTransfer(fromWallet.id, toWallet.id, parsedAmount, 0);

                toast.success("Balance transferred successfully");
                setIsTransferDialogOpen(false);
                setTransferFromWallet("");
                setTransferToWallet("");
                setTransferAmount("");
                setTransferNotes("");
                setTransferDate(new Date().toISOString().split('T')[0]);
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
                    {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
                    {wallet.name} ({wallet.walletType}) - {formatRupiah(wallet.balance)}
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
    </section>
  );
}

function ExpensesForm({ onSuccess }: { onSuccess: () => void }) {
  const { wallets, transactions, setTransactions, categories, addTransaction } = useFinanceContext();
  // Dynamic expense categories from Settings module
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

    // Use addTransaction to handle wallet balance and transaction recording
    const newTransaction = {
      id: Date.now().toString(),
      date: expenseDate,
      type: "expense" as const,
      category: expenseCategory,
      amount: parsedAmount,
      from_wallet_id: selectedWallet.id,
      notes: expenseDescription,
    };
    addTransaction(newTransaction);

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
          className="w-full flex h-10 items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
  const { wallets, transactions, setTransactions, deleteTransaction, updateTransaction } = useFinanceContext();
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Search & Date Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Derive income and expense transactions from FinanceContext
  // Only transactions with type === 'expense' count as expenses (not transfers/asset conversions)
  const incomeTransactions = useMemo(() => transactions.filter(t => t.type !== "expense" && t.type !== "transfer"), [transactions]);
  const expenses = useMemo(() => transactions.filter(t => t.type === "expense").map(t => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    description: t.notes || "",
    expense_category: t.category,
    from_wallet_id: t.from_wallet_id,
    wallet_name: wallets.find(w => w.id === t.from_wallet_id)?.name || "Unknown",
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

  const getCategoryColor = (type: string) => {
    const colorMap: Record<string, string> = {
      physical_sale: "emerald",
      money_transfer: "blue",
      cash_withdrawal: "amber",
      balance_transfer: "purple",
      electronic_service: "cyan",
      digital_ppob: "pink",
      affiliate_passive_income: "violet",
      internet_sharing_biznet: "sky",
      kasbon: "orange",
    };
    return colorMap[type] || "slate";
  };

  const getGhostBadgeClasses = (color: string) => {
    const map: Record<string, string> = {
      emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      pink: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      red: "bg-red-500/10 text-red-400 border-red-500/20",
      slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return map[color] || map.slate;
  };

  // Filter logic
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

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    deleteTransaction(id);
    toast.success("Transaction deleted");
  };

  const handleExpenseSuccess = () => {
    setIsExpenseModalOpen(false);
  };

  const handleIncomeSuccess = () => {
    setIsIncomeModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full gap-6 bg-[#020617] min-h-screen p-6">
      {/* 1. HEADER WITH ADD BUTTONS + SEARCH/FILTER (FULL WIDTH) */}
      <div className="w-full bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
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

        {/* Search & Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-700/50 bg-slate-800/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-700/50 bg-slate-800/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-700/50 bg-slate-800/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
            />
          </div>
          {(searchQuery || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchQuery(""); setDateFrom(""); setDateTo(""); }}
              className="h-9 px-3 rounded-lg border border-slate-700/50 bg-slate-800/30 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS BAR (FULL WIDTH) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm">Total Income</p>
          <p className="text-3xl font-bold text-emerald-400 font-jetbrains">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm">Total Expense</p>
          <p className="text-3xl font-bold text-red-400 font-jetbrains">{formatRupiah(totalExpense)}</p>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
          <p className="text-slate-400 text-sm">Current Balance</p>
          <p className="text-3xl font-bold text-white font-jetbrains">{formatRupiah(currentBalance)}</p>
        </div>
      </div>


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
              <TableHead className="text-right text-slate-300 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIncome.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Receipt className="h-12 w-12 text-slate-700/60" strokeWidth={1} />
                    <p className="text-slate-500 text-sm">No income transactions recorded yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredIncome.map((transaction) => {
                const wallet = wallets.find(w => w.id === transaction.to_wallet_id);
                const catColor = getCategoryColor(transaction.type);
                return (
                  <TableRow key={transaction.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-colors group">
                    <TableCell className="text-slate-300 text-sm">{formatDate(transaction.date)}</TableCell>
                    <TableCell className="text-slate-300 text-sm max-w-[200px] truncate">{transaction.notes || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getGhostBadgeClasses(catColor)}`}>
                        {getCategoryLabel(transaction.type)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {wallet ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-300 border-slate-500/20">
                          {wallet.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-jetbrains text-emerald-400 font-semibold text-sm tabular-nums">
                      +{formatRupiah(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setIsIncomeModalOpen(true);
                          }} 
                          className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors" 
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(transaction.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
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
              <TableHead className="text-right text-slate-300 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <FolderOpen className="h-12 w-12 text-slate-700/60" strokeWidth={1} />
                    <p className="text-slate-500 text-sm">No expense transactions recorded yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => {
                const expWallet = wallets.find(w => w.id === expense.from_wallet_id);
                return (
                  <TableRow key={expense.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-colors group">
                    <TableCell className="text-slate-300 text-sm">{formatDate(expense.date)}</TableCell>
                    <TableCell className="text-slate-300 text-sm max-w-[200px] truncate">{expense.description || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getGhostBadgeClasses("red")}`}>
                        {expense.expense_category || "Uncategorized"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {expWallet ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-300 border-slate-500/20">
                          {expWallet.name}
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-300 border-slate-500/20">
                          {expense.wallet_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-jetbrains text-red-400 font-semibold text-sm tabular-nums">
                      -{formatRupiah(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingTransaction(expense as any);
                            setIsExpenseModalOpen(true);
                          }} 
                          className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors" 
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(expense.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
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

      {/* Add Income Modal */}
      <Dialog open={isIncomeModalOpen} onOpenChange={(open) => { setIsIncomeModalOpen(open); if (!open) setEditingTransaction(null); }}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingTransaction ? "Edit Transaction" : "Add Income Transaction"}</DialogTitle>
          </DialogHeader>
          <TransactionsForm onSuccess={handleIncomeSuccess} editingTransaction={editingTransaction} />
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={(open) => { setIsExpenseModalOpen(open); if (!open) setEditingTransaction(null); }}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Expense</DialogTitle>
          </DialogHeader>
          <ExpensesForm onSuccess={handleExpenseSuccess} />
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
