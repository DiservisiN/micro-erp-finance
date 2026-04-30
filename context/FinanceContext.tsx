"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type Wallet = {
  id: string;
  name: string;
  type: "business" | "personal";
  walletType: "Bank" | "E-Wallet" | "Cash";
  balance: number;
};

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

type Product = {
  id: string;
  barcode: string | null;
  name: string;
  category: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  status: string;
  expiredDate: string | null;
};

type Investment = {
  id: string;
  name: string;
  type: "gold" | "bibit";
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
};

type Debt = {
  id: string;
  personName: string;
  type: "receivable" | "payable";
  status: "unpaid" | "paid";
  amount: number;
  notes: string | null;
};

type Category = {
  id: string;
  name: string;
  type: "inventory" | "expense";
  description: string;
};

type FinanceContextValue = {
  wallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  products: Product[];
  setProducts: (products: Product[]) => void;
  investments: Investment[];
  setInvestments: (investments: Investment[]) => void;
  debts: Debt[];
  setDebts: (debts: Debt[]) => void;
  categories: Category[];
  goldPrice: number;
  setGoldPrice: (price: number) => void;
  addCategory: (category: Omit<Category, "id">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  editCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  handleTransfer: (fromWalletId: string, toWalletId: string, amount: number, fee?: number) => Promise<void>;
  handleBankTransferService: (bankWalletId: string, cashWalletId: string, amount: number, adminFee: number) => Promise<void>;
  handleCashWithdrawalService: (cashWalletId: string, bankWalletId: string, amount: number, adminFee: number) => Promise<void>;
  handlePPOBTransaction: (productName: string, cost: number, sellingPrice: number, sourceWalletId: string, destWalletId: string) => Promise<void>;
  handleRepairPayment: (params: { repairId: string; finalFee: number; sparepartId?: string; walletId: string; note?: string }) => Promise<void>;
  handleProductSale: (productId: string, quantity: number, sellingPrice: number, walletId: string) => Promise<void>;
  handleRestock: (productId: string, quantity: number, costPrice: number, walletId: string) => Promise<void>;
  handleDebtPayment: (debtId: string, amount: number, walletId: string) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updatedData: Partial<Transaction>) => Promise<void>;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  editProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updateInvestment: (id: string, updatedData: Partial<Investment>) => Promise<void>;
  addDebt: (debt: Omit<Debt, "id" | "status">) => Promise<void>;
  deleteDebt: (debtId: string) => Promise<void>;
  settleDebt: (debtId: string, walletId: string) => Promise<void>;
  addWallet: (wallet: Omit<Wallet, "id">) => Promise<void>;
  editWallet: (id: string, updates: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

const STORAGE_KEY = "aether_erp_data";

const defaultState = {
  wallets: [],
  transactions: [],
  products: [],
  investments: [],
  debts: [],
  categories: [],
  goldPrice: 1300000,
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  const [wallets, setWallets] = useState<Wallet[]>(defaultState.wallets);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultState.transactions);
  const [products, setProducts] = useState<Product[]>(defaultState.products);
  const [investments, setInvestments] = useState<Investment[]>(defaultState.investments);
  const [debts, setDebts] = useState<Debt[]>(defaultState.debts);
  const [categories, setCategories] = useState<Category[]>(defaultState.categories);
  const [goldPrice, setGoldPrice] = useState<number>(defaultState.goldPrice);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadData = async () => {
      if (!supabase) {
        setIsHydrated(true);
        return;
      }

      try {
        const [walletsRes, transRes, invRes, prodRes, debtsRes, catRes] = await Promise.all([
          supabase.from("wallets").select("*").order("created_at", { ascending: false }),
          supabase.from("transactions").select("*").order("date", { ascending: false }),
          supabase.from("investments").select("*").order("name", { ascending: true }),
          supabase.from("products").select("*").order("name", { ascending: true }),
          supabase.from("debts").select("*").order("created_at", { ascending: false }),
          supabase.from("categories").select("*").order("name", { ascending: true })
        ]);

        if (walletsRes.data) {
          setWallets(walletsRes.data.map((item: any) => ({
            id: item.id, name: item.name, type: item.type, walletType: item.wallet_type, balance: Number(item.balance) || 0,
          })));
        }
        if (transRes.data) {
          setTransactions(transRes.data.map((item: any) => ({
            id: item.id, type: item.type, category: item.category, amount: Number(item.amount) || 0, adminFee: item.admin_fee,
            date: item.date, notes: item.notes, productId: item.product_id, fromWalletId: item.from_wallet_id,
            toWalletId: item.to_wallet_id, debtId: item.debt_id,
          })));
        }
        if (invRes.data) {
          setInvestments(invRes.data.map((item: any) => ({
            id: item.id, name: item.name, type: item.type, quantity: Number(item.quantity) || 0,
            averageBuyPrice: Number(item.average_buy_price) || 0, currentPrice: Number(item.current_price) || 0,
          })));
        }
        if (prodRes.data) {
          setProducts(prodRes.data.map((item: any) => ({
            id: item.id, barcode: item.barcode, name: item.name, category: item.category, costPrice: Number(item.cost_price) || 0,
            sellingPrice: Number(item.selling_price) || 0, stock: Number(item.stock) || 0, status: item.status, expiredDate: item.expired_date,
          })));
        }
        if (debtsRes.data) {
          setDebts(debtsRes.data.map((item: any) => ({
            id: item.id, personName: item.person_name, type: item.type, status: item.status, amount: Number(item.amount) || 0, notes: item.notes,
          })));
        }
        if (catRes.data) {
          setCategories(catRes.data.map((item: any) => ({
            id: item.id, name: item.name, type: item.type, description: item.description,
          })));
        }

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.goldPrice) setGoldPrice(parsed.goldPrice);
        }
      } catch (e) {
        console.error("Failed to load from Supabase:", e);
      }
      setIsHydrated(true);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ goldPrice }));
  }, [goldPrice, isHydrated]);


  // ==========================================
  // HELPER DATABASE SINKRONISASI
  // ==========================================
  
  const syncWalletBalance = async (walletId: string, newBalance: number) => {
    if (!supabase) return;
    try {
      await supabase.from("wallets").update({ balance: newBalance }).eq("id", walletId);
    } catch (e) {
      console.error("Failed to sync wallet balance:", e);
    }
  };

  const syncProductStock = async (productId: string, newStock: number) => {
    if (!supabase) return;
    try {
      await supabase.from("products").update({ stock: newStock }).eq("id", productId);
    } catch (e) {
      console.error("Failed to sync product stock:", e);
    }
  };

  // Fungsi khusus menyimpan transaksi ke DB tanpa mengubah isi wallet ganda
  // Fungsi khusus menyimpan transaksi ke DB tanpa mengubah isi wallet ganda
  const recordTransactionToDB = async (transaction: Transaction) => {
    if (!supabase) {
      setTransactions(prev => [...prev, transaction]);
      return;
    }
    try {
      // PERBAIKAN: Kita hapus "id" dari payload agar Supabase yang membuatnya (UUID)
      const payload = {
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        admin_fee: transaction.adminFee || 0, // PERBAIKAN: Beri nilai default 0 jika kosong
        date: transaction.date,
        notes: transaction.notes,
        product_id: transaction.productId,
        from_wallet_id: transaction.fromWalletId,
        to_wallet_id: transaction.toWalletId,
        debt_id: transaction.debtId,
      };
      
      // Tambahkan .select().single() untuk mengambil UUID aslinya
      const { data, error } = await supabase.from("transactions").insert(payload).select().single();
      
      if (error) {
        console.error("Gagal simpan transaksi:", error.message);
        alert("Peringatan: Gagal menyimpan transaksi ke database! " + error.message);
        return;
      }
      
      // Simpan transaksi ke state dengan mengganti ID sementaranya dengan UUID asli dari database
      const finalTransaction = { ...transaction, id: data.id };
      setTransactions(prev => [...prev, finalTransaction]);
    } catch (e) {
      console.error("Kesalahan sistem:", e);
    }
  };


  // ==========================================
  // SMART ACTION HANDLERS
  // ==========================================

  const handleTransfer = async (fromWalletId: string, toWalletId: string, amount: number, fee: number = 0) => {
    setWallets(prevWallets => {
      const fromWallet = prevWallets.find(w => w.id === fromWalletId);
      const toWallet = prevWallets.find(w => w.id === toWalletId);

      if (!fromWallet || !toWallet) return prevWallets;
      
      const newFromBalance = fromWallet.balance - amount - fee;
      const newToBalance = toWallet.balance + amount;

      syncWalletBalance(fromWalletId, newFromBalance);
      syncWalletBalance(toWalletId, newToBalance);

      return prevWallets.map(w => {
        if (w.id === fromWalletId) return { ...w, balance: newFromBalance };
        if (w.id === toWalletId) return { ...w, balance: newToBalance };
        return w;
      });
    });

    const transferTransaction: Transaction = {
      id: Date.now().toString(),
      type: "transfer",
      category: "Balance Transfer",
      amount: amount,
      adminFee: fee > 0 ? fee : null,
      date: new Date().toISOString().split('T')[0],
      notes: fee > 0 ? `Transfer with ${formatRupiah(fee)} fee` : "Balance transfer",
      fromWalletId: fromWalletId,
      toWalletId: toWalletId,
    };
    await recordTransactionToDB(transferTransaction);

    if (fee > 0) {
      const feeTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Transfer Fee",
        amount: fee,
        adminFee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Transfer fee from ${fromWalletId} to ${toWalletId}`,
        fromWalletId: fromWalletId,
      };
      await recordTransactionToDB(feeTransaction);
    }
  };

  const handleBankTransferService = async (bankWalletId: string, cashWalletId: string, amount: number, adminFee: number) => {
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === bankWalletId) {
          const newBal = w.balance - amount;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        if (w.id === cashWalletId) {
          const newBal = w.balance + amount + adminFee;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        return w;
      });
    });

    const transferTransaction: Transaction = {
      id: Date.now().toString(),
      type: "transfer",
      category: "Jasa Transfer Bank",
      amount: amount,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Transfer service: ${formatRupiah(amount)} from bank to customer`,
      fromWalletId: bankWalletId,
      toWalletId: cashWalletId,
    };
    await recordTransactionToDB(transferTransaction);

    if (adminFee > 0) {
      const feeTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Fee Jasa Transfer",
        amount: adminFee,
        adminFee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Admin fee for transfer service`,
        toWalletId: cashWalletId,
      };
      await recordTransactionToDB(feeTransaction);
    }
  };

  const handleCashWithdrawalService = async (cashWalletId: string, bankWalletId: string, amount: number, adminFee: number) => {
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === cashWalletId) {
          const newBal = w.balance - amount;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        if (w.id === bankWalletId) {
          const newBal = w.balance + amount + adminFee;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        return w;
      });
    });

    const transferTransaction: Transaction = {
      id: Date.now().toString(),
      type: "transfer",
      category: "Jasa Tarik Tunai",
      amount: amount,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Cash withdrawal service: ${formatRupiah(amount)} given to customer`,
      fromWalletId: cashWalletId,
      toWalletId: bankWalletId,
    };
    await recordTransactionToDB(transferTransaction);

    if (adminFee > 0) {
      const feeTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Fee Tarik Tunai",
        amount: adminFee,
        adminFee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Admin fee for cash withdrawal service`,
        toWalletId: bankWalletId,
      };
      await recordTransactionToDB(feeTransaction);
    }
  };

  const handlePPOBTransaction = async (productName: string, cost: number, sellingPrice: number, sourceWalletId: string, destWalletId: string) => {
    const profit = sellingPrice - cost;

    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === sourceWalletId) {
          const newBal = w.balance - cost;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        if (w.id === destWalletId) {
          const newBal = w.balance + sellingPrice;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        return w;
      });
    });

    const costTransaction: Transaction = {
      id: Date.now().toString(),
      type: "transfer",
      category: "PPOB Cost",
      amount: cost,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `PPOB cost for ${productName}`,
      fromWalletId: sourceWalletId,
    };
    await recordTransactionToDB(costTransaction);

    if (profit > 0) {
      const profitTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Digital PPOB Profit",
        amount: profit,
        adminFee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Profit from PPOB: ${productName} (Cost: ${formatRupiah(cost)}, Sell: ${formatRupiah(sellingPrice)})`,
        toWalletId: destWalletId,
      };
      await recordTransactionToDB(profitTransaction);
    }
  };

  const handleRepairPayment = async ({ repairId, finalFee, sparepartId, walletId, note }: { repairId: string; finalFee: number; sparepartId?: string; walletId: string; note?: string }) => {
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === walletId) {
          const newBalance = w.balance + finalFee;
          syncWalletBalance(walletId, newBalance);
          return { ...w, balance: newBalance };
        }
        return w;
      });
    });

    const incomeTransaction: Transaction = {
      id: Date.now().toString(),
      type: "income",
      category: "Electronic Service",
      amount: finalFee,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: note || `Repair payment for repair ID: ${repairId}`,
      toWalletId: walletId,
    };
    await recordTransactionToDB(incomeTransaction);

    if (sparepartId) {
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          if (p.id === sparepartId && p.stock > 0) {
            const newStock = p.stock - 1;
            syncProductStock(sparepartId, newStock);
            return { ...p, stock: newStock };
          }
          return p;
        });
      });
    }
  };

  const handleProductSale = async (productId: string, quantity: number, sellingPrice: number, walletId: string) => {
    const totalAmount = quantity * sellingPrice;

    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === productId && p.stock >= quantity) {
          const newStock = p.stock - quantity;
          syncProductStock(productId, newStock);
          return { ...p, stock: newStock };
        }
        return p;
      });
    });

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: "income",
      category: "Sales",
      amount: totalAmount,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Sold ${quantity} units`,
      productId: productId,
      toWalletId: walletId
    };
    await recordTransactionToDB(newTransaction);

    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === walletId) {
          const newBal = w.balance + totalAmount;
          syncWalletBalance(walletId, newBal);
          return { ...w, balance: newBal };
        }
        return w;
      });
    });
  };

  const handleRestock = async (productId: string, quantity: number, costPrice: number, walletId: string) => {
    const totalCost = quantity * costPrice;

    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === productId) {
          const newStock = p.stock + quantity;
          syncProductStock(productId, newStock);
          return { ...p, stock: newStock };
        }
        return p;
      });
    });

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: "transfer",
      category: "Inventory Restock",
      amount: totalCost,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Restocked ${quantity} units`,
      productId: productId,
      fromWalletId: walletId,
    };
    await recordTransactionToDB(newTransaction);

    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === walletId) {
          const newBal = w.balance - totalCost;
          syncWalletBalance(walletId, newBal);
          return { ...w, balance: newBal };
        }
        return w;
      });
    });
  };

  const handleDebtPayment = async (debtId: string, amount: number, walletId: string) => {
    setDebts(prevDebts => {
      const debt = prevDebts.find(d => d.id === debtId);
      if (!debt) return prevDebts;

      const newAmount = debt.amount - amount;
      const isPaid = newAmount === 0;
      
      // PERBAIKAN: Mengganti d.status menjadi debt.status
      const newStatus = isPaid ? "paid" : debt.status; 
      
      if(supabase) supabase.from("debts").update({ amount: newAmount, status: newStatus }).eq("id", debtId).then();

      return prevDebts.map(d => {
        if (d.id === debtId) return { ...d, amount: newAmount, status: newStatus };
        return d;
      });
    });

    setWallets(prevWallets => {
      const debt = debts.find(d => d.id === debtId);
      if (!debt) return prevWallets;

      return prevWallets.map(w => {
        if (w.id === walletId) {
          const newBal = debt.type === "payable" ? w.balance - amount : w.balance + amount;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        return w;
      });
    });
  };


  // ==========================================
  // TRANSACTION CRUD OPERATIONS
  // ==========================================
  
 const addTransaction = async (transaction: Transaction) => {
    if (!supabase) {
      console.warn("Supabase not available, using local state only");
      // Apply wallet balance changes based on transaction type
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (transaction.type === "income" && transaction.toWalletId === w.id) {
            return { ...w, balance: w.balance + transaction.amount };
          }
          if (transaction.type === "expense" && transaction.fromWalletId === w.id) {
            return { ...w, balance: w.balance - transaction.amount };
          }
          if (transaction.type === "transfer") {
            if (transaction.fromWalletId === w.id) {
              return { ...w, balance: w.balance - transaction.amount };
            }
            if (transaction.toWalletId === w.id) {
              return { ...w, balance: w.balance + transaction.amount };
            }
          }
          return w;
        });
      });
      setTransactions(prev => [...prev, transaction]);
      return;
    }

    try {
      // PERBAIKAN: Hapus "id" dari payload
      const snakeCasePayload = {
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        admin_fee: transaction.adminFee || 0, // PERBAIKAN: Beri nilai default 0 jika kosong
        date: transaction.date,
        notes: transaction.notes,
        product_id: transaction.productId,
        from_wallet_id: transaction.fromWalletId,
        to_wallet_id: transaction.toWalletId,
        debt_id: transaction.debtId,
      };
      
      // Gunakan .select().single()
      const { data, error } = await supabase
        .from("transactions")
        .insert(snakeCasePayload)
        .select()
        .single();

      if (error) {
        console.error("Failed to insert transaction:", error.message);
        alert("Gagal mencatat transaksi: " + error.message);
        return;
      }

      // Apply wallet balance changes based on transaction type
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (transaction.type === "income" && transaction.toWalletId === w.id) {
            const newBalance = w.balance + transaction.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (transaction.type === "expense" && transaction.fromWalletId === w.id) {
            const newBalance = w.balance - transaction.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (transaction.type === "transfer") {
            if (transaction.fromWalletId === w.id) {
              const newBalance = w.balance - transaction.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
            if (transaction.toWalletId === w.id) {
              const newBalance = w.balance + transaction.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
          }
          return w;
        });
      });

      // Gunakan UUID asli untuk disimpan di state
      const finalTransaction = { ...transaction, id: data.id };
      setTransactions(prev => [...prev, finalTransaction]);
    } catch (e) {
      console.error("Failed to add transaction:", e);
    }
  };

  const deleteTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (supabase) {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) {
        alert("Gagal menghapus transaksi: " + error.message);
        return;
      }
    }

    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (tx.type === "income" && tx.toWalletId === w.id) {
          const newBal = w.balance - tx.amount;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        if (tx.type === "expense" && tx.fromWalletId === w.id) {
          const newBal = w.balance + tx.amount;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        if (tx.type === "transfer") {
          if (tx.fromWalletId === w.id) {
            const newBal = w.balance + tx.amount;
            syncWalletBalance(w.id, newBal);
            return { ...w, balance: newBal };
          }
          if (tx.toWalletId === w.id) {
            const newBal = w.balance - tx.amount;
            syncWalletBalance(w.id, newBal);
            return { ...w, balance: newBal };
          }
        }
        return w;
      });
    });
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = async (id: string, updatedData: Partial<Transaction>) => {
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) return;

    if (supabase) {
      const payload: any = {};
      if (updatedData.type !== undefined) payload.type = updatedData.type;
      if (updatedData.category !== undefined) payload.category = updatedData.category;
      if (updatedData.amount !== undefined) payload.amount = updatedData.amount;
      if (updatedData.adminFee !== undefined) payload.admin_fee = updatedData.adminFee;
      if (updatedData.date !== undefined) payload.date = updatedData.date;
      if (updatedData.notes !== undefined) payload.notes = updatedData.notes;
      if (updatedData.productId !== undefined) payload.product_id = updatedData.productId;
      if (updatedData.fromWalletId !== undefined) payload.from_wallet_id = updatedData.fromWalletId;
      if (updatedData.toWalletId !== undefined) payload.to_wallet_id = updatedData.toWalletId;
      if (updatedData.debtId !== undefined) payload.debt_id = updatedData.debtId;
      
      const { error } = await supabase.from("transactions").update(payload).eq("id", id);
      if (error) {
        alert("Gagal mengupdate transaksi: " + error.message);
        return;
      }
    }

    setWallets(prevWallets => {
      // 1. Reverse old
      let reversed = prevWallets.map(w => {
        if (oldTx.type === "income" && oldTx.toWalletId === w.id) return { ...w, balance: w.balance - oldTx.amount };
        if (oldTx.type === "expense" && oldTx.fromWalletId === w.id) return { ...w, balance: w.balance + oldTx.amount };
        if (oldTx.type === "transfer") {
          if (oldTx.fromWalletId === w.id) return { ...w, balance: w.balance + oldTx.amount };
          if (oldTx.toWalletId === w.id) return { ...w, balance: w.balance - oldTx.amount };
        }
        return w;
      });

      // 2. Apply new
      const newTx = { ...oldTx, ...updatedData };
      return reversed.map(w => {
        let finalBal = w.balance;
        if (newTx.type === "income" && newTx.toWalletId === w.id) finalBal = w.balance + newTx.amount;
        if (newTx.type === "expense" && newTx.fromWalletId === w.id) finalBal = w.balance - newTx.amount;
        if (newTx.type === "transfer") {
          if (newTx.fromWalletId === w.id) finalBal = w.balance - newTx.amount;
          if (newTx.toWalletId === w.id) finalBal = w.balance + newTx.amount;
        }
        
        if(finalBal !== w.balance) syncWalletBalance(w.id, finalBal);
        return { ...w, balance: finalBal };
      });
    });

    setTransactions(prev => prev.map(t => t.id === id ? { ...oldTx, ...updatedData } : t));
  };

  const addProduct = async (product: Omit<Product, "id">) => {
    const newProduct: Product = { ...product, id: Date.now().toString() };
    if (supabase) {
      const payload = {
        barcode: newProduct.barcode, name: newProduct.name, category: newProduct.category,
        cost_price: newProduct.costPrice, selling_price: newProduct.sellingPrice,
        stock: newProduct.stock, status: newProduct.status, expired_date: newProduct.expiredDate,
      };
      const { error } = await supabase.from("products").insert(payload);
      if(error) return console.error(error);
    }
    setProducts(prev => [...prev, newProduct]);
  };

  const editProduct = async (productId: string, updates: Partial<Product>) => {
    if (supabase) {
      const payload: any = {};
      if (updates.barcode !== undefined) payload.barcode = updates.barcode;
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) payload.selling_price = updates.sellingPrice;
      if (updates.stock !== undefined) payload.stock = updates.stock;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.expiredDate !== undefined) payload.expired_date = updates.expiredDate;
      await supabase.from("products").update(payload).eq("id", productId);
    }
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, ...updates } : p)));
  };

  const deleteProduct = async (productId: string) => {
    if (supabase) await supabase.from("products").delete().eq("id", productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateInvestment = async (id: string, updatedData: Partial<Investment>) => {
    if (supabase) {
      const payload: any = {};
      if (updatedData.name !== undefined) payload.name = updatedData.name;
      if (updatedData.type !== undefined) payload.type = updatedData.type;
      if (updatedData.quantity !== undefined) payload.quantity = updatedData.quantity;
      if (updatedData.averageBuyPrice !== undefined) payload.average_buy_price = updatedData.averageBuyPrice;
      if (updatedData.currentPrice !== undefined) payload.current_price = updatedData.currentPrice;
      await supabase.from("investments").update(payload).eq("id", id);
    }
    setInvestments(prev => prev.map(inv => (inv.id === id ? { ...inv, ...updatedData } : inv)));
  };

  const addDebt = async (debt: Omit<Debt, "id" | "status">) => {
    const newDebt: Debt = { ...debt, id: Date.now().toString(), status: "unpaid" };
    if (supabase) {
      const payload = {
        person_name: newDebt.personName, type: newDebt.type,
        amount: newDebt.amount, status: newDebt.status, notes: newDebt.notes,
      };
      await supabase.from("debts").insert(payload);
    }
    setDebts(prev => [...prev, newDebt]);
  };

  const deleteDebt = async (debtId: string) => {
    if (supabase) await supabase.from("debts").delete().eq("id", debtId);
    setDebts(prev => prev.filter(d => d.id !== debtId));
  };

  const settleDebt = async (debtId: string, walletId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    if (supabase) await supabase.from("debts").update({ status: "paid" }).eq("id", debtId);

    setDebts(prev => prev.map(d => (d.id === debtId ? { ...d, status: "paid" } : d)));

    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === walletId) {
          const newBal = debt.type === "payable" ? w.balance - debt.amount : w.balance + debt.amount;
          syncWalletBalance(w.id, newBal);
          return { ...w, balance: newBal };
        }
        return w;
      });
    });

    const settleTx: Transaction = {
      id: Date.now().toString(),
      type: debt.type === "receivable" ? "income" : "expense",
      category: debt.type === "receivable" ? "Debt Settlement / Bayar Piutang" : "Debt Payment / Bayar Hutang",
      amount: debt.amount,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `${debt.type === "receivable" ? "Piutang settled" : "Hutang paid"}: ${debt.personName}${debt.notes ? ` - ${debt.notes}` : ""}`,
      toWalletId: debt.type === "receivable" ? walletId : null,
      fromWalletId: debt.type === "payable" ? walletId : null,
      debtId: debtId,
    };
    await recordTransactionToDB(settleTx);
  };

  const addCategory = async (category: Omit<Category, "id">) => {
    if (supabase) {
      const payload = { name: category.name, type: category.type, description: category.description };
      const { data, error } = await supabase.from("categories").insert(payload).select().single();
      if (!error && data) {
        setCategories(prev => [...prev, { id: data.id, name: data.name, type: data.type, description: data.description }]);
        return;
      }
    }
    setCategories(prev => [...prev, { ...category, id: Date.now().toString() }]);
  };

  const deleteCategory = async (id: string) => {
    if (supabase) await supabase.from("categories").delete().eq("id", id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const editCategory = async (id: string, updates: Partial<Category>) => {
    if (supabase) {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.description !== undefined) payload.description = updates.description;
      await supabase.from("categories").update(payload).eq("id", id);
    }
    setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addWallet = async (wallet: Omit<Wallet, "id">) => {
    if (supabase) {
      const payload = { name: wallet.name, type: wallet.type, wallet_type: wallet.walletType, balance: wallet.balance };
      const { data, error } = await supabase.from("wallets").insert(payload).select().single();
      if (!error && data) {
        setWallets(prev => [...prev, { id: data.id, name: data.name, type: data.type, walletType: data.wallet_type, balance: Number(data.balance) }]);
        return;
      }
    }
    setWallets(prev => [...prev, { ...wallet, id: Date.now().toString() }]);
  };

  const editWallet = async (id: string, updates: Partial<Wallet>) => {
    if (supabase) {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.walletType !== undefined) payload.wallet_type = updates.walletType;
      if (updates.balance !== undefined) payload.balance = updates.balance;
      await supabase.from("wallets").update(payload).eq("id", id);
    }
    setWallets(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
  };

  const deleteWallet = async (id: string) => {
    if (supabase) await supabase.from("wallets").delete().eq("id", id);
    setWallets(prev => prev.filter(w => w.id !== id));
  };

  const value = {
    wallets, setWallets,
    addWallet, editWallet, deleteWallet,
    transactions, setTransactions,
    products, setProducts,
    investments, setInvestments,
    debts, setDebts,
    categories,
    goldPrice, setGoldPrice,
    addCategory, deleteCategory, editCategory,
    handleTransfer, handleBankTransferService, handleCashWithdrawalService,
    handlePPOBTransaction, handleRepairPayment, handleProductSale,
    handleRestock, handleDebtPayment,
    addTransaction, deleteTransaction, updateTransaction,
    addProduct, editProduct, deleteProduct,
    updateInvestment,
    addDebt, deleteDebt, settleDebt,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinanceContext() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinanceContext must be used within FinanceProvider");
  return context;
}