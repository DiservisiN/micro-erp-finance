"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, Download, CheckCircle2, XCircle, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Product = {
  id: string;
  barcode: string | null;
  name: string;
  category: string | null;
  cost_price: number | string;
  selling_price: number | string;
  stock: number;
  expired_date: string | null;
  status: string;
};

type Wallet = {
  id: string;
  name: string;
  type: string;
  balance: number | string;
};

type ProductFormState = {
  barcode: string;
  name: string;
  category: string;
  cost_price: string;
  selling_price: string;
  stock: string;
  expired_date: string;
  status: string;
  walletId: string;
};

type SortField = "name" | "category" | "cost_price" | "selling_price" | "stock" | "expired_date";
type SortDirection = "asc" | "desc";


const initialFormState: ProductFormState = {
  barcode: "",
  name: "",
  category: "none",
  cost_price: "",
  selling_price: "",
  stock: "",
  expired_date: "",
  status: "in_stock",
  walletId: "",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Edit product state
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "none",
    cost_price: "",
    selling_price: "",
    stock: "",
    expired_date: "",
    status: "in_stock",
  });

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, barcode, name, category, cost_price, selling_price, stock, expired_date, status")
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setProducts(data ?? []);
    setErrorMessage(null);
    setIsLoading(false);
  }, [supabase]);

  const loadCategories = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .eq("type", "inventory")
      .order("name", { ascending: true });
    if (error) {
      console.error("Failed to load categories:", error);
      return;
    }
    setCategories(data ?? []);
  }, [supabase]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    // Also load wallets
    async function loadWallets() {
      if (!supabase) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("wallets")
        .select("id, name, type, balance")
        .order("name", { ascending: true });
      setWallets((data ?? []) as Wallet[]);
    }
    loadWallets();
  }, [loadProducts, loadCategories, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      toast.error("Supabase is not configured.");
      return;
    }

    setIsSaving(true);

    const payload = {
      barcode: formState.barcode.trim() || null,
      name: formState.name.trim(),
      category: formState.category === "none" ? null : formState.category.trim() || null,
      cost_price: Number(formState.cost_price),
      selling_price: Number(formState.selling_price),
      stock: Number(formState.stock),
      expired_date: formState.expired_date || null,
      status: formState.status || "in_stock",
    };

    const totalCost = payload.cost_price * payload.stock;
    const selectedWallet = wallets.find((w) => w.id === formState.walletId);

    // Validate wallet balance if a wallet is selected
    if (selectedWallet && totalCost > 0) {
      const currentBalance = Number(selectedWallet.balance) || 0;
      if (currentBalance < totalCost) {
        toast.error("Insufficient wallet balance", {
          description: `Total cost ${formatRupiah(totalCost)} exceeds ${selectedWallet.name} balance of ${formatRupiah(currentBalance)}.`,
        });
        setIsSaving(false);
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 1. Insert the product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.from("products").insert(payload as any);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      toast.error("Failed to save product", { description: error.message });
      return;
    }

    // 2. If a wallet is selected, deduct balance and log transaction
    if (selectedWallet && totalCost > 0) {
      const newBalance = (Number(selectedWallet.balance) || 0) - totalCost;
      const walletUpdate = await sb
        .from("wallets")
        .update({ balance: newBalance } as any)
        .eq("id", selectedWallet.id);

      if (walletUpdate.error) {
        toast.error("Product saved but wallet deduction failed", { description: walletUpdate.error.message });
      } else {
        // 3. Log expense transaction
        await sb.from("transactions").insert({
          date: new Date().toISOString(),
          type: "inventory_purchase",
          amount: totalCost,
          from_wallet_id: selectedWallet.id,
          notes: `Purchase of ${payload.name} (${payload.stock}x @ ${formatRupiah(payload.cost_price)})`,
        } as any);

        // Update local wallet state
        setWallets((prev) =>
          prev.map((w) => (w.id === selectedWallet.id ? { ...w, balance: newBalance } : w)),
        );
      }
    }

    setFormState(initialFormState);
    setIsDialogOpen(false);
    setIsSaving(false);
    setErrorMessage(null);
    toast.success("Product added successfully");
    await loadProducts();
  }

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const list = products.filter((product) => {
      const isInStock = (product.status ?? "in_stock") === "in_stock";
      const matchesSearch =
        keyword.length === 0 ||
        product.name.toLowerCase().includes(keyword) ||
        (product.barcode ?? "").toLowerCase().includes(keyword) ||
        (product.category ?? "").toLowerCase().includes(keyword);
      const matchesCategory =
        categoryFilter === "all" || (product.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
      return isInStock && matchesSearch && matchesCategory;
    });

    const sorted = [...list].sort((a, b) => {
      const left = sortValue(a, sortField);
      const right = sortValue(b, sortField);

      if (left < right) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (left > right) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [products, searchTerm, categoryFilter, sortField, sortDirection]);

  const inTransitProducts = useMemo(
    () => products.filter((p) => p.status === "in_transit"),
    [products],
  );

  function openEditProduct(product: Product) {
    setEditTarget(product);
    setEditForm({
      name: product.name,
      category: product.category || "none",
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      stock: String(product.stock),
      expired_date: product.expired_date || "",
      status: product.status || "in_stock",
    });
    setIsEditOpen(true);
  }

  async function handleEditProduct() {
    if (!supabase || !editTarget) return;
    setIsSavingEdit(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("products").update({
      name: editForm.name.trim(),
      category: editForm.category === "none" ? null : editForm.category.trim() || null,
      cost_price: Number(editForm.cost_price),
      selling_price: Number(editForm.selling_price),
      stock: Number(editForm.stock),
      expired_date: editForm.expired_date || null,
      status: editForm.status || "in_stock",
    } as any).eq("id", editTarget.id);

    if (error) {
      toast.error("Failed to update product", { description: error.message });
      setIsSavingEdit(false);
      return;
    }

    toast.success("Product updated successfully");
    setIsSavingEdit(false);
    setIsEditOpen(false);
    setEditTarget(null);
    await loadProducts();
  }

  async function handleDeleteProduct(productId: string) {
    if (!window.confirm('Hapus produk ini?')) return;
    if (!supabase) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("products").delete().eq("id", productId);

    if (error) {
      toast.error("Failed to delete product", { description: error.message });
      return;
    }

    toast.success("Product deleted successfully");
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  }

  return (
    <section className="space-y-6 bg-[#020617] min-h-screen p-6">
      <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Inventory</h2>
          <p className="text-slate-400 text-sm">Manage and monitor products from your Supabase database.</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsvDialog
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
            supabase={supabase}
            onImportComplete={loadProducts}
          />
          <AddProductDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            formState={formState}
            onFormStateChange={setFormState}
            onSubmit={handleSubmit}
            isSaving={isSaving}
            wallets={wallets}
            categories={categories}
          />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Tabs defaultValue="in-stock" className="space-y-4">
        <TabsList className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50">
          <TabsTrigger value="in-stock" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">In Stock</TabsTrigger>
          <TabsTrigger value="in-transit" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
            In Transit
            {inTransitProducts.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.4)]">
                {inTransitProducts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ====== Tab 1: In Stock ====== */}
        <TabsContent value="in-stock" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-900/30 backdrop-blur-sm border border-slate-800/30 rounded-xl p-4">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, barcode, or category..."
              className="w-full md:max-w-md bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-slate-600"
            />
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
              <SelectTrigger className="w-full md:w-56 bg-slate-800/50 border-slate-700/50 text-white">
                <SelectValue placeholder="Filter category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name.toLowerCase()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800/30 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800/50 hover:bg-slate-800/30">
                  <TableHead className="text-slate-400 font-medium">Barcode</TableHead>
                  <TableHead className="text-slate-400 font-medium">
                    <SortButton label="Name" isActive={sortField === "name"} direction={sortDirection} onClick={() => toggleSort("name")} />
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium">
                    <SortButton label="Category" isActive={sortField === "category"} direction={sortDirection} onClick={() => toggleSort("category")} />
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">
                    <SortButton label="Cost Price" isActive={sortField === "cost_price"} direction={sortDirection} onClick={() => toggleSort("cost_price")} />
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">
                    <SortButton label="Selling Price" isActive={sortField === "selling_price"} direction={sortDirection} onClick={() => toggleSort("selling_price")} />
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">
                    <SortButton label="Stock" isActive={sortField === "stock"} direction={sortDirection} onClick={() => toggleSort("stock")} />
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium">Status</TableHead>
                  <TableHead className="text-slate-400 font-medium">
                    <SortButton label="Expired Date" isActive={sortField === "expired_date"} direction={sortDirection} onClick={() => toggleSort("expired_date")} />
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500">
                      Loading products...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500">
                      No products found for current filters.
                    </TableCell>
                  </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    <TableCell className="text-slate-300">{product.barcode ?? "-"}</TableCell>
                    <TableCell className="text-white font-medium">{product.name}</TableCell>
                    <TableCell className="text-slate-400">{product.category ?? "-"}</TableCell>
                    <TableCell className="text-slate-300 text-right font-mono">{formatRupiah(product.cost_price)}</TableCell>
                    <TableCell className="text-slate-300 text-right font-mono">{formatRupiah(product.selling_price)}</TableCell>
                    <TableCell className="text-slate-300 text-right font-mono">{product.stock}</TableCell>
                    <TableCell>
                      {product.status === "in_stock" ? (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-500/20">
                          In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400 border border-orange-500/20">
                          On the Way
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400">{product.expired_date ?? "-"}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        title="Edit Product"
                        onClick={() => openEditProduct(product)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:text-orange-400 hover:bg-orange-500/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete Product"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </TabsContent>

        {/* ====== Tab 2: In Transit ====== */}
        <TabsContent value="in-transit">
          <InTransitPanel products={inTransitProducts} isLoading={isLoading} supabase={supabase} onStatusChange={loadProducts} wallets={wallets} onEdit={openEditProduct} />
        </TabsContent>
      </Tabs>

      {/* ====== Edit Product Dialog ====== */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Product</DialogTitle>
            <DialogDescription className="text-slate-400">Update the product details below.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-prod-name" className="text-slate-300">Name</Label>
                <Input id="edit-prod-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prod-category" className="text-slate-300">Category</Label>
                <select
                  id="edit-prod-category"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
                >
                  <option value="none">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-prod-cost" className="text-slate-300">Cost Price</Label>
                  <Input id="edit-prod-cost" type="number" min="0" step="0.01" value={editForm.cost_price} onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-prod-sell" className="text-slate-300">Selling Price</Label>
                  <Input id="edit-prod-sell" type="number" min="0" step="0.01" value={editForm.selling_price} onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-prod-stock" className="text-slate-300">Stock</Label>
                  <Input id="edit-prod-stock" type="number" min="0" step="1" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prod-expired" className="text-slate-300">Expired Date</Label>
                <Input id="edit-prod-expired" type="date" value={editForm.expired_date} onChange={(e) => setEditForm({ ...editForm, expired_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prod-status" className="text-slate-300">Status</Label>
                <select
                  id="edit-prod-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="in_transit">In Transit</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} disabled={isSavingEdit} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
                <Button onClick={handleEditProduct} disabled={isSavingEdit} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AddProductDialog({
  open,
  onOpenChange,
  formState,
  onFormStateChange,
  onSubmit,
  isSaving,
  wallets,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formState: ProductFormState;
  onFormStateChange: (state: ProductFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaving: boolean;
  wallets: Wallet[];
  categories: { id: string; name: string }[];
}) {
  const totalCost = (Number(formState.cost_price) || 0) * (Number(formState.stock) || 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>Add Product</DialogTrigger>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add Product</DialogTitle>
          <DialogDescription className="text-slate-400">Create a new product record and scan barcode from camera.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <BarcodeScanner
            onDetected={(barcode) => onFormStateChange({ ...formState, barcode })}
            disabled={!open}
          />

          <div className="grid gap-2">
            <Label htmlFor="barcode" className="text-slate-300">Barcode</Label>
            <Input
              id="barcode"
              value={formState.barcode}
              onChange={(event) => onFormStateChange({ ...formState, barcode: event.target.value })}
              placeholder="Scan or enter barcode"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name" className="text-slate-300">Name</Label>
            <Input
              id="name"
              required
              value={formState.name}
              onChange={(event) => onFormStateChange({ ...formState, name: event.target.value })}
              placeholder="Product name"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category" className="text-slate-300">Category</Label>
            <select
              value={formState.category || "none"}
              onChange={(e) => onFormStateChange({ ...formState, category: e.target.value })}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="none">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cost_price" className="text-slate-300">Cost Price</Label>
              <Input
                id="cost_price"
                required
                type="number"
                min="0"
                step="0.01"
                value={formState.cost_price}
                className="bg-slate-800 border-slate-700 text-white"
                onChange={(event) => onFormStateChange({ ...formState, cost_price: event.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="selling_price" className="text-slate-300">Selling Price</Label>
              <Input
                id="selling_price"
                required
                type="number"
                min="0"
                step="0.01"
                value={formState.selling_price}
                onChange={(event) => onFormStateChange({ ...formState, selling_price: event.target.value })}
                placeholder="0.00"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock" className="text-slate-300">Stock</Label>
              <Input
                id="stock"
                required
                type="number"
                min="0"
                step="1"
                value={formState.stock}
                onChange={(event) => onFormStateChange({ ...formState, stock: event.target.value })}
                placeholder="0"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expired_date" className="text-slate-300">Expired Date</Label>
            <Input
              id="expired_date"
              type="date"
              value={formState.expired_date}
              onChange={(event) => onFormStateChange({ ...formState, expired_date: event.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-status" className="text-slate-300">Status</Label>
            <select
              id="product-status"
              value={formState.status}
              onChange={(e) => onFormStateChange({ ...formState, status: e.target.value })}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="in_stock">In Stock</option>
              <option value="in_transit">In Transit</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payment-wallet" className="text-slate-300">Payment Wallet</Label>
            <select
              id="payment-wallet"
              value={formState.walletId}
              onChange={(e) => onFormStateChange({ ...formState, walletId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="">No wallet deduction</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.type}) - {formatRupiah(w.balance)}
                </option>
              ))}
            </select>
          </div>

          {totalCost > 0 && (
            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-3 text-sm">
              <span className="text-slate-400">Total Cost: </span>
              <span className="font-semibold text-orange-400">{formatRupiah(totalCost)}</span>
              {formState.walletId && (
                <span className="text-xs text-slate-400 ml-2">→ will be deducted from wallet</span>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSaving} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
              {isSaving ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- In Transit Panel ---------- */
function InTransitPanel({
  products,
  isLoading,
  supabase,
  onStatusChange,
  wallets,
  onEdit,
}: {
  products: Product[];
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  onStatusChange: () => Promise<void>;
  wallets: Wallet[];
  onEdit: (product: Product) => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Product | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [refundWalletId, setRefundWalletId] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  async function markAsReceived(productId: string) {
    if (!supabase) return;
    setUpdatingId(productId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("products")
      .update({ status: "in_stock" } as any)
      .eq("id", productId);

    if (error) {
      toast.error("Failed to update status", { description: error.message });
      setUpdatingId(null);
      return;
    }

    toast.success("Product marked as received and moved to In Stock");
    setUpdatingId(null);
    await onStatusChange();
  }

  async function handleCancelOrder() {
    if (!supabase || !cancelTarget) return;
    setIsCancelling(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const refundAmount = Number(cancelTarget.cost_price) * cancelTarget.stock;
    const selectedWallet = wallets.find((w) => w.id === refundWalletId);

    try {
      // 1. Refund to wallet if selected
      if (selectedWallet && refundAmount > 0) {
        const newBalance = (Number(selectedWallet.balance) || 0) + refundAmount;
        const { error: walletError } = await sb
          .from("wallets")
          .update({ balance: newBalance } as any)
          .eq("id", selectedWallet.id);
        if (walletError) {
          toast.error("Failed to refund wallet", { description: walletError.message });
          setIsCancelling(false);
          return;
        }

        // 2. Log refund transaction
        await sb.from("transactions").insert({
          date: new Date().toISOString(),
          type: "refund",
          amount: refundAmount,
          to_wallet_id: selectedWallet.id,
          notes: `Refund for cancelled order: ${cancelTarget.name} (${cancelTarget.stock}x @ ${formatRupiah(cancelTarget.cost_price)})`,
        } as any);
      }

      // 3. Delete the product
      const { error: deleteError } = await sb
        .from("products")
        .delete()
        .eq("id", cancelTarget.id);

      if (deleteError) {
        toast.error("Failed to delete product", { description: deleteError.message });
        setIsCancelling(false);
        return;
      }

      toast.success(
        selectedWallet
          ? `Order cancelled & ${formatRupiah(refundAmount)} refunded to ${selectedWallet.name}`
          : "Order cancelled successfully",
      );
      setIsCancelling(false);
      setIsCancelOpen(false);
      setCancelTarget(null);
      setRefundWalletId("");
      await onStatusChange();
    } catch {
      toast.error("An unexpected error occurred");
      setIsCancelling(false);
    }
  }

  const totalInTransit = products.reduce(
    (sum, p) => sum + Number(p.cost_price) * p.stock,
    0,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Goods that have been paid for but haven&apos;t arrived yet. This value is included in your Total Assets.
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-slate-500">Loading in-transit products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No products currently in transit.
        </div>
      ) : (
        <>
          {products.map((product) => {
            const value = Number(product.cost_price) * product.stock;
            return (
              <div
                key={product.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:border-orange-500/50 group"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                      {product.name}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-500 uppercase tracking-wider animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.4)]">
                      On The Way
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Category: {product.category ?? "-"} · Qty: {product.stock}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-1">
                    <p className="text-sm font-semibold tracking-tight">{formatRupiah(value)}</p>
                    <p className="text-[11px] text-slate-500">@ {formatRupiah(product.cost_price)}/unit</p>
                  </div>
                  <button
                    type="button"
                    title="Edit Product"
                    onClick={() => onEdit(product)}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:text-orange-500 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Mark as Received"
                    disabled={updatingId === product.id}
                    onClick={() => markAsReceived(product.id)}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:text-green-400 hover:border-green-500/50 hover:bg-green-500/10 hover:shadow-[0_0_10px_rgba(74,222,128,0.3)] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Cancel Order"
                    disabled={updatingId === product.id}
                    onClick={() => { setCancelTarget(product); setIsCancelOpen(true); }}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Total In Transit: <span className="font-semibold text-orange-500">{formatRupiah(totalInTransit)}</span>
            </p>
          </div>
        </>
      )}

      {/* Cancel Order & Refund Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={(v) => { setIsCancelOpen(v); if (!v) { setCancelTarget(null); setRefundWalletId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order & Refund</DialogTitle>
            <DialogDescription>
              This will permanently delete the product and optionally refund to a wallet.
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Product:</span> {cancelTarget.name}</p>
                <p><span className="text-muted-foreground">Qty:</span> {cancelTarget.stock}</p>
                <p>
                  <span className="text-muted-foreground">Refund Amount:</span>{" "}
                  <span className="font-semibold text-red-400">
                    {formatRupiah(Number(cancelTarget.cost_price) * cancelTarget.stock)}
                  </span>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="refund-wallet">Refund Destination Wallet</Label>
                <select
                  id="refund-wallet"
                  value={refundWalletId}
                  onChange={(e) => setRefundWalletId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">No refund (delete only)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type}) - {formatRupiah(w.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setIsCancelOpen(false); setCancelTarget(null); setRefundWalletId(""); }} disabled={isCancelling}>
              Go Back
            </Button>
            <Button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-red-600 text-white hover:bg-red-700 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all"
            >
              {isCancelling ? "Processing..." : "Confirm Cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BarcodeScanner({ onDetected, disabled }: { onDetected: (barcode: string) => void; disabled?: boolean }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerContainerId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void | Promise<void> } | null>(null);
  const hasDetectedRef = useRef(false);

  useEffect(() => {
    async function startScanner() {
      if (!isScannerOpen || disabled) {
        return;
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode(scannerContainerId, { verbose: false });

      scannerRef.current = html5QrCode;
      hasDetectedRef.current = false;
      setScannerError(null);

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 120 } },
          (decodedText) => {
            if (hasDetectedRef.current) {
              return;
            }
            hasDetectedRef.current = true;
            onDetected(decodedText);
            setIsScannerOpen(false);
          },
          () => {},
        );
      } catch (error) {
        setScannerError(error instanceof Error ? error.message : "Failed to start barcode scanner.");
        setIsScannerOpen(false);
      }
    }

    async function stopScanner() {
      if (!scannerRef.current) {
        return;
      }

      try {
        await scannerRef.current.stop();
      } catch {
        // no-op
      }

      try {
        await scannerRef.current.clear();
      } catch {
        // no-op
      }

      scannerRef.current = null;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [disabled, isScannerOpen, onDetected, scannerContainerId]);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Barcode Scanner</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen((current) => !current)}
          disabled={disabled}
        >
          {isScannerOpen ? "Stop Camera" : "Scan Barcode"}
        </Button>
      </div>
      {isScannerOpen ? <div id={scannerContainerId} className="min-h-28 overflow-hidden rounded-md border" /> : null}
      {scannerError ? <p className="text-xs text-destructive">{scannerError}</p> : null}
    </div>
  );
}



function sortValue(product: Product, field: SortField): number | string {
  if (field === "stock") {
    return product.stock;
  }
  if (field === "cost_price") {
    return Number(product.cost_price);
  }
  if (field === "selling_price") {
    return Number(product.selling_price);
  }
  if (field === "expired_date") {
    return product.expired_date ?? "9999-12-31";
  }
  if (field === "category") {
    return (product.category ?? "").toLowerCase();
  }
  return product.name.toLowerCase();
}

function SortButton({
  label,
  isActive,
  direction,
  onClick,
}: {
  label: string;
  isActive: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button type="button" className="flex items-center gap-1 text-left hover:text-foreground" onClick={onClick}>
      {label}
      <span className="text-xs text-muted-foreground">{isActive ? (direction === "asc" ? "↑" : "↓") : ""}</span>
    </button>
  );
}

/* ---------- CSV Import Dialog ---------- */
const CSV_TEMPLATE_HEADERS = ["name", "category", "cost_price", "selling_price", "stock", "status", "expired_date"];
const CSV_TEMPLATE_SAMPLE = [
  ["Sample Product", "Electronics", "50000", "75000", "10", "in_stock", "2027-01-01"],
  ["Incoming Goods", "Household", "25000", "40000", "20", "in_transit", ""],
];

function downloadCsvTemplate() {
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const rows = CSV_TEMPLATE_SAMPLE.map((r) => r.join(","));
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ImportCsvDialog({
  open,
  onOpenChange,
  supabase,
  onImportComplete,
}: {
  open: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  onImportComplete: () => Promise<void>;
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setPreviewRows([]);
    setValidationErrors([]);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as Record<string, string>[];
        const errors: string[] = [];

        rows.forEach((row, idx) => {
          const lineNum = idx + 2; // 1-indexed + header
          if (!row.name?.trim()) errors.push(`Row ${lineNum}: "name" is required.`);
          if (row.cost_price && isNaN(Number(row.cost_price))) errors.push(`Row ${lineNum}: "cost_price" must be a number.`);
          if (row.selling_price && isNaN(Number(row.selling_price))) errors.push(`Row ${lineNum}: "selling_price" must be a number.`);
          if (row.stock && isNaN(Number(row.stock))) errors.push(`Row ${lineNum}: "stock" must be a number.`);
          if (row.status && !["in_stock", "in_transit"].includes(row.status.trim())) {
            errors.push(`Row ${lineNum}: "status" must be "in_stock" or "in_transit".`);
          }
        });

        setPreviewRows(rows);
        setValidationErrors(errors);
      },
      error(err) {
        toast.error("Failed to parse CSV", { description: err.message });
      },
    });
  }

  async function handleImport() {
    if (!supabase || previewRows.length === 0 || validationErrors.length > 0) return;

    setIsImporting(true);
    const payload = previewRows.map((row) => ({
      name: row.name?.trim() ?? "",
      category: row.category?.trim() || null,
      cost_price: Number(row.cost_price) || 0,
      selling_price: Number(row.selling_price) || 0,
      stock: Number(row.stock) || 0,
      status: ["in_stock", "in_transit"].includes(row.status?.trim()) ? row.status.trim() : "in_stock",
      expired_date: row.expired_date?.trim() || null,
      barcode: null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("products").insert(payload as any);

    if (error) {
      toast.error("Import failed", { description: error.message });
      setIsImporting(false);
      return;
    }

    toast.success(`Successfully imported ${payload.length} product(s)`);
    resetState();
    onOpenChange(false);
    await onImportComplete();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogTrigger
        render={
          <Button variant="outline" className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400" />
        }
      >
        <Upload className="mr-2 h-4 w-4" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file to bulk-add products to your inventory.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download template */}
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-400 transition-colors underline underline-offset-4"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </button>

          {/* File input */}
          <div className="grid gap-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="file:mr-3 file:rounded-md file:border-0 file:bg-orange-500/15 file:px-3 file:py-1 file:text-sm file:font-medium file:text-orange-500 hover:file:bg-orange-500/25"
            />
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-xs text-destructive">{err}</p>
              ))}
            </div>
          )}

          {/* Preview */}
          {previewRows.length > 0 && validationErrors.length === 0 && (
            <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Preview: <span className="text-orange-500">{previewRows.length}</span> row(s) ready to import
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {previewRows.slice(0, 5).map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted-foreground border-b border-slate-800/50 pb-1">
                    <span className="font-medium text-foreground">{row.name}</span>
                    <span>{row.status === "in_transit" ? "🚚 In Transit" : "📦 In Stock"}</span>
                  </div>
                ))}
                {previewRows.length > 5 && (
                  <p className="text-[11px] text-slate-500 text-center">...and {previewRows.length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isImporting || previewRows.length === 0 || validationErrors.length > 0}
            onClick={handleImport}
            className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all"
          >
            {isImporting ? "Importing..." : `Import ${previewRows.length} Product(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
