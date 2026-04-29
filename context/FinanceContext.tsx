"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";

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
  admin_fee?: number | null;
  date: string;
  notes?: string | null;
  product_id?: string | null;
  from_wallet_id?: string | null;
  to_wallet_id?: string | null;
  debt_id?: string | null;
};

type Product = {
  id: string;
  barcode: string | null;
  name: string;
  category: string | null;
  cost_price: number;
  selling_price: number;
  stock: number;
  status: string;
  expired_date: string | null;
};

type Investment = {
  id: string;
  quantity: number;
  current_price: number;
};

type Debt = {
  id: string;
  person_name: string;
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
  addCategory: (category: Omit<Category, "id">) => void;
  deleteCategory: (id: string) => void;
  editCategory: (id: string, updates: Partial<Category>) => void;
  handleTransfer: (fromWalletId: string, toWalletId: string, amount: number, fee?: number) => void;
  handleBankTransferService: (bankWalletId: string, cashWalletId: string, amount: number, adminFee: number) => void;
  handleCashWithdrawalService: (cashWalletId: string, bankWalletId: string, amount: number, adminFee: number) => void;
  handlePPOBTransaction: (productName: string, cost: number, sellingPrice: number, sourceWalletId: string, destWalletId: string) => void;
  handleRepairPayment: (params: { repairId: string; finalFee: number; sparepartId?: string; walletId: string; note?: string }) => void;
  handleProductSale: (productId: string, quantity: number, sellingPrice: number, walletId: string) => void;
  handleRestock: (productId: string, quantity: number, costPrice: number, walletId: string) => void;
  handleDebtPayment: (debtId: string, amount: number, walletId: string) => void;
  addTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updatedData: Partial<Transaction>) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  editProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  updateInvestment: (id: string, updatedData: Partial<Investment>) => void;
  addDebt: (debt: Omit<Debt, "id" | "status">) => void;
  deleteDebt: (debtId: string) => void;
  settleDebt: (debtId: string, walletId: string) => void;
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
      cost_price: 10000,
      selling_price: 15000,
      stock: 20,
      status: "in_stock",
      expired_date: "2027-01-01",
    },
  ],
  investments: [
    { id: "1", quantity: 10, current_price: 5000000 },
  ],
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

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

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
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    const data = {
      wallets,
      transactions,
      products,
      investments,
      debts,
      categories,
      goldPrice,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [wallets, transactions, products, investments, debts, categories, goldPrice, isHydrated]);

  // Smart Action Handlers

  // Internal wallet-to-wallet transfer (for regular balance transfers)
  const handleTransfer = (fromWalletId: string, toWalletId: string, amount: number, fee: number = 0) => {
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

      return prevWallets.map(w => {
        if (w.id === fromWalletId) {
          return { ...w, balance: w.balance - amount - fee };
        }
        if (w.id === toWalletId) {
          return { ...w, balance: w.balance + amount };
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
      admin_fee: fee > 0 ? fee : null,
      date: new Date().toISOString().split('T')[0],
      notes: fee > 0 ? `Transfer with ${formatRupiah(fee)} fee` : "Balance transfer",
      from_wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
    };

    setTransactions(prev => [...prev, transferTransaction]);

    // If there's a fee, record it as income (expense for the sender)
    if (fee > 0) {
      const feeTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Transfer Fee",
        amount: fee,
        admin_fee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Transfer fee from ${fromWalletId} to ${toWalletId}`,
        from_wallet_id: fromWalletId,
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
      admin_fee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Transfer service: ${formatRupiah(amount)} from bank to customer`,
      from_wallet_id: bankWalletId,
      to_wallet_id: cashWalletId,
    };

    setTransactions(prev => [...prev, transferTransaction]);

    // Record the admin fee as INCOME
    if (adminFee > 0) {
      const feeTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Fee Jasa Transfer",
        amount: adminFee,
        admin_fee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Admin fee for transfer service`,
        to_wallet_id: cashWalletId,
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
      admin_fee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Cash withdrawal service: ${formatRupiah(amount)} given to customer`,
      from_wallet_id: cashWalletId,
      to_wallet_id: bankWalletId,
    };

    setTransactions(prev => [...prev, transferTransaction]);

    // Record the admin fee as INCOME
    if (adminFee > 0) {
      const feeTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Fee Tarik Tunai",
        amount: adminFee,
        admin_fee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Admin fee for cash withdrawal service`,
        to_wallet_id: bankWalletId,
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
      admin_fee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `PPOB cost for ${productName}`,
      from_wallet_id: sourceWalletId,
    };
    setTransactions(prev => [...prev, costTransaction]);

    // Record income transaction for profit only
    if (profit > 0) {
      const profitTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: "income",
        category: "Digital PPOB Profit",
        amount: profit,
        admin_fee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Profit from PPOB: ${productName} (Cost: ${formatRupiah(cost)}, Sell: ${formatRupiah(sellingPrice)})`,
        to_wallet_id: destWalletId,
      };
      setTransactions(prev => [...prev, profitTransaction]);
    }
  };

  // Repair Payment: Add fee to wallet, create income transaction, decrease sparepart stock
  const handleRepairPayment = ({ repairId, finalFee, sparepartId, walletId, note }: { repairId: string; finalFee: number; sparepartId?: string; walletId: string; note?: string }) => {
    // Add final fee to wallet balance
    setWallets(prevWallets => {
      const wallet = prevWallets.find(w => w.id === walletId);
      if (!wallet) {
        console.error("Invalid wallet ID for repair payment");
        return prevWallets;
      }
      return prevWallets.map(w => {
        if (w.id === walletId) {
          return { ...w, balance: w.balance + finalFee };
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
      admin_fee: null,
      date: new Date().toISOString().split('T')[0],
      notes: note || `Repair payment for repair ID: ${repairId}`,
      to_wallet_id: walletId,
    };
    setTransactions(prev => [...prev, incomeTransaction]);

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
      admin_fee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Sold ${quantity} units`,
      product_id: productId,
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
      admin_fee: null,
      date: new Date().toISOString().split('T')[0],
      notes: `Restocked ${quantity} units`,
      product_id: productId,
      from_wallet_id: walletId,
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
  const addTransaction = (transaction: Transaction) => {
    // Apply wallet balance changes based on transaction type
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (transaction.type === "income" && transaction.to_wallet_id === w.id) {
          // Income: add amount to wallet
          return { ...w, balance: w.balance + transaction.amount };
        }
        if (transaction.type === "expense" && transaction.from_wallet_id === w.id) {
          // Expense: subtract amount from wallet
          return { ...w, balance: w.balance - transaction.amount };
        }
        if (transaction.type === "transfer") {
          // Transfer: deduct from source, add to destination
          if (transaction.from_wallet_id === w.id) {
            return { ...w, balance: w.balance - transaction.amount };
          }
          if (transaction.to_wallet_id === w.id) {
            return { ...w, balance: w.balance + transaction.amount };
          }
        }
        return w;
      });
    });

    // Add the transaction to the array
    setTransactions(prev => [...prev, transaction]);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) {
      console.error("Transaction not found");
      return;
    }

    // Reverse the wallet balance changes
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (tx.type === "income" && tx.to_wallet_id === w.id) {
          // Income: subtract amount from wallet
          return { ...w, balance: w.balance - tx.amount };
        }
        if (tx.type === "expense" && tx.from_wallet_id === w.id) {
          // Expense: add amount back to wallet
          return { ...w, balance: w.balance + tx.amount };
        }
        if (tx.type === "transfer") {
          // Transfer: reverse the flow
          if (tx.from_wallet_id === w.id) {
            // Add back to source wallet
            return { ...w, balance: w.balance + tx.amount };
          }
          if (tx.to_wallet_id === w.id) {
            // Subtract from destination wallet
            return { ...w, balance: w.balance - tx.amount };
          }
        }
        return w;
      });
    });

    // Cascade: If this was a debt settlement transaction, revert the debt to unpaid
    const cat = (tx.category || "").toLowerCase();
    const isDebtSettlement = cat.includes("debt settlement") || cat.includes("bayar piutang") || cat.includes("debt payment") || cat.includes("bayar hutang");
    if (isDebtSettlement) {
      if (tx.debt_id) {
        // Direct link via debt_id
        setDebts(prev => prev.map(d => d.id === tx.debt_id ? { ...d, status: "unpaid" as const } : d));
      } else {
        // Fallback: match by person name extracted from notes and amount
        const personMatch = (tx.notes || "").match(/(?:settled|paid):\s*(.+?)(?:\s*-|$)/i);
        if (personMatch) {
          const personName = personMatch[1].trim().toLowerCase();
          setDebts(prev => prev.map(d => {
            if (
              d.status === "paid" &&
              d.amount === tx.amount &&
              d.person_name.toLowerCase() === personName
            ) {
              return { ...d, status: "unpaid" as const };
            }
            return d;
          }));
        }
      }
    }

    // Remove the transaction
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id: string, updatedData: Partial<Transaction>) => {
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) {
      console.error("Transaction not found");
      return;
    }

    // Step 1: Reverse the old transaction's wallet balance changes
    setWallets(prevWallets => {
      return prevWallets.map(w => {
        if (oldTx.type === "income" && oldTx.to_wallet_id === w.id) {
          return { ...w, balance: w.balance - oldTx.amount };
        }
        if (oldTx.type === "expense" && oldTx.from_wallet_id === w.id) {
          return { ...w, balance: w.balance + oldTx.amount };
        }
        if (oldTx.type === "transfer") {
          if (oldTx.from_wallet_id === w.id) {
            return { ...w, balance: w.balance + oldTx.amount };
          }
          if (oldTx.to_wallet_id === w.id) {
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
        if (newTx.type === "income" && newTx.to_wallet_id === w.id) {
          return { ...w, balance: w.balance + newTx.amount };
        }
        if (newTx.type === "expense" && newTx.from_wallet_id === w.id) {
          return { ...w, balance: w.balance - newTx.amount };
        }
        if (newTx.type === "transfer") {
          if (newTx.from_wallet_id === w.id) {
            return { ...w, balance: w.balance - newTx.amount };
          }
          if (newTx.to_wallet_id === w.id) {
            return { ...w, balance: w.balance + newTx.amount };
          }
        }
        return w;
      });
    });

    // Step 3: Update the transaction in the array
    setTransactions(prev => prev.map(t => t.id === id ? newTx : t));
  };
  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const editProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
    );
  };

  const updateInvestment = (id: string, updatedData: Partial<Investment>) => {
    setInvestments(prev =>
      prev.map(inv => (inv.id === id ? { ...inv, ...updatedData } : inv))
    );
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Debt CRUD operations
  const addDebt = (debt: Omit<Debt, "id" | "status">) => {
    const newDebt: Debt = {
      ...debt,
      id: Date.now().toString(),
      status: "unpaid",
    };
    setDebts(prev => [...prev, newDebt]);
  };

  const deleteDebt = (debtId: string) => {
    setDebts(prev => prev.filter(d => d.id !== debtId));
  };

  // Settle debt (mark as paid) with wallet update and transaction record
  const settleDebt = (debtId: string, walletId: string) => {
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
            return { ...w, balance: w.balance - debt.amount };
          } else {
            // Receiving payment: increase wallet
            return { ...w, balance: w.balance + debt.amount };
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
        admin_fee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Piutang settled: ${debt.person_name}${debt.notes ? ` - ${debt.notes}` : ""}`,
        to_wallet_id: walletId,
        debt_id: debtId,
      };
      setTransactions(prev => [...prev, settleTx]);
    } else {
      // Hutang settled = Expense paid
      const settleTx: Transaction = {
        id: Date.now().toString(),
        type: "expense",
        category: "Debt Payment / Bayar Hutang",
        amount: debt.amount,
        admin_fee: null,
        date: new Date().toISOString().split('T')[0],
        notes: `Hutang paid: ${debt.person_name}${debt.notes ? ` - ${debt.notes}` : ""}`,
        from_wallet_id: walletId,
        debt_id: debtId,
      };
      setTransactions(prev => [...prev, settleTx]);
    }
  };

  // Category CRUD operations
  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const editCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const value = {
    wallets,
    setWallets,
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
