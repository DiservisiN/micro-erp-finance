"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Eye, EyeOff, Languages, Moon, Sun, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { navLinks } from "@/components/app-sidebar";

type WalletType = "business" | "personal";

type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  balance: number | string;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type NavItem = {
  href: string;
  label: string;
  visible: boolean;
};

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  
  // Language state
  const [language, setLanguage] = useState<"id" | "en">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("language") as "id" | "en") || "en";
    }
    return "en";
  });

  // Navigation state
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navItems");
      if (saved) {
        return JSON.parse(saved);
      }
      return navLinks.map(link => ({ ...link, visible: true }));
    }
    return navLinks.map(link => ({ ...link, visible: true }));
  });

  // Wallet state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [walletErrorMessage, setWalletErrorMessage] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<WalletType>("business");
  const [walletBalance, setWalletBalance] = useState("");
  const [editWalletTarget, setEditWalletTarget] = useState<Wallet | null>(null);
  const [isWalletEditOpen, setIsWalletEditOpen] = useState(false);
  const [isSavingWalletEdit, setIsSavingWalletEdit] = useState(false);
  const [editWalletName, setEditWalletName] = useState("");
  const [editWalletType, setEditWalletType] = useState<WalletType>("business");

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryErrorMessage, setCategoryErrorMessage] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [editCategoryTarget, setEditCategoryTarget] = useState<Category | null>(null);
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [isSavingCategoryEdit, setIsSavingCategoryEdit] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");

  // Navigation edit state
  const [editNavTarget, setEditNavTarget] = useState<NavItem | null>(null);
  const [isNavEditOpen, setIsNavEditOpen] = useState(false);
  const [editNavLabel, setEditNavLabel] = useState("");

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  // Load wallets
  const loadWallets = useCallback(async () => {
    if (!supabase) {
      setWalletErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsWalletLoading(false);
      return;
    }

    setIsWalletLoading(true);
    const { data, error } = await supabase
      .from("wallets")
      .select("id, name, type, balance")
      .order("name", { ascending: true });

    if (error) {
      setWalletErrorMessage(error.message);
      setIsWalletLoading(false);
      return;
    }

    setWallets((data ?? []) as Wallet[]);
    setWalletErrorMessage(null);
    setIsWalletLoading(false);
  }, [supabase]);

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!supabase) {
      setCategoryErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsCategoryLoading(false);
      return;
    }

    setIsCategoryLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setCategoryErrorMessage(error.message);
      setIsCategoryLoading(false);
      return;
    }

    setCategories((data ?? []) as Category[]);
    setCategoryErrorMessage(null);
    setIsCategoryLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadWallets();
    loadCategories();
  }, [loadWallets, loadCategories]);

  // Language toggle
  const toggleLanguage = () => {
    const newLang = language === "id" ? "en" : "id";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  // Navigation visibility toggle
  const toggleNavVisibility = (href: string) => {
    setNavItems(prev => {
      const updated = prev.map(item => 
        item.href === href ? { ...item, visible: !item.visible } : item
      );
      localStorage.setItem("navItems", JSON.stringify(updated));
      return updated;
    });
  };

  // Open nav edit dialog
  const openEditNav = (item: NavItem) => {
    setEditNavTarget(item);
    setEditNavLabel(item.label);
    setIsNavEditOpen(true);
  };

  // Save nav label
  const handleSaveNavLabel = () => {
    if (!editNavTarget) return;
    setNavItems(prev => {
      const updated = prev.map(item => 
        item.href === editNavTarget.href ? { ...item, label: editNavLabel } : item
      );
      localStorage.setItem("navItems", JSON.stringify(updated));
      return updated;
    });
    setIsNavEditOpen(false);
    setEditNavTarget(null);
    toast.success("Navigation item updated successfully");
  };

  // Wallet functions
  async function handleAddWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      toast.error("Supabase is not configured.");
      setWalletErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsSavingWallet(true);

    const payload = {
      name: walletName.trim(),
      type: walletType,
      balance: Number(walletBalance || "0"),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("wallets").insert(payload as any);

    if (error) {
      setWalletErrorMessage(error.message);
      toast.error("Failed to add wallet", { description: error.message });
      setIsSavingWallet(false);
      return;
    }

    setWalletName("");
    setWalletType("business");
    setWalletBalance("");
    toast.success("Wallet added successfully");
    setIsSavingWallet(false);
    await loadWallets();
  }

  function openEditWallet(wallet: Wallet) {
    setEditWalletTarget(wallet);
    setEditWalletName(wallet.name);
    setEditWalletType(wallet.type);
    setIsWalletEditOpen(true);
  }

  async function handleEditWallet() {
    if (!supabase || !editWalletTarget) return;
    setIsSavingWalletEdit(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb: any = supabase;
    const { error } = await sb.from("wallets").update({
      name: editWalletName.trim(),
      type: editWalletType,
    } as any).eq("id", editWalletTarget.id);

    if (error) {
      toast.error("Failed to update wallet", { description: error.message });
      setIsSavingWalletEdit(false);
      return;
    }

    toast.success("Wallet updated successfully");
    setIsSavingWalletEdit(false);
    setIsWalletEditOpen(false);
    setEditWalletTarget(null);
    await loadWallets();
  }

  async function handleDeleteWallet(id: string) {
    if (!supabase) return;
    if (!confirm("Are you sure you want to delete this wallet?")) return;

    const { error } = await supabase.from("wallets").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete wallet", { description: error.message });
      return;
    }

    toast.success("Wallet deleted successfully");
    await loadWallets();
  }

  // Category functions
  async function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      toast.error("Supabase is not configured.");
      setCategoryErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsSavingCategory(true);

    const payload = {
      name: categoryName.trim(),
      description: categoryDescription.trim() || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("categories").insert(payload as any);

    if (error) {
      setCategoryErrorMessage(error.message);
      toast.error("Failed to add category", { description: error.message });
      setIsSavingCategory(false);
      return;
    }

    setCategoryName("");
    setCategoryDescription("");
    toast.success("Category added successfully");
    setIsSavingCategory(false);
    await loadCategories();
  }

  function openEditCategory(category: Category) {
    setEditCategoryTarget(category);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || "");
    setIsCategoryEditOpen(true);
  }

  async function handleEditCategory() {
    if (!supabase || !editCategoryTarget) return;
    setIsSavingCategoryEdit(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb: any = supabase;
    const { error } = await sb.from("categories").update({
      name: editCategoryName.trim(),
      description: editCategoryDescription.trim() || null,
    } as any).eq("id", editCategoryTarget.id);

    if (error) {
      toast.error("Failed to update category", { description: error.message });
      setIsSavingCategoryEdit(false);
      return;
    }

    toast.success("Category updated successfully");
    setIsSavingCategoryEdit(false);
    setIsCategoryEditOpen(false);
    setEditCategoryTarget(null);
    await loadCategories();
  }

  async function handleDeleteCategory(id: string) {
    if (!supabase) return;
    if (!confirm("Are you sure you want to delete this category?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete category", { description: error.message });
      return;
    }

    toast.success("Category deleted successfully");
    await loadCategories();
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">Manage your app preferences, business settings, wallets, and navigation.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-orange-500" />
                Language
              </CardTitle>
              <CardDescription>Select your preferred language for the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="language-toggle">Language</Label>
                  <p className="text-sm text-muted-foreground">Switch between Indonesian and English</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${language === "en" ? "text-foreground" : "text-muted-foreground"}`}>EN</span>
                  <Switch
                    id="language-toggle"
                    checked={language === "id"}
                    onCheckedChange={toggleLanguage}
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <span className={`text-sm font-medium ${language === "id" ? "text-foreground" : "text-muted-foreground"}`}>ID</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-orange-500" />
                Theme
              </CardTitle>
              <CardDescription>Customize the appearance of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme-toggle">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-orange-500" />
                  <Switch
                    id="theme-toggle"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    className="data-[state=checked]:bg-orange-500"
                  />
                  <Moon className="h-4 w-4 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-4">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Add New Category</CardTitle>
              <CardDescription>Create a new inventory category.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleAddCategory}>
                <div className="grid gap-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    required
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="e.g. Electronics"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category-description">Description (Optional)</Label>
                  <Input
                    id="category-description"
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                    placeholder="e.g. Electronic devices and accessories"
                  />
                </div>
                <Button type="submit" disabled={isSavingCategory} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
                  {isSavingCategory ? "Saving..." : "Add Category"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {categoryErrorMessage ? <p className="text-sm text-destructive">{categoryErrorMessage}</p> : null}

          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Inventory Categories</CardTitle>
              <CardDescription>Manage your inventory categories.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCategoryLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Loading categories...
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No categories found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Edit Category"
                              onClick={() => openEditCategory(category)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-orange-500 hover:bg-orange-500/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete Category"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Add New Wallet</CardTitle>
              <CardDescription>Create a wallet with name, type, and initial balance.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-3" onSubmit={handleAddWallet}>
                <div className="grid gap-2">
                  <Label htmlFor="wallet-name">Name</Label>
                  <Input
                    id="wallet-name"
                    required
                    value={walletName}
                    onChange={(event) => setWalletName(event.target.value)}
                    placeholder="e.g. Main Cash"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wallet-type">Type</Label>
                  <select
                    id="wallet-type"
                    value={walletType}
                    onChange={(e) => setWalletType(e.target.value as WalletType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="business">Business</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wallet-balance">Initial Balance</Label>
                  <Input
                    id="wallet-balance"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={walletBalance}
                    onChange={(event) => setWalletBalance(event.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-3">
                  <Button type="submit" disabled={isSavingWallet} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
                    {isSavingWallet ? "Saving..." : "Add Wallet"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {walletErrorMessage ? <p className="text-sm text-destructive">{walletErrorMessage}</p> : null}

          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Wallet List</CardTitle>
              <CardDescription>All wallets currently stored in Supabase.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isWalletLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Loading wallets...
                      </TableCell>
                    </TableRow>
                  ) : wallets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No wallets found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    wallets.map((wallet) => (
                      <TableRow key={wallet.id}>
                        <TableCell>{wallet.name}</TableCell>
                        <TableCell className="capitalize">{wallet.type}</TableCell>
                        <TableCell>{formatRupiah(wallet.balance)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Edit Wallet"
                              onClick={() => openEditWallet(wallet)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-orange-500 hover:bg-orange-500/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete Wallet"
                              onClick={() => handleDeleteWallet(wallet.id)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation" className="space-y-4">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>Manage sidebar navigation items. Toggle visibility or rename items.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <div
                    key={item.href}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={item.visible}
                        onCheckedChange={() => toggleNavVisibility(item.href)}
                        className="data-[state=checked]:bg-orange-500"
                      />
                      <span className={`font-medium ${!item.visible ? "text-muted-foreground line-through" : ""}`}>
                        {item.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditNav(item)}
                      className="h-8 w-8 p-0 hover:bg-orange-500/10 hover:text-orange-500"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Wallet Dialog */}
      <Dialog open={isWalletEditOpen} onOpenChange={(v) => { setIsWalletEditOpen(v); if (!v) setEditWalletTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Wallet</DialogTitle>
          </DialogHeader>
          {editWalletTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-wallet-name">Name</Label>
                <Input id="edit-wallet-name" value={editWalletName} onChange={(e) => setEditWalletName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-wallet-type">Type</Label>
                <select
                  id="edit-wallet-type"
                  value={editWalletType}
                  onChange={(e) => setEditWalletType(e.target.value as WalletType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsWalletEditOpen(false); setEditWalletTarget(null); }} disabled={isSavingWalletEdit}>Cancel</Button>
                <Button onClick={handleEditWallet} disabled={isSavingWalletEdit} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
                  {isSavingWalletEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isCategoryEditOpen} onOpenChange={(v) => { setIsCategoryEditOpen(v); if (!v) setEditCategoryTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editCategoryTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category-name">Category Name</Label>
                <Input id="edit-category-name" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category-description">Description (Optional)</Label>
                <Input id="edit-category-description" value={editCategoryDescription} onChange={(e) => setEditCategoryDescription(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsCategoryEditOpen(false); setEditCategoryTarget(null); }} disabled={isSavingCategoryEdit}>Cancel</Button>
                <Button onClick={handleEditCategory} disabled={isSavingCategoryEdit} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
                  {isSavingCategoryEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Navigation Dialog */}
      <Dialog open={isNavEditOpen} onOpenChange={(v) => { setIsNavEditOpen(v); if (!v) setEditNavTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Navigation Item</DialogTitle>
          </DialogHeader>
          {editNavTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nav-label">Label</Label>
                <Input id="edit-nav-label" value={editNavLabel} onChange={(e) => setEditNavLabel(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsNavEditOpen(false); setEditNavTarget(null); }}>Cancel</Button>
                <Button onClick={handleSaveNavLabel} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
