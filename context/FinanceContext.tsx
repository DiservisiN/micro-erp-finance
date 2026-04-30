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
  handleBankTransferService: (bankWalletId: string, cashWalletId: string, amount: number, adminFee: number) => void;
  handleCashWithdrawalService: (cashWalletId: string, bankWalletId: string, amount: number, adminFee: number) => void;
  handlePPOBTransaction: (productName: string, cost: number, sellingPrice: number, sourceWalletId: string, destWalletId: string) => void;
  handleRepairPayment: (params: { repairId: string; finalFee: number; sparepartId?: string; walletId: string; note?: string }) => Promise<void>;
  handleProductSale: (productId: string, quantity: number, sellingPrice: number, walletId: string) => void;
  handleRestock: (productId: string, quantity: number, costPrice: number, walletId: string) => void;
  handleDebtPayment: (debtId: string, amount: number, walletId: string) => void;
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
  wallets: [
    { id: "1", name: "BCA Utama", type: "business" as const, walletType: "Bank" as const, balance: 15500000 },
    { id: "2", name: "GoPay Bisnis", type: "business" as const, walletType: "E-Wallet" as const, balance: 2150000 },
  ],
  transactions: [],
  products: [
    {
      id: "1",
      barcode: "-",
      name: "Kabel Data Type C - ROBOT",
      category: "DiservisiN",
      costPrice: 10000,
      sellingPrice: 15000,
      stock: 20,
      status: "in_stock",
      expiredDate: "2027-01-01",
    },
  ],
  investments: [],
  debts: [],
  categories: [
    { id: "1", name: "Electronics", type: "inventory" as const, description: "Electronic devices" },
    { id: "2", name: "Office Supplies", type: "expense" as const, description: "Office items" },
  ],
  goldPrice: 1300000,
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Hydration-safe state initialization
  const [isHydrated, setIsHydrated] = useState(false);

  const [wallets, setWallets] = useState<Wallet[]>(defaultState.wallets);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultState.transactions);
  const [products, setProducts] = useState<Product[]>(defaultState.products);
  const [investments, setInvestments] = useState<Investment[]>(defaultState.investments);
  const [debts, setDebts] = useState<Debt[]>(defaultState.debts);
  const [categories, setCategories] = useState<Category[]>(defaultState.categories);
  const [goldPrice, setGoldPrice] = useState<number>(defaultState.goldPrice);

  // Load from Supabase on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadData = async () => {
      if (!supabase) {
        console.warn("Supabase client not initialized, falling back to localStorage");
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.wallets) setWallets(parsed.wallets);
            if (parsed.transactions) setTransactions(parsed.transactions);
            if (parsed.products) setProducts(parsed.products);
            if (parsed.investments) setInvestments(parsed.investments);
            if (parsed.debts) setDebts(parsed.debts);
            if (parsed.categories) setCategories(parsed.categories);
            if (parsed.goldPrice) setGoldPrice(parsed.goldPrice);
          }
        } catch (e) {
          console.error("Failed to load from localStorage:", e);
        }
        setIsHydrated(true);
        return;
      }

      try {
        // Fetch wallets from Supabase
        const { data: walletsData, error: walletsError } = await supabase
          .from("wallets")
          .select("*")
          .order("created_at", { ascending: false });

        if (walletsError) {
          console.error("Failed to fetch wallets:", walletsError);
        } else if (walletsData) {
          setWallets(walletsData.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            walletType: item.wallet_type,
            balance: Number(item.balance) || 0,
          })) as Wallet[]);
        }

        // Fetch transactions from Supabase
        const { data: transactionsData, error: transactionsError } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: false });

        if (transactionsError) {
          console.error("Failed to fetch transactions:", transactionsError);
        } else if (transactionsData) {
          setTransactions(transactionsData.map((item: any) => ({
            id: item.id,
            type: item.type,
            category: item.category,
            amount: Number(item.amount) || 0,
            adminFee: item.admin_fee,
            date: item.date,
            notes: item.notes,
            productId: item.product_id,
            fromWalletId: item.from_wallet_id,
            toWalletId: item.to_wallet_id,
            debtId: item.debt_id,
          })) as Transaction[]);
        }

        // Fetch investments from Supabase
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("*")
          .order("name", { ascending: true });

        if (investmentsError) {
          console.error("Failed to fetch investments:", investmentsError);
        } else if (investmentsData) {
          setInvestments(investmentsData.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            quantity: Number(item.quantity) || 0,
            averageBuyPrice: Number(item.average_buy_price) || 0,
            currentPrice: Number(item.current_price) || 0,
          })));
        }

        // Fetch products from Supabase
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .order("name", { ascending: true });

        if (productsError) {
          console.error("Failed to fetch products:", productsError);
        } else if (productsData) {
          setProducts(productsData.map((item: any) => ({
            id: item.id,
            barcode: item.barcode,
            name: item.name,
            category: item.category,
            costPrice: Number(item.cost_price) || 0,
            sellingPrice: Number(item.selling_price) || 0,
            stock: Number(item.stock) || 0,
            status: item.status,
            expiredDate: item.expired_date,
          })));
        }

        // Fetch debts from Supabase
        const { data: debtsData, error: debtsError } = await supabase
          .from("debts")
          .select("*")
          .order("created_at", { ascending: false });

        if (debtsError) {
          console.error("Failed to fetch debts:", debtsError);
        } else if (debtsData) {
          setDebts(debtsData.map((item: any) => ({
            id: item.id,
            personName: item.person_name,
            type: item.type,
            status: item.status,
            amount: Number(item.amount) || 0,
            notes: item.notes,
          })));
        }

        // Fetch categories from Supabase
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });

        if (categoriesError) {
          console.error("Failed to fetch categories:", categoriesError);
        } else if (categoriesData) {
          setCategories(categoriesData.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            description: item.description,
          })));
        }

        // Only keep goldPrice from localStorage (not migrated to Supabase)
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

  // Save to localStorage whenever state changes (only for non-Supabase data)
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    const data = {
      goldPrice,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [goldPrice, isHydrated]);

  // Smart Action Handlers

  // Helper function to sync wallet balance to Supabase
  const syncWalletBalance = async (walletId: string, newBalance: number) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", walletId);

      if (error) {
        console.error("Failed to sync wallet balance:", error);
      }
    } catch (e) {
      console.error("Failed to sync wallet balance:", e);
    }
  };

  // Internal wallet-to-wallet transfer (for regular balance transfers)
  const handleTransfer = async (fromWalletId: string, toWalletId: string, amount: number, fee: number = 0) => {
    setWallets(prevWallets => {
      const fromWallet = prevWallets.find(w => w.id === fromWalletId);
      const toWallet = prevWallets.find(w => w.id === toWalletId);

      if (!fromWallet || !toWallet) {
        console.error("Invalid wallet IDs for transfer");
        return prevWallets;
      }

      if (fromWallet.balance < amount + fee) {
        console.error("Insufficient balance for transfer");
        return prevWallets;
      }

      const newFromBalance = fromWallet.balance - amount - fee;
      const newToBalance = toWallet.balance + amount;

      // Sync to Supabase
      syncWalletBalance(fromWalletId, newFromBalance);
      syncWalletBalance(toWalletId, newToBalance);

      return prevWallets.map(w => {
        if (w.id === fromWalletId) {
          return { ...w, balance: newFromBalance };
        }
        if (w.id === toWalletId) {
          return { ...w, balance: newToBalance };
        }
        return w;
      });
    });

    // Record the transfer transaction
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

    setTransactions(prev => [...prev, transferTransaction]);

    // If there's a fee, record it as income (expense for the sender)
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
      setTransactions(prev => [...prev, feeTransaction]);
    }
  };

  // Jasa Transfer Bank: Customer gives Cash + Admin Fee, Agent sends from Bank
  const handleBankTransferService = (bankWalletId: string, cashWalletId: string, amount: number, adminFee: number) => {
    setWallets(prevWallets => {
      const bankWallet = prevWallets.find(w => w.id === bankWalletId);
      const cashWallet = prevWallets.find(w => w.id === cashWalletId);

      if (!bankWallet || !cashWallet) {
        console.error("Invalid wallet IDs for bank transfer service");
        return prevWallets;
      }

      // Check if bank has enough for the transfer amount
      if (bankWallet.balance < amount) {
        console.error("Insufficient bank balance for transfer");
        return prevWallets;
      }

      return prevWallets.map(w => {
        if (w.id === bankWalletId) {
          // Bank decreases by transfer amount
          return { ...w, balance: w.balance - amount };
        }
        if (w.id === cashWalletId) {
          // Cash increases by (amount + admin fee)
          return { ...w, balance: w.balance + amount + adminFee };
        }
        return w;
      });
    });

    // Record the principal transfer transaction
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

    setTransactions(prev => [...prev, transferTransaction]);

    // Record the admin fee as INCOME
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
      setTransactions(prev => [...prev, feeTransaction]);
    }
  };

  // Jasa Tarik Tunai: Customer transfers to Bank + Admin Fee, Agent gives Cash
  const handleCashWithdrawalService = (cashWalletId: string, bankWalletId: string, amount: number, adminFee: number) => {
    setWallets(prevWallets => {
      const cashWallet = prevWallets.find(w => w.id === cashWalletId);
      const bankWallet = prevWallets.find(w => w.id === bankWalletId);

      if (!cashWallet || !bankWallet) {
        console.error("Invalid wallet IDs for cash withdrawal service");
        return prevWallets;
      }

      // Check if cash wallet has enough
      if (cashWallet.balance < amount) {
        console.error("Insufficient cash for withdrawal");
        return prevWallets;
      }

      return prevWallets.map(w => {
        if (w.id === cashWalletId) {
          // Cash decreases by withdrawal amount
          return { ...w, balance: w.balance - amount };
        }
        if (w.id === bankWalletId) {
          // Bank increases by (amount + admin fee)
          return { ...w, balance: w.balance + amount + adminFee };
        }
        return w;
      });
    });

    // Record the principal transfer transaction
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

    setTransactions(prev => [...prev, transferTransaction]);

    // Record the admin fee as INCOME
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
      setTransactions(prev => [...prev, feeTransaction]);
    }
  };

  // PPOB (Digital Goods): Deduct cost from source, add selling price to destination, record profit as income
  const handlePPOBTransaction = (productName: string, cost: number, sellingPrice: number, sourceWalletId: string, destWalletId: string) => {
    const profit = sellingPrice - cost;

    setWallets(prevWallets => {
      const sourceWallet = prevWallets.find(w => w.id === sourceWalletId);
      const destWallet = prevWallets.find(w => w.id === destWalletId);

      if (!sourceWallet || !destWallet) {
        console.error("Invalid wallet IDs for PPOB transaction");
        return prevWallets;
      }

      if (sourceWallet.balance < cost) {
        console.error("Insufficient source wallet balance for PPOB cost");
        return prevWallets;
      }

      return prevWallets.map(w => {
        if (w.id === sourceWalletId) {
          // Deduct cost from source wallet
          return { ...w, balance: w.balance - cost };
        }
        if (w.id === destWalletId) {
          // Add selling price to destination wallet
          return { ...w, balance: w.balance + sellingPrice };
        }
        return w;
      });
    });

    // Record asset conversion transaction for cost (audit trail)
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
    setTransactions(prev => [...prev, costTransaction]);

    // Record income transaction for profit only
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
      setTransactions(prev => [...prev, profitTransaction]);
    }
  };

  // Repair Payment: Add fee to wallet, create income transaction, decrease sparepart stock
  const handleRepairPayment = async ({ repairId, finalFee, sparepartId, walletId, note }: { repairId: string; finalFee: number; sparepartId?: string; walletId: string; note?: string }) => {
    // Add final fee to wallet balance
    setWallets(prevWallets => {
      const wallet = prevWallets.find(w => w.id === walletId);
      if (!wallet) {
        console.error("Invalid wallet ID for repair payment");
        return prevWallets;
      }
      const newBalance = wallet.balance + finalFee;
      syncWalletBalance(walletId, newBalance);
      return prevWallets.map(w => {
        if (w.id === walletId) {
          return { ...w, balance: newBalance };
        }
        return w;
      });
    });

    // Create income transaction for Electronic Service
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
    await addTransaction(incomeTransaction);

    // Decrease sparepart stock if provided
    if (sparepartId) {
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          if (p.id === sparepartId) {
            if (p.stock < 1) {
              console.error("Insufficient stock for sparepart");
              return p;
            }
            return { ...p, stock: p.stock - 1 };
          }
          return p;
        });
      });
    }
  };

  const handleProductSale = (productId: string, quantity: number, sellingPrice: number, walletId: string) => {
    const totalAmount = quantity * sellingPrice;

    // Decrease product stock
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === productId) {
          if (p.stock < quantity) {
            console.error("Insufficient stock for sale");
            return p;
          }
          return { ...p, stock: p.stock - quantity };
        }
        return p;
      });
    });

    // Add income transaction
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: "income",
      category: "Sales",
      amount: totalAmount,
      adminFee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Sold ${quantity} units`,
      productId: productId,
    };
    setTransactions(prev => [...prev, newTransaction]);

    // Increase wallet balance
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === walletId) {
          return { ...w, balance: w.balance + totalAmount };
        }
        return w;
      });
    });
  };

  const handleRestock = (productId: string, quantity: number, costPrice: number, walletId: string) => {
    const totalCost = quantity * costPrice;

    // Increase product stock
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === productId) {
          return { ...p, stock: p.stock + quantity };
        }
        return p;
      });
    });

    // Add asset conversion transaction (Cash -> Inventory)
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
    setTransactions(prev => [...prev, newTransaction]);

    // Decrease wallet balance
    setWallets(prevWallets => {
      const wallet = prevWallets.find(w => w.id === walletId);
      if (!wallet || wallet.balance < totalCost) {
        console.error("Insufficient balance for restock");
        return prevWallets;
      }
      return prevWallets.map(w => {
        if (w.id === walletId) {
          return { ...w, balance: w.balance - totalCost };
        }
        return w;
      });
    });
  };

  const handleDebtPayment = (debtId: string, amount: number, walletId: string) => {
    setDebts(prevDebts => {
      const debt = prevDebts.find(d => d.id === debtId);
      if (!debt) {
        console.error("Debt not found");
        return prevDebts;
      }

      if (debt.amount < amount) {
        console.error("Payment amount exceeds debt");
        return prevDebts;
      }

      const newAmount = debt.amount - amount;
      const isPaid = newAmount === 0;

      return prevDebts.map(d => {
        if (d.id === debtId) {
          return { ...d, amount: newAmount, status: isPaid ? "paid" : d.status };
        }
        return d;
      });
    });

    // Update wallet balance based on debt type
    setWallets(prevWallets => {
      const debt = debts.find(d => d.id === debtId);
      if (!debt) return prevWallets;

      return prevWallets.map(w => {
        if (w.id === walletId) {
          // If paying debt (payable), decrease balance
          // If receiving payment (receivable), increase balance
          if (debt.type === "payable") {
            return { ...w, balance: w.balance - amount };
          } else {
            return { ...w, balance: w.balance + amount };
          }
        }
        return w;
      });
    });
  };

  // Transaction CRUD operations with accounting rollback
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
      // Insert transaction into Supabase with snake_case payload
      const snakeCasePayload = {
        id: transaction.id,
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        admin_fee: transaction.adminFee,
        date: transaction.date,
        notes: transaction.notes,
        product_id: transaction.productId,
        from_wallet_id: transaction.fromWalletId,
        to_wallet_id: transaction.toWalletId,
        debt_id: transaction.debtId,
      };
      const { error } = await supabase
        .from("transactions")
        .insert(snakeCasePayload);

      if (error) {
        console.error("Failed to insert transaction:", error);
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

      // Add the transaction to the array
      setTransactions(prev => [...prev, transaction]);
    } catch (e) {
      console.error("Failed to add transaction:", e);
    }
  };

  const deleteTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) {
      console.error("Transaction not found");
      return;
    }

    if (!supabase) {
      console.warn("Supabase not available, using local state only");
      // Reverse the wallet balance changes
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (tx.type === "income" && tx.toWalletId === w.id) {
            return { ...w, balance: w.balance - tx.amount };
          }
          if (tx.type === "expense" && tx.fromWalletId === w.id) {
            return { ...w, balance: w.balance + tx.amount };
          }
          if (tx.type === "transfer") {
            if (tx.fromWalletId === w.id) {
              return { ...w, balance: w.balance + tx.amount };
            }
            if (tx.toWalletId === w.id) {
              return { ...w, balance: w.balance - tx.amount };
            }
          }
          return w;
        });
      });
      setTransactions(prev => prev.filter(t => t.id !== id));
      return;
    }

    try {
      // Delete from Supabase
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Failed to delete transaction:", error);
        return;
      }

      // Reverse the wallet balance changes
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (tx.type === "income" && tx.toWalletId === w.id) {
            const newBalance = w.balance - tx.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (tx.type === "expense" && tx.fromWalletId === w.id) {
            const newBalance = w.balance + tx.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (tx.type === "transfer") {
            if (tx.fromWalletId === w.id) {
              const newBalance = w.balance + tx.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
            if (tx.toWalletId === w.id) {
              const newBalance = w.balance - tx.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
          }
          return w;
        });
      });

      // Remove the transaction
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error("Failed to delete transaction:", e);
    }
  };

  const updateTransaction = async (id: string, updatedData: Partial<Transaction>) => {
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) {
      console.error("Transaction not found");
      return;
    }

    if (!supabase) {
      console.warn("Supabase not available, using local state only");
      // Step 1: Reverse the old transaction's wallet balance changes
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (oldTx.type === "income" && oldTx.toWalletId === w.id) {
            return { ...w, balance: w.balance - oldTx.amount };
          }
          if (oldTx.type === "expense" && oldTx.fromWalletId === w.id) {
            return { ...w, balance: w.balance + oldTx.amount };
          }
          if (oldTx.type === "transfer") {
            if (oldTx.fromWalletId === w.id) {
              return { ...w, balance: w.balance + oldTx.amount };
            }
            if (oldTx.toWalletId === w.id) {
              return { ...w, balance: w.balance - oldTx.amount };
            }
          }
          return w;
        });
      });

      // Step 2: Apply the new transaction's wallet balance changes
      const newTx = { ...oldTx, ...updatedData };
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (newTx.type === "income" && newTx.toWalletId === w.id) {
            return { ...w, balance: w.balance + newTx.amount };
          }
          if (newTx.type === "expense" && newTx.fromWalletId === w.id) {
            return { ...w, balance: w.balance - newTx.amount };
          }
          if (newTx.type === "transfer") {
            if (newTx.fromWalletId === w.id) {
              return { ...w, balance: w.balance - newTx.amount };
            }
            if (newTx.toWalletId === w.id) {
              return { ...w, balance: w.balance + newTx.amount };
            }
          }
          return w;
        });
      });

      // Step 3: Update the transaction in the array
      setTransactions(prev => prev.map(t => t.id === id ? newTx : t));
      return;
    }

    try {
      // Update in Supabase with snake_case payload
      const snakeCasePayload: any = {};
      if (updatedData.type !== undefined) snakeCasePayload.type = updatedData.type;
      if (updatedData.category !== undefined) snakeCasePayload.category = updatedData.category;
      if (updatedData.amount !== undefined) snakeCasePayload.amount = updatedData.amount;
      if (updatedData.adminFee !== undefined) snakeCasePayload.admin_fee = updatedData.adminFee;
      if (updatedData.date !== undefined) snakeCasePayload.date = updatedData.date;
      if (updatedData.notes !== undefined) snakeCasePayload.notes = updatedData.notes;
      if (updatedData.productId !== undefined) snakeCasePayload.product_id = updatedData.productId;
      if (updatedData.fromWalletId !== undefined) snakeCasePayload.from_wallet_id = updatedData.fromWalletId;
      if (updatedData.toWalletId !== undefined) snakeCasePayload.to_wallet_id = updatedData.toWalletId;
      if (updatedData.debtId !== undefined) snakeCasePayload.debt_id = updatedData.debtId;
      
      const { error } = await supabase
        .from("transactions")
        .update(snakeCasePayload)
        .eq("id", id);

      if (error) {
        console.error("Failed to update transaction:", error);
        return;
      }

      // Step 1: Reverse the old transaction's wallet balance changes
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (oldTx.type === "income" && oldTx.toWalletId === w.id) {
            const newBalance = w.balance - oldTx.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (oldTx.type === "expense" && oldTx.fromWalletId === w.id) {
            const newBalance = w.balance + oldTx.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (oldTx.type === "transfer") {
            if (oldTx.fromWalletId === w.id) {
              const newBalance = w.balance + oldTx.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
            if (oldTx.toWalletId === w.id) {
              const newBalance = w.balance - oldTx.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
          }
          return w;
        });
      });

      // Step 2: Apply the new transaction's wallet balance changes
      const newTx = { ...oldTx, ...updatedData };
      setWallets(prevWallets => {
        return prevWallets.map(w => {
          if (newTx.type === "income" && newTx.toWalletId === w.id) {
            const newBalance = w.balance + newTx.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (newTx.type === "expense" && newTx.fromWalletId === w.id) {
            const newBalance = w.balance - newTx.amount;
            syncWalletBalance(w.id, newBalance);
            return { ...w, balance: newBalance };
          }
          if (newTx.type === "transfer") {
            if (newTx.fromWalletId === w.id) {
              const newBalance = w.balance - newTx.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
            if (newTx.toWalletId === w.id) {
              const newBalance = w.balance + newTx.amount;
              syncWalletBalance(w.id, newBalance);
              return { ...w, balance: newBalance };
            }
          }
          return w;
        });
      });

      // Step 3: Update the transaction in the array
      setTransactions(prev => prev.map(t => t.id === id ? newTx : t));
    } catch (e) {
      console.error("Failed to update transaction:", e);
    }
  };
  const addProduct = async (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    };

    if (!supabase) {
      // Fallback to local state only
      setProducts(prev => [...prev, newProduct]);
      return;
    }

    try {
      // Build snake_case payload for Supabase
      const payload = {
        barcode: newProduct.barcode,
        name: newProduct.name,
        category: newProduct.category,
        cost_price: newProduct.costPrice,
        selling_price: newProduct.sellingPrice,
        stock: newProduct.stock,
        status: newProduct.status,
        expired_date: newProduct.expiredDate,
      };
      const { error } = await supabase
        .from("products")
        .insert(payload);

      if (error) {
        console.error("Failed to add product:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setProducts(prev => [...prev, newProduct]);
    } catch (e) {
      console.error("Failed to add product:", e);
    }
  };

  const editProduct = async (productId: string, updates: Partial<Product>) => {
    if (!supabase) {
      // Fallback to local state only
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
      );
      return;
    }

    try {
      // Build snake_case payload for Supabase
      const payload: any = {};
      if (updates.barcode !== undefined) payload.barcode = updates.barcode;
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) payload.selling_price = updates.sellingPrice;
      if (updates.stock !== undefined) payload.stock = updates.stock;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.expiredDate !== undefined) payload.expired_date = updates.expiredDate;

      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", productId);

      if (error) {
        console.error("Failed to update product:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
      );
    } catch (e) {
      console.error("Failed to update product:", e);
    }
  };

  const updateInvestment = async (id: string, updatedData: Partial<Investment>) => {
    if (!supabase) {
      // Fallback to local state only
      setInvestments(prev =>
        prev.map(inv => (inv.id === id ? { ...inv, ...updatedData } : inv))
      );
      return;
    }

    try {
      // Build snake_case payload for Supabase
      const payload: any = {};
      if (updatedData.name !== undefined) payload.name = updatedData.name;
      if (updatedData.type !== undefined) payload.type = updatedData.type;
      if (updatedData.quantity !== undefined) payload.quantity = updatedData.quantity;
      if (updatedData.averageBuyPrice !== undefined) payload.average_buy_price = updatedData.averageBuyPrice;
      if (updatedData.currentPrice !== undefined) payload.current_price = updatedData.currentPrice;

      const { error } = await supabase
        .from("investments")
        .update(payload)
        .eq("id", id);

      if (error) {
        console.error("Failed to update investment:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setInvestments(prev =>
        prev.map(inv => (inv.id === id ? { ...inv, ...updatedData } : inv))
      );
    } catch (e) {
      console.error("Failed to update investment:", e);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!supabase) {
      // Fallback to local state only
      setProducts(prev => prev.filter(p => p.id !== productId));
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        console.error("Failed to delete product:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (e) {
      console.error("Failed to delete product:", e);
    }
  };

  // Debt CRUD operations
  const addDebt = async (debt: Omit<Debt, "id" | "status">) => {
    const newDebt: Debt = {
      ...debt,
      id: Date.now().toString(),
      status: "unpaid",
    };

    if (!supabase) {
      // Fallback to local state only
      setDebts(prev => [...prev, newDebt]);
      return;
    }

    try {
      // Build snake_case payload for Supabase
      const payload = {
        person_name: newDebt.personName,
        type: newDebt.type,
        amount: newDebt.amount,
        status: newDebt.status,
        notes: newDebt.notes,
      };
      const { error } = await supabase
        .from("debts")
        .insert(payload);

      if (error) {
        console.error("Failed to add debt:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setDebts(prev => [...prev, newDebt]);
    } catch (e) {
      console.error("Failed to add debt:", e);
    }
  };

  const deleteDebt = async (debtId: string) => {
    if (!supabase) {
      // Fallback to local state only
      setDebts(prev => prev.filter(d => d.id !== debtId));
      return;
    }

    try {
      const { error } = await supabase
        .from("debts")
        .delete()
        .eq("id", debtId);

      if (error) {
        console.error("Failed to delete debt:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setDebts(prev => prev.filter(d => d.id !== debtId));
    } catch (e) {
      console.error("Failed to delete debt:", e);
    }
  };

  // Settle debt (mark as paid) with wallet update and transaction record
  const settleDebt = async (debtId: string, walletId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) {
      console.error("Debt not found");
      return;
    }

    // Mark debt as paid
    setDebts(prev =>
      prev.map(d => (d.id === debtId ? { ...d, status: "paid" } : d))
    );

    // Update wallet based on debt type
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (w.id === walletId) {
          if (debt.type === "payable") {
            // Paying a debt: decrease wallet
            const newBalance = w.balance - debt.amount;
            syncWalletBalance(walletId, newBalance);
            return { ...w, balance: newBalance };
          } else {
            // Receiving payment: increase wallet
            const newBalance = w.balance + debt.amount;
            syncWalletBalance(walletId, newBalance);
            return { ...w, balance: newBalance };
          }
        }
        return w;
      });
    });

    // Create a transaction record for the settlement (with debt_id for cascade tracking)
    if (debt.type === "receivable") {
      // Piutang settled = Income received
      const settleTx: Transaction = {
        id: Date.now().toString(),
        type: "income",
        category: "Debt Settlement / Bayar Piutang",
        amount: debt.amount,
        adminFee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Piutang settled: ${debt.personName}${debt.notes ? ` - ${debt.notes}` : ""}`,
        toWalletId: walletId,
        debtId: debtId,
      };
      await addTransaction(settleTx);
    } else {
      // Hutang settled = Expense paid
      const settleTx: Transaction = {
        id: Date.now().toString(),
        type: "expense",
        category: "Debt Payment / Bayar Hutang",
        amount: debt.amount,
        adminFee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Hutang paid: ${debt.personName}${debt.notes ? ` - ${debt.notes}` : ""}`,
        fromWalletId: walletId,
        debtId: debtId,
      };
      await addTransaction(settleTx);
    }
  };

// ... (rest of the code remains the same)
  const addCategory = async (category: Omit<Category, "id">) => {
    if (!supabase) {
      // Fallback jika Supabase gagal dimuat (hanya menggunakan state lokal)
      const newCategory: Category = {
        ...category,
        id: Date.now().toString(),
      };
      setCategories(prev => [...prev, newCategory]);
      return;
    }

    try {
      // 1. Siapkan data yang akan dikirim ke Supabase (tanpa ID, biarkan Supabase yang buat UUID-nya)
      const payload = {
        name: category.name,
        type: category.type,
        description: category.description,
      };
      
      // 2. Insert data, tambahkan .select() agar Supabase mengembalikan data yang berhasil dibuat
      const { data, error } = await supabase
        .from("categories")
        .insert(payload)
        .select()
        .single(); // Kita ambil satu baris data saja

      if (error) {
        console.error("Gagal menambah kategori:", error.message);
        alert("Gagal menambah kategori: " + error.message);
        return;
      }

      // 3. Jika berhasil, kita ambil data asli dari database (termasuk UUID)
      // dan masukkan ke dalam state agar langsung muncul di tabel UI
      if (data) {
        const newCategory: Category = {
          id: data.id, // Ini sekarang menggunakan UUID asli dari Supabase
          name: data.name,
          type: data.type,
          description: data.description,
        };
        setCategories(prev => [...prev, newCategory]);
      }
    } catch (e) {
      console.error("Terjadi kesalahan saat menambah kategori:", e);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!supabase) {
      // Fallback to local state only
      setCategories(prev => prev.filter(c => c.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Failed to delete category:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error("Failed to delete category:", e);
    }
  };

  const editCategory = async (id: string, updates: Partial<Category>) => {
    if (!supabase) {
      // Fallback to local state only
      setCategories(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates } : c))
      );
      return;
    }

    try {
      // Build snake_case payload for Supabase
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.description !== undefined) payload.description = updates.description;

      const { error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", id);

      if (error) {
        console.error("Failed to update category:", error);
        return;
      }

      // Update local state after successful Supabase operation
      setCategories(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates } : c))
      );
    } catch (e) {
      console.error("Failed to update category:", e);
    }
  };
// ==========================================
  // FUNGSI CRUD UNTUK WALLETS KE SUPABASE
  // ==========================================

  const addWallet = async (wallet: Omit<Wallet, "id">) => {
    if (!supabase) {
      // Jika Supabase tidak ada, simpan di state lokal saja
      const newWallet: Wallet = { ...wallet, id: Date.now().toString() };
      setWallets(prev => [...prev, newWallet]);
      return;
    }

    try {
      // Menyiapkan format data yang sesuai dengan kolom di Supabase (snake_case)
      const payload = {
        name: wallet.name,
        type: wallet.type,
        wallet_type: wallet.walletType,
        balance: wallet.balance,
      };

      const { data, error } = await supabase
        .from("wallets")
        .insert(payload)
        .select()
        .single(); // Mengambil kembali data yang baru dibuat beserta UUID aslinya

      if (error) {
        console.error("Gagal menambah wallet:", error);
        return;
      }

      if (data) {
        // Sinkronisasi data asli dari database ke tampilan UI
        const newWallet: Wallet = {
          id: data.id,
          name: data.name,
          type: data.type,
          walletType: data.wallet_type,
          balance: Number(data.balance),
        };
        setWallets(prev => [...prev, newWallet]);
      }
    } catch (e) {
      console.error("Kesalahan saat menambah wallet:", e);
    }
  };

  const editWallet = async (id: string, updates: Partial<Wallet>) => {
    if (!supabase) {
      setWallets(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
      return;
    }

    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.walletType !== undefined) payload.wallet_type = updates.walletType;
      if (updates.balance !== undefined) payload.balance = updates.balance;

      const { error } = await supabase
        .from("wallets")
        .update(payload)
        .eq("id", id);

      if (error) {
        console.error("Gagal mengubah wallet:", error);
        return;
      }

      setWallets(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
    } catch (e) {
      console.error("Kesalahan saat mengubah wallet:", e);
    }
  };

  const deleteWallet = async (id: string) => {
    if (!supabase) {
      setWallets(prev => prev.filter(w => w.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from("wallets")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Gagal menghapus wallet:", error);
        return;
      }

      setWallets(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      console.error("Kesalahan saat menghapus wallet:", e);
    }
  };
  const value = {
    wallets,
    setWallets,
    addWallet,
    editWallet,
    deleteWallet,
    transactions,
    setTransactions,
    products,
    setProducts,
    investments,
    setInvestments,
    debts,
    setDebts,
    categories,
    goldPrice,
    setGoldPrice,
    addCategory,
    deleteCategory,
    editCategory,
    handleTransfer,
    handleBankTransferService,
    handleCashWithdrawalService,
    handlePPOBTransaction,
    handleRepairPayment,
    handleProductSale,
    handleRestock,
    handleDebtPayment,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addProduct,
    editProduct,
    deleteProduct,
    updateInvestment,
    addDebt,
    deleteDebt,
    settleDebt,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinanceContext() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinanceContext must be used within FinanceProvider");
  }
  return context;
}
