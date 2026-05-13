"use client";

// PERBAIKAN: Menambahkan useCallback di impor
import { useState, useMemo, FormEvent, useEffect, useRef, useId, useCallback } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, PackageOpen, Store, Zap, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinanceContext } from "@/context/FinanceContext";
import { formatRupiah } from "@/lib/utils";

// --- TIPE DATA ---
type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
};

type TransactionType =
  | "Money Transfer"
  | "Cash Withdrawal"
  | "Balance Transfer"
  | "Electronic Service"
  | "Digital PPOB (Pulsa/Game)"
  | "Affiliate / Passive Income"
  | "Internet Sharing (BIZNET)"
  | "Kasbon (Employee Loan)";

const serviceTypes: TransactionType[] = [
  "Money Transfer",
  "Cash Withdrawal",
  "Balance Transfer",
  "Electronic Service",
  "Digital PPOB (Pulsa/Game)",
  "Affiliate / Passive Income",
  "Internet Sharing (BIZNET)",
  "Kasbon (Employee Loan)",
];

export default function POSPage() {
  const { 
    products, wallets, addTransaction, editProduct, addDebt, 
    handleTransfer, handleBankTransferService, handleCashWithdrawalService, handlePPOBTransaction 
  } = useFinanceContext();
  
  const [activeTab, setActiveTab] = useState<"retail" | "services">("retail");

  // ==========================================
  // STATE & LOGIKA TAB 1: RETAIL POS (BARANG FISIK)
  // ==========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"lunas" | "kasbon">("lunas");
  const [personName, setPersonName] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const availableProducts = useMemo(() => {
    return products.filter(
      (p) => 
        (p.status ?? "in_stock") === "in_stock" && 
        p.stock > 0 &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [products, searchQuery]);

  // PERBAIKAN: Menggunakan useCallback agar fungsi stabil dan tidak merestart kamera
  const addToCart = useCallback((product: typeof products[0]) => {
    setCart((prevCart) => {
      // Pastikan membandingkan ID sebagai string agar akurat
      const existingItem = prevCart.find((item) => String(item.productId) === String(product.id));
      
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          toast.error(`Stok ${product.name} tidak mencukupi!`);
          return prevCart;
        }
        return prevCart.map((item) => 
          String(item.productId) === String(product.id) 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { productId: product.id, name: product.name, price: product.sellingPrice, quantity: 1, maxStock: product.stock }];
    });
  }, []);

  // PERBAIKAN: Menggunakan useCallback agar fungsi stabil dan tidak merestart kamera
  const handleBarcodeScanned = useCallback((scannedBarcode: string) => {
    const foundProduct = products.find(p => p.barcode === scannedBarcode && (p.status ?? "in_stock") === "in_stock");
    
    if (foundProduct) {
      if (foundProduct.stock > 0) {
        addToCart(foundProduct);
        toast.success(`Berhasil memindai: ${foundProduct.name}`);
      } else {
        toast.error(`Stok habis untuk produk: ${foundProduct.name}`);
      }
    } else {
      toast.error(`Barcode ${scannedBarcode} tidak ditemukan di gudang!`);
    }
  }, [products, addToCart]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (String(item.productId) === String(productId)) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.maxStock) {
            toast.error("Stok tidak mencukupi!");
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (String(item.productId) === String(productId)) {
          return { ...item, price: newPrice };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((item) => String(item.productId) !== String(productId)));

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckoutRetail = async () => {
    if (cart.length === 0) return toast.error("Keranjang kosong!");
    if (paymentMethod === "lunas" && !selectedWalletId) return toast.error("Pilih dompet tujuan!");
    if (paymentMethod === "kasbon" && !personName.trim()) return toast.error("Nama pelanggan wajib diisi untuk kasbon!");

    setIsProcessing(true);
    try {
      const notes = "POS: " + cart.map((item) => `${item.quantity}x ${item.name} (@${formatRupiah(item.price)})`).join(", ");
      
      if (paymentMethod === "lunas") {
        await addTransaction({
          id: Date.now().toString(),
          type: "income",
          category: "Physical Sale",
          amount: totalAmount,
          toWalletId: selectedWalletId,
          date: new Date().toISOString().split('T')[0],
          notes: notes,
        });
      } else {
        await addDebt({
          personName: personName.trim(),
          type: "receivable",
          amount: totalAmount,
          notes: notes,
        });
      }

      for (const item of cart) {
        await editProduct(item.productId, { stock: item.maxStock - item.quantity });
      }

      toast.success(paymentMethod === "lunas" ? "Transaksi sukses!" : "Kasbon tercatat, stok dipotong.");
      setCart([]); setSearchQuery(""); setPersonName(""); setIsScannerOpen(false);
    } catch (error) {
      toast.error("Kesalahan sistem saat checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // STATE & LOGIKA TAB 2: SERVICES (JASA & PPOB)
  // ==========================================
  const [transactionType, setTransactionType] = useState<TransactionType>("Electronic Service");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceFee, setServiceFee] = useState("");
  const [serviceAdminFee, setServiceAdminFee] = useState("0");
  const [serviceSourceWalletId, setServiceSourceWalletId] = useState("");
  const [serviceDestWalletId, setServiceDestWalletId] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [sparepartProductId, setSparepartProductId] = useState("");
  const [ppobProductName, setPpobProductName] = useState("");
  const [ppobCost, setPpobCost] = useState("");
  const [ppobSellingPrice, setPpobSellingPrice] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [internetAmount, setInternetAmount] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  const handleServiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsProcessing(true);

    const fail = (msg: string) => { toast.error(msg); setIsProcessing(false); };
    const getIsoDate = () => new Date().toISOString().split('T')[0];
    const newTxId = Date.now().toString();

    const pAmount = Number(serviceAmount || "0");
    const pAdminFee = Number(serviceAdminFee || "0");
    const pServiceFee = Number(serviceFee || "0");
    const pPpobCost = Number(ppobCost || "0");
    const pPpobSelling = Number(ppobSellingPrice || "0");
    const pCommission = Number(commissionAmount || "0");
    const pInternetAmount = Number(internetAmount || "0");

    const selSourceWallet = wallets.find(w => w.id === serviceSourceWalletId);
    const selDestWallet = wallets.find(w => w.id === serviceDestWalletId);
    const selSparepart = products.find(p => p.id === sparepartProductId);

    if (transactionType === "Money Transfer" || transactionType === "Cash Withdrawal") {
      if (!selSourceWallet || pAmount <= 0 || pAdminFee < 0) return fail("Jumlah, admin, dan dompet asal wajib diisi.");
      if (paymentMethod === "lunas" && !selDestWallet) return fail("Pilih dompet tujuan.");
      if (selSourceWallet.id === serviceDestWalletId) return fail("Dompet asal dan tujuan harus beda.");
      if (selSourceWallet.balance < pAmount) return fail("Saldo dompet asal tidak cukup.");

      const isTransfer = transactionType === "Money Transfer";
      if (paymentMethod === "lunas" && selDestWallet) {
        if (isTransfer) handleBankTransferService(selSourceWallet.id, selDestWallet.id, pAmount, pAdminFee);
        else handleCashWithdrawalService(selSourceWallet.id, selDestWallet.id, pAmount, pAdminFee);
      } else {
        await addTransaction({ id: newTxId, type: "expense", category: isTransfer ? "Kasbon Transfer" : "Kasbon Tarik Tunai", amount: pAmount, fromWalletId: selSourceWallet.id, date: getIsoDate(), notes: `Modal kasbon untuk ${personName}` });
        await addDebt({ personName: personName, type: "receivable", amount: pAmount + pAdminFee, notes: `Kasbon Jasa ${isTransfer ? "Transfer" : "Tarik Tunai"}` });
      }
    } else if (transactionType === "Balance Transfer") {
      if (!selSourceWallet || !selDestWallet || pAmount <= 0) return fail("Lengkapi data transfer.");
      if (selSourceWallet.id === selDestWallet.id) return fail("Dompet tidak boleh sama.");
      if (selSourceWallet.balance < pAmount) return fail("Saldo tidak cukup.");
      handleTransfer(selSourceWallet.id, selDestWallet.id, pAmount, 0);
    } else if (transactionType === "Electronic Service") {
      if ((paymentMethod === "lunas" && !selDestWallet) || pServiceFee < 0) return fail("Biaya dan dompet tujuan wajib diisi.");
      if (paymentMethod === "kasbon" && !personName.trim()) return fail("Nama pelanggan wajib diisi.");

      let totalIncome = pServiceFee;
      if (selSparepart) {
        if (selSparepart.stock < 1) return fail("Sparepart habis.");
        await editProduct(selSparepart.id, { stock: selSparepart.stock - 1 });
        totalIncome += selSparepart.sellingPrice;
      }

      if (paymentMethod === "lunas" && selDestWallet) {
        await addTransaction({ id: newTxId, type: "income", category: "Electronic Service", amount: totalIncome, toWalletId: selDestWallet.id, productId: selSparepart?.id, date: getIsoDate(), notes: serviceNotes || (selSparepart ? `Service + sparepart (${selSparepart.name})` : "Service fee") });
      } else {
        await addDebt({ personName: personName.trim() || "Customer", type: "receivable", amount: totalIncome, notes: `Kasbon Service` + (selSparepart ? ` + sparepart` : "") });
      }
    } else if (transactionType === "Digital PPOB (Pulsa/Game)") {
      if (!selSourceWallet || (paymentMethod === "lunas" && !selDestWallet) || !ppobProductName.trim()) return fail("Lengkapi form PPOB.");
      if (paymentMethod === "kasbon" && !personName.trim()) return fail("Nama wajib diisi.");
      if (selSourceWallet.balance < pPpobCost) return fail("Saldo modal tidak cukup.");

      if (paymentMethod === "lunas" && selDestWallet) {
        handlePPOBTransaction(ppobProductName.trim(), pPpobCost, pPpobSelling, selSourceWallet.id, selDestWallet.id);
      } else {
        await addTransaction({ id: newTxId, type: "expense", category: "PPOB Capital", amount: pPpobCost, fromWalletId: selSourceWallet.id, date: getIsoDate(), notes: `Modal PPOB ${ppobProductName.trim()}` });
        await addDebt({ personName: personName.trim() || "Customer", type: "receivable", amount: pPpobSelling, notes: `Kasbon PPOB: ${ppobProductName.trim()}` });
      }
    } else if (transactionType === "Affiliate / Passive Income") {
      if ((paymentMethod === "lunas" && !selDestWallet) || !platformName.trim() || pCommission <= 0) return fail("Lengkapi form Affiliate.");
      if (paymentMethod === "lunas" && selDestWallet) {
        await addTransaction({ id: newTxId, type: "income", category: "Affiliate", amount: pCommission, toWalletId: selDestWallet.id, date: getIsoDate(), notes: serviceNotes || `Commission from ${platformName.trim()}` });
      } else {
        await addDebt({ personName: personName.trim() || "Affiliate", type: "receivable", amount: pCommission, notes: `Unpaid Commission: ${platformName.trim()}` });
      }
    } else if (transactionType === "Internet Sharing (BIZNET)") {
      if ((paymentMethod === "lunas" && !selDestWallet) || !customerName.trim() || pInternetAmount <= 0) return fail("Lengkapi form Internet.");
      if (paymentMethod === "lunas" && selDestWallet) {
        await addTransaction({ id: newTxId, type: "income", category: "Internet Sharing", amount: pInternetAmount, toWalletId: selDestWallet.id, date: getIsoDate(), notes: serviceNotes || `Internet from ${customerName.trim()}` });
      } else {
        await addDebt({ personName: personName.trim() || customerName.trim(), type: "receivable", amount: pInternetAmount, notes: `Unpaid Internet: ${customerName.trim()}` });
      }
    } else if (transactionType === "Kasbon (Employee Loan)") {
      if (!selSourceWallet || !employeeName.trim() || pAmount <= 0) return fail("Lengkapi form Kasbon.");
      if (selSourceWallet.balance < pAmount) return fail("Saldo tidak cukup.");
      await addTransaction({ id: newTxId, type: "expense", category: "Kasbon Employee", amount: pAmount, fromWalletId: selSourceWallet.id, date: getIsoDate(), notes: `Kasbon untuk ${employeeName.trim()}` });
      await addDebt({ personName: employeeName.trim(), type: "receivable", amount: pAmount, notes: `Hutang Kasbon Karyawan` });
    }

    toast.success("Transaksi Jasa/Layanan berhasil dicatat!");
    setServiceAmount(""); setServiceFee(""); setServiceAdminFee("0"); setServiceSourceWalletId(""); setServiceDestWalletId(""); setServiceNotes(""); setSparepartProductId(""); setPpobProductName(""); setPpobCost(""); setPpobSellingPrice(""); setPlatformName(""); setCommissionAmount(""); setCustomerName(""); setInternetAmount(""); setEmployeeName(""); setPersonName(""); setPaymentMethod("lunas");
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col w-full gap-4 md:gap-6 bg-slate-50 dark:bg-[#020617] min-h-screen p-4 md:p-6 overflow-x-hidden transition-colors duration-300">
      
      {/* --- HEADER TABS --- */}
      <div className="w-full bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-4">Command Center / POS</h2>
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "retail" | "services")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-1">
            <TabsTrigger value="retail" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-slate-500 dark:text-slate-400 font-medium py-2 rounded-md transition-all flex items-center gap-2">
              <Store className="h-4 w-4" /> Retail & Barang
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-500 dark:text-slate-400 font-medium py-2 rounded-md transition-all flex items-center gap-2">
              <Zap className="h-4 w-4" /> Jasa & Layanan
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* --- TAB 1: RETAIL (PENJUALAN FISIK) --- */}
      {activeTab === "retail" && (
        <div className="flex flex-col lg:flex-row w-full gap-4 md:gap-6">
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Pencarian Produk & Tombol Scanner */}
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm rounded-xl p-4 flex flex-col gap-3">
              <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input 
                    type="text" 
                    placeholder="Cari produk atau barcode..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:ring-orange-500/50 w-full" 
                  />
                </div>
                <Button 
                  onClick={() => setIsScannerOpen(!isScannerOpen)} 
                  variant="outline" 
                  className={`border-slate-300 dark:border-slate-700 transition-colors ${isScannerOpen ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/50' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:text-orange-500'}`}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Area Tampilan Kamera Scanner */}
              {isScannerOpen && (
                <div className="w-full bg-black/5 dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  <BarcodeScanner onDetected={handleBarcodeScanned} disabled={!isScannerOpen} />
                </div>
              )}
            </div>

            {/* Grid Produk */}
            <div className="bg-slate-100 dark:bg-slate-900/20 rounded-xl p-2 md:p-4 border border-slate-200 dark:border-slate-800/30 flex-1 min-h-[400px] overflow-y-auto custom-scrollbar">
              {availableProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-12">
                  <PackageOpen className="h-12 w-12 mb-3 opacity-20" />
                  <p>Tidak ada produk yang tersedia atau cocok.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                  {availableProducts.map((product) => (
                    <div 
                      key={product.id} 
                      onClick={() => addToCart(product)} 
                      className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 md:p-4 cursor-pointer hover:border-orange-500/50 dark:hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all flex flex-col justify-between group active:scale-95 shadow-sm"
                    >
                      <div>
                        <h3 className="text-slate-800 dark:text-white font-medium text-sm leading-tight mb-1 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-100 dark:bg-slate-800/80 w-fit px-1.5 py-0.5 rounded border border-slate-200 dark:border-transparent">
                          Stok: {product.stock}
                        </p>
                      </div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatRupiah(product.sellingPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Keranjang Belanja */}
          <div className="w-full lg:w-[350px] xl:w-[400px] flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 shadow-sm rounded-xl p-4 md:p-6 flex flex-col h-[calc(100vh-8rem)] sticky top-6">
              
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800/50">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Keranjang</h3>
                <span className="ml-auto bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 py-0.5 px-2.5 rounded-full text-xs font-bold border border-orange-200 dark:border-transparent">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 py-10 text-sm">Pilih barang atau pindai barcode.</div>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="flex justify-between items-start bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-700/30">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-slate-800 dark:text-white text-sm font-medium truncate">{item.name}</h4>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">Rp</span>
                          <Input
                            type="number"
                            min="0"
                            value={item.price || ""}
                            onChange={(e) => updatePrice(item.productId, Number(e.target.value))}
                            className="h-6 w-24 px-1.5 py-0 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-8 text-center text-xs font-medium text-slate-800 dark:text-white border-x border-slate-200 dark:border-slate-800">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-[10px] flex items-center gap-1"><Trash2 className="h-3 w-3" /> Hapus</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Total Belanja</span>
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">{formatRupiah(totalAmount)}</span>
                </div>
                
                <div className="grid gap-2">
                  <Label className="text-slate-600 dark:text-slate-300 text-xs">Metode Pembayaran</Label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/50 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-orange-500/50">
                    <option value="lunas">Lunas (Langsung Bayar)</option>
                    <option value="kasbon">Kasbon (Hutang)</option>
                  </select>
                </div>

                {paymentMethod === "kasbon" ? (
                  <div className="grid gap-2">
                    <Label className="text-slate-600 dark:text-slate-300 text-xs">Nama Pelanggan (Hutang)*</Label>
                    <Input value={personName} onChange={(e) => setPersonName(e.target.value)} className="bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm" placeholder="e.g. Mas Budi" />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label className="text-slate-600 dark:text-slate-300 text-xs">Pilih Dompet (Masuk Uang)*</Label>
                    <select value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/50 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-orange-500/50">
                      <option value="" disabled>-- Pilih Dompet --</option>
                      {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
                    </select>
                  </div>
                )}
                
                <Button onClick={handleCheckoutRetail} disabled={isProcessing || cart.length === 0} className="w-full py-6 text-base font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all">
                  {isProcessing ? "Memproses..." : "Bayar / Checkout"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: SERVICES (JASA & LAYANAN MULTIFUNGSI) --- */}
      {activeTab === "services" && (
        <div className="w-full bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 md:w-3/4 lg:w-2/3 mx-auto shadow-sm">
          <form className="space-y-6" onSubmit={handleServiceSubmit}>
            <div className="grid gap-2">
              <Label className="text-slate-700 dark:text-slate-300 font-medium">Pilih Jenis Layanan/Jasa</Label>
              <select value={transactionType} onChange={(e) => setTransactionType(e.target.value as TransactionType)} className="w-full px-3 py-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-emerald-500/50 shadow-sm">
                {serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            
            {transactionType === "Electronic Service" && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Biaya Jasa (Rp)</Label><Input type="number" min="0" required value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Sparepart (Opsional)</Label>
                    <select value={sparepartProductId} onChange={(e) => setSparepartProductId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm">
                      <option value="">Tanpa Sparepart</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(transactionType === "Money Transfer" || transactionType === "Cash Withdrawal") && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-slate-600 dark:text-slate-300">Jumlah Transaksi (Rp)</Label>
                    <Input type="number" required value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-slate-600 dark:text-slate-300">Biaya Admin (Rp)</Label>
                    <Input type="number" required value={serviceAdminFee} onChange={(e) => setServiceAdminFee(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-slate-600 dark:text-slate-300">Dompet Pengirim (Saldo Berkurang)*</Label>
                    <select value={serviceSourceWalletId} onChange={(e) => setServiceSourceWalletId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm">
                      <option value="">-- Pilih --</option>
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-slate-600 dark:text-slate-300">Dompet Penerima Uang Pelanggan*</Label>
                    <select value={serviceDestWalletId} onChange={(e) => setServiceDestWalletId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm">
                      <option value="">-- Pilih --</option>
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {transactionType === "Digital PPOB (Pulsa/Game)" && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Nama Produk</Label><Input required value={ppobProductName} onChange={(e) => setPpobProductName(e.target.value)} placeholder="e.g. Pulsa 20K" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Harga Modal (Cost)</Label><Input type="number" required value={ppobCost} onChange={(e) => setPpobCost(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Harga Jual (Sell)</Label><Input type="number" required value={ppobSellingPrice} onChange={(e) => setPpobSellingPrice(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                </div>
                <div className="grid gap-2 mt-2">
                  <Label className="text-slate-600 dark:text-slate-300">Sumber Saldo Pembelian (Modal)*</Label>
                  <select value={serviceSourceWalletId} onChange={(e) => setServiceSourceWalletId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm">
                    <option value="">-- Pilih Dompet --</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}
                  </select>
                </div>
              </div>
            )}

            {transactionType === "Affiliate / Passive Income" && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Nama Platform</Label><Input required value={platformName} onChange={(e) => setPlatformName(e.target.value)} placeholder="e.g. Shopee Affiliate" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Jumlah Komisi (Rp)</Label><Input type="number" required value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                </div>
              </div>
            )}

            {transactionType === "Internet Sharing (BIZNET)" && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Nama Pelanggan (Tetangga)</Label><Input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Pak RT" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Jumlah Tagihan (Rp)</Label><Input type="number" required value={internetAmount} onChange={(e) => setInternetAmount(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                </div>
              </div>
            )}

            {transactionType === "Balance Transfer" && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Pindahkan Dari Dompet*</Label>
                    <select value={serviceSourceWalletId} onChange={(e) => setServiceSourceWalletId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm"><option value="">-- Pilih --</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}</select>
                  </div>
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Pindahkan Ke Dompet*</Label>
                    <select value={serviceDestWalletId} onChange={(e) => setServiceDestWalletId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm"><option value="">-- Pilih --</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}</select>
                  </div>
                  <div className="grid gap-2 md:col-span-2"><Label className="text-slate-600 dark:text-slate-300">Jumlah Nominal (Rp)</Label><Input type="number" required value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                </div>
              </div>
            )}

            {transactionType === "Kasbon (Employee Loan)" && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Dompet Pengeluaran*</Label>
                    <select value={serviceSourceWalletId} onChange={(e) => setServiceSourceWalletId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm"><option value="">-- Pilih --</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}</select>
                  </div>
                  <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Jumlah Kasbon (Rp)</Label><Input type="number" required value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                  <div className="grid gap-2 md:col-span-2"><Label className="text-slate-600 dark:text-slate-300">Nama Peminjam / Karyawan</Label><Input required value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="e.g. Mas Budi" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                </div>
              </div>
            )}

            {transactionType !== "Balance Transfer" && transactionType !== "Kasbon (Employee Loan)" && (
              <div className="grid gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Metode Pembayaran</Label>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "lunas" | "kasbon")} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm">
                        <option value="lunas">Lunas (Tunai/Transfer)</option><option value="kasbon">Kasbon (Hutang)</option>
                      </select>
                    </div>
                    {paymentMethod === "kasbon" ? (
                      <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Nama Pelanggan (Hutang)*</Label><Input value={personName} onChange={(e) => setPersonName(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" /></div>
                    ) : (
                      <div className="grid gap-2"><Label className="text-slate-600 dark:text-slate-300">Dompet Tujuan (Uang Masuk)*</Label>
                        <select value={serviceDestWalletId} onChange={(e) => setServiceDestWalletId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm"><option value="">-- Pilih --</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>)}</select>
                      </div>
                    )}
                  </div>
              </div>
            )}

            <div className="grid gap-2 mt-4">
              <Label className="text-slate-600 dark:text-slate-300">Catatan Khusus (Opsional)</Label>
              <Input value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)} placeholder="Contoh: Titipan biaya pelanggan" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
            </div>

            <Button type="submit" disabled={isProcessing} className="w-full py-6 mt-4 text-base font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all">
              {isProcessing ? "Memproses..." : "Simpan Layanan Jasa"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KOMPONEN BARCODE SCANNER (Menggunakan html5-qrcode)
// ============================================================================
function BarcodeScanner({ onDetected, disabled }: { onDetected: (barcode: string) => void; disabled?: boolean }) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerContainerId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void | Promise<void> } | null>(null);
  const hasDetectedRef = useRef(false);

  useEffect(() => {
    async function startScanner() {
      if (disabled) return;

      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode(scannerContainerId, { verbose: false });

      scannerRef.current = html5QrCode;
      hasDetectedRef.current = false;
      setScannerError(null);

      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Gunakan kamera belakang jika di HP
          { fps: 10, qrbox: { width: 250, height: 120 } },
          (decodedText) => {
            if (hasDetectedRef.current) return;
            hasDetectedRef.current = true; // Mencegah scan beruntun yang sama
            onDetected(decodedText);
            
            // Jeda sejenak sebelum bisa scan lagi
            setTimeout(() => {
              hasDetectedRef.current = false;
            }, 2000); 
          },
          () => {}, // Abaikan error frame kosong
        );
      } catch (error) {
        setScannerError(error instanceof Error ? error.message : "Gagal mengaktifkan kamera.");
      }
    }

    async function stopScanner() {
      if (!scannerRef.current) return;
      try { await scannerRef.current.stop(); } catch { /* no-op */ }
      try { await scannerRef.current.clear(); } catch { /* no-op */ }
      scannerRef.current = null;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [disabled, onDetected, scannerContainerId]);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div id={scannerContainerId} className="w-full max-w-sm overflow-hidden rounded-md bg-black min-h-[200px]" />
      {scannerError && <p className="text-xs text-red-500 mt-2">{scannerError}</p>}
      <p className="text-xs text-slate-500 mt-2">Arahkan kamera ke barcode barang.</p>
    </div>
  );
}