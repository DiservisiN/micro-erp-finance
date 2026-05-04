"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
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
import { Pencil, Trash2, DownloadCloud, UploadCloud, MonitorSmartphone, Plus } from "lucide-react";
import { useFinanceContext } from "@/context/FinanceContext";
import { useAppContext } from "@/context/AppContext"; 
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("general");
  const supabase = getSupabaseClient();
  const [isRestoring, setIsRestoring] = useState(false);

  // 1. Mengambil data dari Global Context (Finance)
  const { 
    wallets, 
    categories, 
    products,       
    transactions,   
    debts,          
    investments,
    addCategory, 
    deleteCategory, 
    editCategory,
    addWallet,       
    editWallet,      
    deleteWallet     
  } = useFinanceContext();

  // 2. Mengambil data pengaturan navigasi dari Global Context (App)
  const { 
    isCompact, setIsCompact, 
    landingPage, setLandingPage, 
    menuItems, setMenuItems 
  } = useAppContext();

  // Category form state (Lokal)
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"inventory" | "expense">("inventory");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [editCategoryTarget, setEditCategoryTarget] = useState<typeof categories[0] | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryType, setEditCategoryType] = useState<"inventory" | "expense">("inventory");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");

  // Wallet modal state (Lokal)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<"business" | "personal">("business");
  const [walletCategory, setWalletCategory] = useState<"Bank" | "E-Wallet" | "Cash">("Bank");
  const [walletBalance, setWalletBalance] = useState("");
  const [editWalletTarget, setEditWalletTarget] = useState<typeof wallets[0] | null>(null);
  const [isSavingWallet, setIsSavingWallet] = useState(false);

  // --- HANDLER FUNCTIONS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryName) {
      await addCategory({
        name: categoryName,
        type: categoryType,
        description: categoryDescription
      });
      toast.success("Category added");
      setCategoryName("");
      setCategoryType("inventory");
      setCategoryDescription("");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if(window.confirm("Delete this category?")) {
      await deleteCategory(id);
      toast.success("Category deleted");
    }
  };

  const handleEditCategory = (category: typeof categories[0]) => {
    setEditCategoryTarget(category);
    setEditCategoryName(category.name);
    setEditCategoryType(category.type as "inventory" | "expense");
    setEditCategoryDescription(category.description || "");
    setIsCategoryEditOpen(true);
  };

  const handleSaveCategory = async () => {
    if (editCategoryTarget) {
      await editCategory(editCategoryTarget.id, {
        name: editCategoryName,
        type: editCategoryType,
        description: editCategoryDescription
      });
      toast.success("Category updated");
      setIsCategoryEditOpen(false);
      setEditCategoryTarget(null);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if(window.confirm("Delete this wallet?")) {
      await deleteWallet(id);
      toast.success("Wallet deleted");
    }
  };

  const handleEditWallet = (wallet: typeof wallets[0]) => {
    setEditWalletTarget(wallet);
    setWalletName(wallet.name);
    setWalletType(wallet.type);
    setWalletCategory(wallet.walletType);
    setWalletBalance(wallet.balance.toString());
    setIsWalletModalOpen(true);
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName || !walletBalance) return;
    
    setIsSavingWallet(true);

    if (editWalletTarget) {
      await editWallet(editWalletTarget.id, {
        name: walletName,
        type: walletType,
        walletType: walletCategory,
        balance: Number(walletBalance)
      });
      toast.success("Wallet updated");
    } else {
      await addWallet({
        name: walletName,
        type: walletType,
        walletType: walletCategory,
        balance: Number(walletBalance)
      });
      toast.success("Wallet added");
    }

    setWalletName("");
    setWalletType("business");
    setWalletCategory("Bank");
    setWalletBalance("");
    setEditWalletTarget(null);
    setIsSavingWallet(false);
    setIsWalletModalOpen(false);
  };

  const handleBackupData = () => {
    try {
      const backupData = {
        exportDate: new Date().toISOString(),
        wallets: wallets,
        categories: categories,
        products: products,
        transactions: transactions,
        debts: debts,
        investments: investments,
      };

      const dataString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `MicroERP_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Database backup downloaded successfully!");
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Failed to generate backup file.");
    }
  };

  const handleRestoreData = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";

    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!window.confirm("PERINGATAN KRITIKAL: Proses ini akan MENGHAPUS SEMUA DATA LAMA di database dan menggantinya dengan data dari file backup. Lanjutkan?")) {
        return;
      }

      setIsRestoring(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          if (!supabase) throw new Error("Supabase client tidak ditemukan!");
          
          const jsonText = event.target?.result as string;
          const data = JSON.parse(jsonText);

          if (!data.wallets || !data.transactions) {
            throw new Error("File backup tidak valid atau rusak.");
          }

          toast.success("Memulai proses restore data...");

          await supabase.from("transactions").delete().neq("id", "0");
          await supabase.from("products").delete().neq("id", "0");
          await supabase.from("debts").delete().neq("id", "0");
          await supabase.from("investments").delete().neq("id", "0");
          await supabase.from("categories").delete().neq("id", "0");
          await supabase.from("wallets").delete().neq("id", "0");

          if (data.wallets.length > 0) {
            const walletsPayload = data.wallets.map((w: any) => ({
              id: w.id, name: w.name, type: w.type, wallet_type: w.walletType, balance: w.balance
            }));
            await supabase.from("wallets").insert(walletsPayload);
          }

          if (data.categories?.length > 0) {
            const categoriesPayload = data.categories.map((c: any) => ({
              id: c.id, name: c.name, type: c.type, description: c.description
            }));
            await supabase.from("categories").insert(categoriesPayload);
          }

          if (data.products?.length > 0) {
            const productsPayload = data.products.map((p: any) => ({
              id: p.id, barcode: p.barcode || null, name: p.name, category: p.category || null, cost_price: p.costPrice, selling_price: p.sellingPrice, stock: p.stock, status: p.status, expired_date: p.expiredDate || null
            }));
            await supabase.from("products").insert(productsPayload);
          }

          if (data.debts?.length > 0) {
            const debtsPayload = data.debts.map((d: any) => ({
              id: d.id, person_name: d.personName, type: d.type, status: d.status, amount: d.amount, notes: d.notes || null
            }));
            await supabase.from("debts").insert(debtsPayload);
          }

          if (data.investments?.length > 0) {
            const investmentsPayload = data.investments.map((inv: any) => ({
              id: inv.id, name: inv.name, type: inv.type, quantity: inv.quantity, average_buy_price: inv.averageBuyPrice, current_price: inv.currentPrice
            }));
            await supabase.from("investments").insert(investmentsPayload);
          }

          if (data.transactions?.length > 0) {
            const transactionsPayload = data.transactions.map((t: any) => ({
              id: t.id, type: t.type, category: t.category || null, amount: t.amount, admin_fee: t.adminFee || 0, date: t.date, notes: t.notes || null, product_id: t.productId || null, from_wallet_id: t.fromWalletId || null, to_wallet_id: t.toWalletId || null, debt_id: t.debtId || null
            }));
            await supabase.from("transactions").insert(transactionsPayload);
          }

          toast.success("Restore berhasil! Memuat ulang aplikasi...");
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);

        } catch (error: any) {
          console.error("Restore Error:", error);
          toast.error("Gagal melakukan restore: " + error.message);
          setIsRestoring(false);
        }
      };

      reader.readAsText(file);
    };

    fileInput.click();
  };

  return (
    <div className="flex flex-col w-full gap-4 md:gap-6 bg-slate-50 dark:bg-[#020617] transition-colors duration-300 min-h-screen p-4 md:p-6 overflow-x-hidden">
      
      {/* TOP NAVIGATION BAR */}
      <div className="w-full overflow-x-auto bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-2 md:p-4 rounded-xl backdrop-blur-sm shadow-sm dark:shadow-none">
        <div className="flex flex-row min-w-max gap-4 md:gap-8 px-2">
          <button 
            onClick={() => setActiveTab("general")}
            className={`font-semibold pb-1.5 transition-colors text-sm md:text-base ${activeTab === "general" ? "text-orange-600 dark:text-orange-500 border-b-2 border-orange-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab("business")}
            className={`font-semibold pb-1.5 transition-colors text-sm md:text-base ${activeTab === "business" ? "text-orange-600 dark:text-orange-500 border-b-2 border-orange-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            Business & Categories
          </button>
          <button 
            onClick={() => setActiveTab("wallets")}
            className={`font-semibold pb-1.5 transition-colors text-sm md:text-base ${activeTab === "wallets" ? "text-orange-600 dark:text-orange-500 border-b-2 border-orange-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            Wallets
          </button>
          <button 
            onClick={() => setActiveTab("navigation")}
            className={`font-semibold pb-1.5 transition-colors text-sm md:text-base ${activeTab === "navigation" ? "text-orange-600 dark:text-orange-500 border-b-2 border-orange-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            App Preferences
          </button>
        </div>
      </div>

      {/* SETTINGS CONTENT */}
      <div className="w-full flex flex-col gap-4 md:gap-6">
        
        {/* KONTEN TAB GENERAL */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            
            <div className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 md:p-6 rounded-xl backdrop-blur-sm flex flex-col gap-4 h-fit shadow-sm dark:shadow-none">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">Theme & Display</h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Customize the visual appearance.</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors">
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">App Theme</span>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setTheme("light")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      theme === 'light' ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      theme === 'dark' ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      theme === 'system' ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    System
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <span className="text-sm text-slate-700 dark:text-slate-300">Currency Format</span>
                <span className="font-medium text-slate-900 dark:text-white">IDR (Rp)</span>
              </div>
            </div>

            <div className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 md:p-6 rounded-xl backdrop-blur-sm flex flex-col gap-4 h-fit shadow-sm dark:shadow-none">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">Data Management</h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Backup or restore your entire ERP database.</p>
              </div>
              
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/50 gap-3">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Export Database</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Download all data as JSON.</p>
                  </div>
                  <Button onClick={handleBackupData} variant="outline" className="w-full sm:w-auto border-orange-300 dark:border-orange-500/50 text-orange-600 dark:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-400 shadow-sm dark:shadow-none bg-white dark:bg-transparent">
                    <DownloadCloud className="h-4 w-4 mr-2" /> Backup
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/50 gap-3">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Import Database</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Restore from a previous backup file.</p>
                  </div>
                  <Button onClick={handleRestoreData} disabled={isRestoring} variant="outline" className="w-full sm:w-auto border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm dark:shadow-none bg-white dark:bg-transparent">
                    <UploadCloud className="h-4 w-4 mr-2" /> {isRestoring ? "Restoring..." : "Restore"}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* KONTEN TAB BUSINESS */}
        {activeTab === "business" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
            
            <div className="xl:col-span-1 w-full bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 md:p-6 h-fit shadow-sm dark:shadow-none">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-1">Add New Category</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mb-4">Create a new category tag.</p>
              <form className="grid gap-4" onSubmit={handleAddCategory}>
                <div className="grid gap-2">
                  <Label htmlFor="category-type" className="text-slate-700 dark:text-slate-300">Category Type</Label>
                  <select
                    id="category-type"
                    required
                    value={categoryType}
                    onChange={(event) => setCategoryType(event.target.value as "inventory" | "expense")}
                    className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  >
                    <option value="inventory">Inventory</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category-name" className="text-slate-700 dark:text-slate-300">Name</Label>
                  <Input
                    id="category-name"
                    required
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="e.g. Electronics"
                    className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category-description" className="text-slate-700 dark:text-slate-300">Description (Optional)</Label>
                  <Input
                    id="category-description"
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                    placeholder="Brief detail"
                    className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
                  />
                </div>
                <Button type="submit" className="w-full mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all">
                  Add Category
                </Button>
              </form>
            </div>

            <div className="xl:col-span-2 w-full bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 md:p-6 overflow-hidden shadow-sm dark:shadow-none">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-1">Manage Categories</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mb-4">View and edit your existing categories.</p>
              
              <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-800/50 rounded-lg">
                <Table className="min-w-[500px] w-full">
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <TableHead className="text-slate-500 dark:text-slate-400 w-[100px]">Type</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400">Description</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id} className="border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${category.type === 'inventory' ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/20' : 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20'}`}>
                            {category.type}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-white whitespace-nowrap">{category.name}</TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 text-xs max-w-[150px] truncate" title={category.description || ""}>{category.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditCategory(category)}
                              className="p-1.5 rounded-md text-slate-400 transition-all hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="p-1.5 rounded-md text-slate-400 transition-all hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* KONTEN TAB WALLETS */}
        {activeTab === "wallets" && (
          <div className="w-full flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900/40 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-none">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">Wallets & Accounts</h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your digital wallets, bank accounts, and cash.</p>
              </div>
              <button 
                onClick={() => {
                  setEditWalletTarget(null);
                  setWalletName("");
                  setWalletType("business");
                  setWalletCategory("Bank");
                  setWalletBalance("");
                  setIsWalletModalOpen(true);
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-[0_4px_14px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Wallet
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="group bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 rounded-xl backdrop-blur-sm hover:border-orange-300 dark:hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-50 dark:bg-slate-800/50 rounded-full blur-2xl group-hover:bg-orange-100 dark:group-hover:bg-orange-500/10 transition-colors"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="text-slate-900 dark:text-white font-medium tracking-wide">{wallet.name}</div>
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded">
                      {wallet.walletType}
                    </span>
                  </div>
                  <div className="mb-6 relative z-10">
                     <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Balance</p>
                     <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white truncate" title={formatRupiah(wallet.balance)}>
                        {formatRupiah(wallet.balance)}
                     </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-800/50 relative z-10">
                    <button
                      type="button"
                      onClick={() => handleEditWallet(wallet)}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-transparent"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWallet(wallet.id)}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:text-red-300 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KONTEN TAB NAVIGATION */}
        {activeTab === "navigation" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 md:p-6 rounded-xl backdrop-blur-sm h-fit space-y-6 shadow-sm dark:shadow-none">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">App Preferences</h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Customize how the application behaves.</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Default Landing Page</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Page to open after login.</p>
                  </div>
                  <select 
                    value={landingPage}
                    onChange={(e) => setLandingPage(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 w-full sm:w-auto focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="Dashboard">Dashboard</option>
                    <option value="POS / Kasir">POS / Kasir</option>
                    <option value="Transactions">Transactions</option>
                    <option value="Inventory">Inventory</option>
                  </select>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Compact Sidebar</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Use icons-only mode on desktop.</p>
                  </div>
                  <button
                    onClick={() => setIsCompact(!isCompact)}
                    className={`w-11 h-6 rounded-full transition-colors duration-300 ${isCompact ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'} relative`}
                  >
                    <span className={`block w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${isCompact ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-5 md:p-6 rounded-xl backdrop-blur-sm shadow-sm dark:shadow-none">
              <div className="mb-4 flex items-center gap-2">
                <MonitorSmartphone className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">Sidebar Menu Visibility</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Toggle items on your left sidebar.</p>
                </div>
              </div>
              <div className="space-y-2 border border-slate-200 dark:border-slate-800/50 rounded-lg overflow-hidden">
                {menuItems.map((item, index) => (
                  <div key={item.id} className={`flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${index !== menuItems.length - 1 ? 'border-b border-slate-200 dark:border-slate-700/30' : ''}`}>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                    <button
                      onClick={() => setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, visible: !m.visible } : m))}
                      className={`w-9 h-5 rounded-full transition-colors duration-300 ${item.visible ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'} relative`}
                    >
                      <span className={`block w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform duration-300 ${item.visible ? 'translate-x-4' : 'translate-x-[3px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

     {/* Wallet Dialog */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">{editWalletTarget ? "Edit Wallet" : "Add New Wallet"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 py-2" onSubmit={handleSaveWallet}>
            <div className="grid gap-2">
              <Label htmlFor="wallet-name" className="text-slate-700 dark:text-slate-300">Wallet Name</Label>
              <Input
                id="wallet-name"
                required
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>

            {/* DOKUMENTASI: Ini adalah kolom pilihan Business/Personal yang sebelumnya tersembunyi */}
            <div className="grid gap-2">
              <Label htmlFor="wallet-usage-type" className="text-slate-700 dark:text-slate-300">Wallet Usage (Type)</Label>
              <select
                id="wallet-usage-type"
                value={walletType}
                onChange={(e) => setWalletType(e.target.value as "business" | "personal")}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-orange-500/50"
              >
                <option value="business">Business / Toko</option>
                <option value="personal">Personal / Pribadi</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wallet-category" className="text-slate-700 dark:text-slate-300">Category</Label>
              <select
                id="wallet-category"
                value={walletCategory}
                onChange={(e) => setWalletCategory(e.target.value as "Bank" | "E-Wallet" | "Cash")}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-orange-500/50"
              >
                <option value="Bank">Bank</option>
                <option value="E-Wallet">E-Wallet</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wallet-balance" className="text-slate-700 dark:text-slate-300">Initial Balance</Label>
              <Input
                id="wallet-balance"
                required
                type="number"
                min="0"
                step="0.01"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsWalletModalOpen(false)} disabled={isSavingWallet} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingWallet} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all">
                {isSavingWallet ? "Saving..." : (editWalletTarget ? "Update" : "Create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryEditOpen} onOpenChange={setIsCategoryEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Edit Category</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 py-2" onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-type" className="text-slate-700 dark:text-slate-300">Category Type</Label>
              <select
                id="edit-category-type"
                value={editCategoryType}
                onChange={(e) => setEditCategoryType(e.target.value as "inventory" | "expense")}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-orange-500/50"
              >
                <option value="inventory">Inventory</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-name" className="text-slate-700 dark:text-slate-300">Category Name</Label>
              <Input
                id="edit-category-name"
                required
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-description" className="text-slate-700 dark:text-slate-300">Description</Label>
              <Input
                id="edit-category-description"
                value={editCategoryDescription}
                onChange={(e) => setEditCategoryDescription(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCategoryEditOpen(false)} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}