"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, Trash2, X } from "lucide-react";
import { useFinanceContext } from "@/context/FinanceContext";

export default function SettingsPage() {
  // State untuk melacak tab mana yang sedang aktif
  const [activeTab, setActiveTab] = useState("general");

  // Use FinanceContext for wallets and categories
  const { wallets, setWallets, categories, addCategory, deleteCategory, editCategory } = useFinanceContext();

  // Category form state
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"inventory" | "expense">("inventory");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [editCategoryTarget, setEditCategoryTarget] = useState<typeof categories[0] | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryType, setEditCategoryType] = useState<"inventory" | "expense">("inventory");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");

  // Wallet modal state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<"business" | "personal">("business");
  const [walletCategory, setWalletCategory] = useState<"Bank" | "E-Wallet" | "Cash">("Bank");
  const [walletBalance, setWalletBalance] = useState("");
  const [editWalletTarget, setEditWalletTarget] = useState<typeof wallets[0] | null>(null);

  // Navigation preferences state
  const [landingPage, setLandingPage] = useState("Dashboard");
  const [isCompact, setIsCompact] = useState(false);

  // Sidebar menu state
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([
    { id: "dashboard", name: "Dashboard", visible: true },
    { id: "inventory", name: "Inventory", visible: true },
    { id: "repairs", name: "Repairs", visible: true },
    { id: "transactions", name: "Transactions", visible: true },
    { id: "reports", name: "Reports", visible: true },
    { id: "debts", name: "Debts", visible: true },
    { id: "investments", name: "Investments", visible: true },
    { id: "settings", name: "Settings", visible: true },
  ]);

  // Handler functions
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryName) {
      addCategory({
        name: categoryName,
        type: categoryType,
        description: categoryDescription
      });
      setCategoryName("");
      setCategoryType("inventory");
      setCategoryDescription("");
    }
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory(id);
  };

  const handleEditCategory = (category: typeof categories[0]) => {
    setEditCategoryTarget(category);
    setEditCategoryName(category.name);
    setEditCategoryType(category.type as "inventory" | "expense");
    setEditCategoryDescription(category.description || "");
    setIsCategoryEditOpen(true);
  };

  const handleSaveCategory = () => {
    if (editCategoryTarget) {
      editCategory(editCategoryTarget.id, {
        name: editCategoryName,
        type: editCategoryType,
        description: editCategoryDescription
      });
      setIsCategoryEditOpen(false);
      setEditCategoryTarget(null);
    }
  };

  const handleDeleteWallet = (id: string) => {
    setWallets(wallets.filter(w => w.id !== id));
  };

  const handleEditWallet = (wallet: typeof wallets[0]) => {
    setEditWalletTarget(wallet);
    setWalletName(wallet.name);
    setWalletType(wallet.type);
    setWalletCategory(wallet.walletType);
    setWalletBalance(wallet.balance.toString());
    setIsWalletModalOpen(true);
  };

  return (
    <div className="flex flex-col w-full gap-6 p-6 text-slate-200">
      
      {/* 1. TOP NAVIGATION BAR */}
      <div className="w-full flex flex-row gap-8 bg-slate-900/40 border border-slate-800/50 p-4 rounded-xl backdrop-blur-sm">
        <button 
          onClick={() => setActiveTab("general")}
          className={`font-semibold pb-1 transition-colors ${activeTab === "general" ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-200"}`}
        >
          General
        </button>
        <button 
          onClick={() => setActiveTab("business")}
          className={`font-semibold pb-1 transition-colors ${activeTab === "business" ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-200"}`}
        >
          Business
        </button>
        <button 
          onClick={() => setActiveTab("wallets")}
          className={`font-semibold pb-1 transition-colors ${activeTab === "wallets" ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-200"}`}
        >
          Wallets
        </button>
        <button 
          onClick={() => setActiveTab("navigation")}
          className={`font-semibold pb-1 transition-colors ${activeTab === "navigation" ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-200"}`}
        >
          Navigation
        </button>
      </div>

      {/* 2. SETTINGS CONTENT */}
      <div className="w-full flex flex-col gap-6">
        
        {/* === KONTEN TAB GENERAL === */}
        {activeTab === "general" && (
          <>
            <div className="w-full bg-slate-900/40 border border-slate-800/50 p-6 rounded-xl backdrop-blur-sm flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Language</h3>
                <p className="text-sm text-slate-400">Select your preferred language for the application.</p>
              </div>
              <div className="flex gap-4 items-center">
                <span className="font-bold text-white">EN</span>
                <span className="text-slate-500">ID</span>
              </div>
            </div>

            <div className="w-full bg-slate-900/40 border border-slate-800/50 p-6 rounded-xl backdrop-blur-sm flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Theme</h3>
                <p className="text-sm text-slate-400">Customize the appearance of the application.</p>
              </div>
              <div className="flex gap-4 items-center text-orange-500">
                <span>Light</span>
                <span className="font-bold">Dark</span>
              </div>
            </div>
          </>
        )}

        {/* === KONTEN TAB BUSINESS === */}
        {activeTab === "business" && (
          <>
            {/* Add New Category Form */}
            <div className="w-full bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Add New Category</h3>
              <p className="text-slate-400 text-sm mb-4">Create a new category for inventory or expenses.</p>
              <form className="grid gap-4" onSubmit={handleAddCategory}>
                <div className="grid gap-2">
                  <Label htmlFor="category-type" className="text-slate-300">Category Type</Label>
                  <select
                    id="category-type"
                    required
                    value={categoryType}
                    onChange={(event) => setCategoryType(event.target.value as "inventory" | "expense")}
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white ring-offset-background focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500 transition-all"
                  >
                    <option value="inventory">Inventory</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category-name" className="text-slate-300">Category Name</Label>
                  <Input
                    id="category-name"
                    required
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="e.g. Electronics"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category-description" className="text-slate-300">Description (Optional)</Label>
                  <Input
                    id="category-description"
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                    placeholder="e.g. Electronic devices and accessories"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
                  Add Category
                </Button>
              </form>
            </div>

            {/* Categories Table */}
            <div className="w-full bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Categories</h3>
              <p className="text-slate-400 text-sm mb-4">Manage your inventory and expense categories.</p>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800/50">
                    <TableHead className="text-slate-300">Type</TableHead>
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300">Description</TableHead>
                    <TableHead className="text-slate-300 w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.type === 'inventory' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'}`}>
                          {category.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-300">{category.name}</TableCell>
                      <TableCell className="text-slate-400">{category.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Edit Category"
                            onClick={() => handleEditCategory(category)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:text-orange-400 hover:bg-orange-500/10"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Category"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:text-red-400 hover:bg-red-500/10"
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
          </>
        )}

        {/* === KONTEN TAB WALLETS === */}
        {activeTab === "wallets" && (
          <div className="w-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Wallets & Accounts</h3>
                <p className="text-sm text-slate-400">Manage your digital wallets, bank accounts, and cash.</p>
              </div>
              <button 
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-5 py-2 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                + Add Wallet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-xl backdrop-blur-sm hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-slate-200 font-medium">{wallet.name}</div>
                    <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded">{wallet.walletType}</span>
                  </div>
                  <div className="text-2xl font-mono text-white mb-4">Rp {wallet.balance.toLocaleString('id-ID')}</div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      title="Edit Wallet"
                      onClick={() => handleEditWallet(wallet)}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:text-orange-400 hover:bg-orange-500/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete Wallet"
                      onClick={() => handleDeleteWallet(wallet.id)}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              
              <div 
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-xl backdrop-blur-sm hover:border-slate-700 transition-colors flex items-center justify-center border-dashed cursor-pointer hover:bg-slate-800/30"
              >
                <span className="text-slate-400 font-medium">+ Add New</span>
              </div>
            </div>
          </div>
        )}

        {/* === KONTEN TAB NAVIGATION === */}
        {activeTab === "navigation" && (
          <div className="w-full flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Navigation Preferences</h3>
              <p className="text-sm text-slate-400">Customize how the application behaves and navigates.</p>
            </div>

            <div className="w-full bg-slate-900/40 border border-slate-800/50 p-6 rounded-xl backdrop-blur-sm flex justify-between items-center">
              <div>
                <h4 className="text-white font-medium">Default Landing Page</h4>
                <p className="text-sm text-slate-400">Choose which page opens immediately after logging in.</p>
              </div>
              <select 
                value={landingPage}
                onChange={(e) => setLandingPage(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option>Dashboard</option>
                <option>Transactions</option>
                <option>Inventory</option>
                <option>Repairs</option>
              </select>
            </div>

            <div className="w-full bg-slate-900/40 border border-slate-800/50 p-6 rounded-xl backdrop-blur-sm flex justify-between items-center">
              <div>
                <h4 className="text-white font-medium">Compact Sidebar</h4>
                <p className="text-sm text-slate-400">Use icons-only mode for the sidebar navigation.</p>
              </div>
              <button
                onClick={() => setIsCompact(!isCompact)}
                className={`w-12 h-6 rounded-full transition-colors duration-200 ${isCompact ? 'bg-orange-500' : 'bg-slate-700'} relative`}
              >
                <span className={`block w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${isCompact ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="w-full bg-slate-900/40 border border-slate-800/50 p-6 rounded-xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-white font-medium">Sidebar Menu Items</h4>
                  <p className="text-sm text-slate-400">Toggle visibility of sidebar menu items.</p>
                </div>
              </div>
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg border border-slate-800/50">
                    <span className="text-slate-200">{item.name}</span>
                    <button
                      onClick={() => setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, visible: !m.visible } : m))}
                      className={`w-10 h-5 rounded-full transition-colors duration-200 ${item.visible ? 'bg-orange-500' : 'bg-slate-700'} relative`}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${item.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Wallet Add/Edit Dialog */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editWalletTarget ? "Edit Wallet" : "Add New Wallet"}</DialogTitle>
          </DialogHeader>
          <form 
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (walletName && walletBalance) {
                if (editWalletTarget) {
                  setWallets(wallets.map(w => 
                    w.id === editWalletTarget.id 
                      ? { ...w, name: walletName, type: walletType, walletType: walletCategory, balance: Number(walletBalance) }
                      : w
                  ));
                } else {
                  setWallets([...wallets, {
                    id: Date.now().toString(),
                    name: walletName,
                    type: walletType,
                    walletType: walletCategory,
                    balance: Number(walletBalance)
                  }]);
                }
                setWalletName("");
                setWalletType("business");
                setWalletCategory("Bank");
                setWalletBalance("");
                setEditWalletTarget(null);
                setIsWalletModalOpen(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="wallet-name" className="text-slate-300">Wallet Name</Label>
              <Input
                id="wallet-name"
                required
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="e.g. BCA Utama"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wallet-category" className="text-slate-300">Category</Label>
              <select
                id="wallet-category"
                value={walletCategory}
                onChange={(e) => setWalletCategory(e.target.value as "Bank" | "E-Wallet" | "Cash")}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white ring-offset-background focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500 transition-all"
              >
                <option value="Bank">Bank</option>
                <option value="E-Wallet">E-Wallet</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wallet-balance" className="text-slate-300">Initial Balance</Label>
              <Input
                id="wallet-balance"
                required
                type="number"
                min="0"
                step="0.01"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWalletModalOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all"
              >
                {editWalletTarget ? "Save Changes" : "Add Wallet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isCategoryEditOpen} onOpenChange={setIsCategoryEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Category</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-type" className="text-slate-300">Category Type</Label>
              <select
                id="edit-category-type"
                value={editCategoryType}
                onChange={(e) => setEditCategoryType(e.target.value as "inventory" | "expense")}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white ring-offset-background focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500 transition-all"
              >
                <option value="inventory">Inventory</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-name" className="text-slate-300">Category Name</Label>
              <Input
                id="edit-category-name"
                required
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-description" className="text-slate-300">Description (Optional)</Label>
              <Input
                id="edit-category-description"
                value={editCategoryDescription}
                onChange={(e) => setEditCategoryDescription(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCategoryEditOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}