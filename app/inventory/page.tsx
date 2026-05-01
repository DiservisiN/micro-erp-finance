"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { formatRupiah } from "@/lib/utils";
import { useFinanceContext } from "@/context/FinanceContext";
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
  costPrice: number;
  sellingPrice: number;
  stock: number;
  expiredDate: string | null;
  status: string;
};

type Wallet = {
  id: string;
  name: string;
  walletType: string;
  balance: number;
};

type ProductFormState = {
  barcode: string;
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  stock: string;
  expiredDate: string;
  status: string;
  walletId: string;
};

type SortField = "name" | "category" | "costPrice" | "sellingPrice" | "stock" | "expiredDate";
type SortDirection = "asc" | "desc";

const initialFormState: ProductFormState = {
  barcode: "",
  name: "",
  category: "none",
  costPrice: "",
  sellingPrice: "",
  stock: "",
  expiredDate: "",
  status: "in_stock",
  walletId: "",
};

export default function InventoryPage() {
  const { products, addProduct, editProduct, deleteProduct, wallets, categories, addTransaction } = useFinanceContext();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const inventoryCategories = categories.filter(c => c.type === "inventory");

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "none",
    costPrice: "",
    sellingPrice: "",
    stock: "",
    expiredDate: "",
    status: "in_stock",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const costPrice = Number(formState.costPrice);
    const sellingPrice = Number(formState.sellingPrice);
    const stock = Number(formState.stock);
    const totalCost = costPrice * stock;
    const selectedWallet = wallets.find((w) => w.id === formState.walletId);

    if (selectedWallet && totalCost > 0) {
      if (selectedWallet.balance < totalCost) {
        toast.error("Insufficient wallet balance", {
          description: `Total cost ${formatRupiah(totalCost)} exceeds ${selectedWallet.name} balance of ${formatRupiah(selectedWallet.balance)}.`,
        });
        setIsSaving(false);
        return;
      }
    }

    await addProduct({
      barcode: formState.barcode.trim() || null,
      name: formState.name.trim(),
      category: formState.category === "none" ? null : formState.category.trim() || null,
      costPrice: costPrice,
      sellingPrice: sellingPrice,
      stock: stock,
      expiredDate: formState.expiredDate || null,
      status: formState.status || "in_stock",
    });

    if (selectedWallet && totalCost > 0) {
      await addTransaction({
        id: Date.now().toString(),
        type: "expense",
        category: "Initial Inventory",
        amount: totalCost,
        date: new Date().toISOString().split('T')[0],
        notes: `Purchased initial stock for ${formState.name.trim()}`,
        fromWalletId: selectedWallet.id,
      });
    }

    setFormState(initialFormState);
    setIsDialogOpen(false);
    setIsSaving(false);
    toast.success("Product added successfully");
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
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      stock: String(product.stock),
      expiredDate: product.expiredDate || "",
      status: product.status || "in_stock",
    });
    setIsEditOpen(true);
  }

  async function handleEditProduct() {
    if (!editTarget) return;
    setIsSavingEdit(true);

    await editProduct(editTarget.id, {
      name: editForm.name.trim(),
      category: editForm.category === "none" ? null : editForm.category.trim() || null,
      costPrice: Number(editForm.costPrice),
      sellingPrice: Number(editForm.sellingPrice),
      stock: Number(editForm.stock),
      expiredDate: editForm.expiredDate || null,
      status: editForm.status || "in_stock",
    });

    toast.success("Product updated successfully");
    setIsSavingEdit(false);
    setIsEditOpen(false);
    setEditTarget(null);
  }

  async function handleDeleteProduct(productId: string) {
    if (!window.confirm('Hapus produk ini?')) return;
    await deleteProduct(productId);
    toast.success("Product deleted successfully");
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
    <section className="space-y-6 bg-[#020617] min-h-screen p-4 md:p-6">
      {/* 1. Header Responsif: flex-col di mobile, flex-row di desktop */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 md:p-6">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-white">Inventory</h2>
          <p className="text-slate-400 text-xs md:text-sm">Manage and monitor products from FinanceContext.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportCsvDialog
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
            onImportComplete={() => {}}
          />
          <AddProductDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            formState={formState}
            onFormStateChange={setFormState}
            onSubmit={handleSubmit}
            isSaving={isSaving}
            wallets={wallets}
            categories={inventoryCategories}
          />
        </div>
      </div>

      <Tabs defaultValue="in-stock" className="space-y-4">
        <TabsList className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 w-full justify-start overflow-x-auto rounded-lg">
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
                {inventoryCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name.toLowerCase()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800/30 rounded-xl overflow-hidden">
            {/* 2. Pembungkus Tabel: overflow-x-auto mencegah tabel meluber di mobile */}
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
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
                      <SortButton label="Cost Price" isActive={sortField === "costPrice"} direction={sortDirection} onClick={() => toggleSort("costPrice")} />
                    </TableHead>
                    <TableHead className="text-slate-400 font-medium text-right">
                      <SortButton label="Selling Price" isActive={sortField === "sellingPrice"} direction={sortDirection} onClick={() => toggleSort("sellingPrice")} />
                    </TableHead>
                    <TableHead className="text-slate-400 font-medium text-right">
                      <SortButton label="Stock" isActive={sortField === "stock"} direction={sortDirection} onClick={() => toggleSort("stock")} />
                    </TableHead>
                    <TableHead className="text-slate-400 font-medium">Status</TableHead>
                    <TableHead className="text-slate-400 font-medium">
                      <SortButton label="Expired Date" isActive={sortField === "expiredDate"} direction={sortDirection} onClick={() => toggleSort("expiredDate")} />
                    </TableHead>
                    <TableHead className="text-slate-400 font-medium w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-slate-500 py-6">
                        No products found for current filters.
                      </TableCell>
                    </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                      <TableCell className="text-slate-300 whitespace-nowrap">{product.barcode ?? "-"}</TableCell>
                      <TableCell className="text-white font-medium whitespace-nowrap">{product.name}</TableCell>
                      <TableCell className="text-slate-400 whitespace-nowrap">{product.category ?? "-"}</TableCell>
                      <TableCell className="text-slate-300 text-right font-mono whitespace-nowrap">{formatRupiah(product.costPrice)}</TableCell>
                      <TableCell className="text-slate-300 text-right font-mono whitespace-nowrap">{formatRupiah(product.sellingPrice)}</TableCell>
                      <TableCell className="text-slate-300 text-right font-mono">{product.stock}</TableCell>
                      <TableCell className="whitespace-nowrap">
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
                      <TableCell className="text-slate-400 whitespace-nowrap">{product.expiredDate ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          title="Edit Product"
                          onClick={() => openEditProduct(product)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:text-orange-400 hover:bg-orange-500/10 mr-1"
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
          </div>
        </TabsContent>

        <TabsContent value="in-transit">
          <InTransitPanel products={inTransitProducts} onEdit={openEditProduct} />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-lg w-[95vw] md:w-full bg-slate-900 border-slate-800 text-white overflow-y-auto max-h-[90vh]">
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
                  {inventoryCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* 3. Input harga & stok responsif (1 kolom di HP, 3 kolom di desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-prod-cost" className="text-slate-300">Cost Price</Label>
                  <Input id="edit-prod-cost" type="number" min="0" step="0.01" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-prod-sell" className="text-slate-300">Selling Price</Label>
                  <Input id="edit-prod-sell" type="number" min="0" step="0.01" value={editForm.sellingPrice} onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-prod-stock" className="text-slate-300">Stock</Label>
                  <Input id="edit-prod-stock" type="number" min="0" step="1" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prod-expired" className="text-slate-300">Expired Date</Label>
                <Input id="edit-prod-expired" type="date" value={editForm.expiredDate} onChange={(e) => setEditForm({ ...editForm, expiredDate: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  wallets: Wallet[];
  categories: { id: string; name: string }[];
}) {
  const totalCost = (Number(formState.costPrice) || 0) * (Number(formState.stock) || 0);
  return (
   <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DOKUMENTASI: Menggunakan properti 'render' untuk menyesuaikan dengan definisi TypeScript komponen bawaan proyek */}
      <DialogTrigger render={<Button className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)]" />}>
        Add Product
      </DialogTrigger>
      {/* Batasi lebar dialog di HP */}
      <DialogContent className="max-w-lg w-[95vw] md:w-full bg-slate-900 border-slate-800 text-white overflow-y-auto max-h-[90vh]">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="costPrice" className="text-slate-300">Cost Price</Label>
              <Input
                id="costPrice"
                required
                type="number"
                min="0"
                step="0.01"
                value={formState.costPrice}
                className="bg-slate-800 border-slate-700 text-white"
                onChange={(event) => onFormStateChange({ ...formState, costPrice: event.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sellingPrice" className="text-slate-300">Selling Price</Label>
              <Input
                id="sellingPrice"
                required
                type="number"
                min="0"
                step="0.01"
                value={formState.sellingPrice}
                onChange={(event) => onFormStateChange({ ...formState, sellingPrice: event.target.value })}
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
            <Label htmlFor="expiredDate" className="text-slate-300">Expired Date</Label>
            <Input
              id="expiredDate"
              type="date"
              value={formState.expiredDate}
              onChange={(event) => onFormStateChange({ ...formState, expiredDate: event.target.value })}
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
                  {w.name} ({w.walletType}) - {formatRupiah(w.balance)}
                </option>
              ))}
            </select>
          </div>

          {totalCost > 0 && (
            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-3 text-sm break-words">
              <span className="text-slate-400">Total Cost: </span>
              <span className="font-semibold text-orange-400">{formatRupiah(totalCost)}</span>
              {formState.walletId && (
                <span className="text-xs text-slate-400 ml-1">→ will be deducted from wallet</span>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSaving} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all w-full md:w-auto">
              {isSaving ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InTransitPanel({
  products,
  onEdit,
}: {
  products: Product[];
  onEdit: (product: Product) => void;
}) {
  const { editProduct, deleteProduct, wallets, handleTransfer } = useFinanceContext();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Product | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [refundWalletId, setRefundWalletId] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  async function markAsReceived(productId: string) {
    setUpdatingId(productId);
    await editProduct(productId, { status: "in_stock" });
    toast.success("Product marked as received and moved to In Stock");
    setUpdatingId(null);
  }

  async function handleCancelOrder() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    const refundAmount = cancelTarget.costPrice * cancelTarget.stock;
    const selectedWallet = wallets.find((w) => w.id === refundWalletId);

    try {
      if (selectedWallet && refundAmount > 0) {
        await handleTransfer("system", selectedWallet.id, refundAmount);
      }

      await deleteProduct(cancelTarget.id);

      toast.success(
        selectedWallet
          ? `Order cancelled & ${formatRupiah(refundAmount)} refunded to ${selectedWallet.name}`
          : "Order cancelled successfully",
      );
      setIsCancelling(false);
      setIsCancelOpen(false);
      setCancelTarget(null);
      setRefundWalletId("");
    } catch {
      toast.error("An unexpected error occurred");
      setIsCancelling(false);
    }
  }

  const totalInTransit = products.reduce(
    (sum, p) => sum + Number(p.costPrice) * p.stock,
    0,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Goods that have been paid for but haven&apos;t arrived yet. This value is included in your Total Assets.
      </p>

      {products.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No products currently in transit.
        </div>
      ) : (
        <>
          {products.map((product) => {
            const value = Number(product.costPrice) * product.stock;
            return (
              <div
                key={product.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:border-orange-500/50 group"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
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
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-800 sm:border-none">
                  <div className="text-left sm:text-right mr-auto sm:mr-2">
                    <p className="text-sm font-semibold tracking-tight">{formatRupiah(value)}</p>
                    <p className="text-[11px] text-slate-500">@ {formatRupiah(product.costPrice)}/unit</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      title="Edit Product"
                      onClick={() => onEdit(product)}
                      className="p-1.5 md:p-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:text-orange-500 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Mark as Received"
                      disabled={updatingId === product.id}
                      onClick={() => markAsReceived(product.id)}
                      className="p-1.5 md:p-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:text-green-400 hover:border-green-500/50 hover:bg-green-500/10 hover:shadow-[0_0_10px_rgba(74,222,128,0.3)] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Cancel Order"
                      disabled={updatingId === product.id}
                      onClick={() => { setCancelTarget(product); setIsCancelOpen(true); }}
                      className="p-1.5 md:p-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
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

      <Dialog open={isCancelOpen} onOpenChange={(v) => { setIsCancelOpen(v); if (!v) { setCancelTarget(null); setRefundWalletId(""); } }}>
        <DialogContent className="max-w-md w-[95vw] md:w-full bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Cancel Order & Refund</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will permanently delete the product and optionally refund to a wallet.
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3 space-y-1 text-sm">
                <p><span className="text-slate-400">Product:</span> {cancelTarget.name}</p>
                <p><span className="text-slate-400">Qty:</span> {cancelTarget.stock}</p>
                <p>
                  <span className="text-slate-400">Refund Amount:</span>{" "}
                  <span className="font-semibold text-red-400">
                    {formatRupiah(Number(cancelTarget.costPrice) * cancelTarget.stock)}
                  </span>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="refund-wallet" className="text-slate-300">Refund Destination Wallet</Label>
                <select
                  id="refund-wallet"
                  value={refundWalletId}
                  onChange={(e) => setRefundWalletId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
                >
                  <option value="">No refund (delete only)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.walletType}) - {formatRupiah(w.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setIsCancelOpen(false); setCancelTarget(null); setRefundWalletId(""); }} disabled={isCancelling} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Go Back
            </Button>
            <Button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-red-600 text-white hover:bg-red-700 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all w-full sm:w-auto"
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
    <div className="space-y-2 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-300">Barcode Scanner</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen((current) => !current)}
          disabled={disabled}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          {isScannerOpen ? "Stop Camera" : "Scan Barcode"}
        </Button>
      </div>
      {isScannerOpen ? <div id={scannerContainerId} className="min-h-28 overflow-hidden rounded-md border border-slate-700" /> : null}
      {scannerError ? <p className="text-xs text-red-400">{scannerError}</p> : null}
    </div>
  );
}

function sortValue(product: Product, field: SortField): number | string {
  if (field === "stock") {
    return product.stock;
  }
  if (field === "costPrice") {
    return Number(product.costPrice);
  }
  if (field === "sellingPrice") {
    return Number(product.sellingPrice);
  }
  if (field === "expiredDate") {
    return product.expiredDate ?? "9999-12-31";
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
    <button type="button" className="flex items-center gap-1 text-left hover:text-white transition-colors" onClick={onClick}>
      {label}
      <span className="text-xs text-slate-500">{isActive ? (direction === "asc" ? "↑" : "↓") : ""}</span>
    </button>
  );
}

const CSV_TEMPLATE_HEADERS = ["name", "category", "costPrice", "sellingPrice", "stock", "status", "expiredDate"];
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
  onImportComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}) {
  const { addProduct } = useFinanceContext();
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
          const lineNum = idx + 2; 
          if (!row.name?.trim()) errors.push(`Row ${lineNum}: "name" is required.`);
          if (row.costPrice && isNaN(Number(row.costPrice))) errors.push(`Row ${lineNum}: "costPrice" must be a number.`);
          if (row.sellingPrice && isNaN(Number(row.sellingPrice))) errors.push(`Row ${lineNum}: "sellingPrice" must be a number.`);
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
    if (previewRows.length === 0 || validationErrors.length > 0) return;

    setIsImporting(true);

    for (const row of previewRows) {
      await addProduct({
        name: row.name?.trim() ?? "",
        category: row.category?.trim() || null,
        costPrice: Number(row.costPrice) || 0,
        sellingPrice: Number(row.sellingPrice) || 0,
        stock: Number(row.stock) || 0,
        status: ["in_stock", "in_transit"].includes(row.status?.trim()) ? row.status.trim() : "in_stock",
        expiredDate: row.expiredDate?.trim() || null,
        barcode: null,
      });
    }

    toast.success(`Successfully imported ${previewRows.length} product(s)`);
    resetState();
    onOpenChange(false);
    onImportComplete();
    setIsImporting(false);
  }

  return (
   <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      {/* DOKUMENTASI: Memisahkan properti render dan children (teks/icon) agar TypeScript dapat membaca strukturnya dengan benar */}
      <DialogTrigger
        render={
          <Button variant="outline" className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400" />
        }
      >
        <Upload className="mr-2 h-4 w-4" />
        Import CSV
      </DialogTrigger>
      {/* Mengatur batas lebar pop-up agar pas di layar kecil */}
      <DialogContent className="max-w-lg w-[95vw] md:w-full bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Import Products from CSV</DialogTitle>
          <DialogDescription className="text-slate-400">Upload a CSV file to bulk-add products to your inventory.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-400 transition-colors underline underline-offset-4"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </button>

          <div className="grid gap-2">
            <Label htmlFor="csv-file" className="text-slate-300">CSV File</Label>
            <Input
              id="csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="bg-slate-800 border-slate-700 text-white file:mr-3 file:rounded-md file:border-0 file:bg-orange-500/15 file:px-3 file:py-1 file:text-sm file:font-medium file:text-orange-500 hover:file:bg-orange-500/25"
            />
          </div>

          {validationErrors.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-red-500/50 bg-red-500/10 p-3">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">{err}</p>
              ))}
            </div>
          )}

          {previewRows.length > 0 && validationErrors.length === 0 && (
            <div className="rounded-md border border-slate-800 bg-slate-800/50 p-3 space-y-2">
              <p className="text-sm font-medium text-white">
                Preview: <span className="text-orange-500">{previewRows.length}</span> row(s) ready to import
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {previewRows.slice(0, 5).map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-700 pb-1">
                    <span className="font-medium text-slate-200">{row.name}</span>
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
            className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all w-full md:w-auto"
          >
            {isImporting ? "Importing..." : `Import ${previewRows.length} Product(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}