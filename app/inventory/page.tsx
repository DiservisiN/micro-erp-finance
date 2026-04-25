"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
};

type ProductFormState = {
  barcode: string;
  name: string;
  category: string;
  cost_price: string;
  selling_price: string;
  stock: string;
  expired_date: string;
};

type SortField = "name" | "category" | "cost_price" | "selling_price" | "stock" | "expired_date";
type SortDirection = "asc" | "desc";

const categoryOptions = ["Food", "Beverage", "Electronics", "Household", "Health", "Other"];

const initialFormState: ProductFormState = {
  barcode: "",
  name: "",
  category: "none",
  cost_price: "",
  selling_price: "",
  stock: "",
  expired_date: "",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
      .select("id, barcode, name, category, cost_price, selling_price, stock, expired_date")
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

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("products").insert(payload as any);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      toast.error("Failed to save product", { description: error.message });
      return;
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
      const matchesSearch =
        keyword.length === 0 ||
        product.name.toLowerCase().includes(keyword) ||
        (product.barcode ?? "").toLowerCase().includes(keyword) ||
        (product.category ?? "").toLowerCase().includes(keyword);
      const matchesCategory =
        categoryFilter === "all" || (product.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
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

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Inventory</h2>
          <p className="text-muted-foreground">Manage and monitor products from your Supabase database.</p>
        </div>
        <AddProductDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          formState={formState}
          onFormStateChange={setFormState}
          onSubmit={handleSubmit}
          isSaving={isSaving}
        />
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by name, barcode, or category..."
          className="w-full md:max-w-md"
        />
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Filter category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem key={category} value={category.toLowerCase()}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Barcode</TableHead>
            <TableHead>
              <SortButton label="Name" isActive={sortField === "name"} direction={sortDirection} onClick={() => toggleSort("name")} />
            </TableHead>
            <TableHead>
              <SortButton label="Category" isActive={sortField === "category"} direction={sortDirection} onClick={() => toggleSort("category")} />
            </TableHead>
            <TableHead>
              <SortButton label="Cost Price" isActive={sortField === "cost_price"} direction={sortDirection} onClick={() => toggleSort("cost_price")} />
            </TableHead>
            <TableHead>
              <SortButton label="Selling Price" isActive={sortField === "selling_price"} direction={sortDirection} onClick={() => toggleSort("selling_price")} />
            </TableHead>
            <TableHead>
              <SortButton label="Stock" isActive={sortField === "stock"} direction={sortDirection} onClick={() => toggleSort("stock")} />
            </TableHead>
            <TableHead>
              <SortButton label="Expired Date" isActive={sortField === "expired_date"} direction={sortDirection} onClick={() => toggleSort("expired_date")} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Loading products...
              </TableCell>
            </TableRow>
          ) : filteredProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No products found for current filters.
              </TableCell>
            </TableRow>
          ) : (
            filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.barcode ?? "-"}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category ?? "-"}</TableCell>
                <TableCell>{formatRupiah(product.cost_price)}</TableCell>
                <TableCell>{formatRupiah(product.selling_price)}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>{product.expired_date ?? "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formState: ProductFormState;
  onFormStateChange: (state: ProductFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>Add Product</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>Create a new product record and scan barcode from camera.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <BarcodeScanner
            onDetected={(barcode) => onFormStateChange({ ...formState, barcode })}
            disabled={!open}
          />

          <div className="grid gap-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={formState.barcode}
              onChange={(event) => onFormStateChange({ ...formState, barcode: event.target.value })}
              placeholder="Scan or enter barcode"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={formState.name}
              onChange={(event) => onFormStateChange({ ...formState, name: event.target.value })}
              placeholder="Product name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              value={formState.category || "none"}
              onChange={(e) => onFormStateChange({ ...formState, category: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="none">No Category</option>
              <option value="Food">Food</option>
              <option value="Beverage">Beverage</option>
              <option value="Electronics">Electronics</option>
              <option value="Household">Household</option>
              <option value="Health">Health</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                required
                type="number"
                min="0"
                step="0.01"
                value={formState.cost_price}
                onChange={(event) => onFormStateChange({ ...formState, cost_price: event.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="selling_price">Selling Price</Label>
              <Input
                id="selling_price"
                required
                type="number"
                min="0"
                step="0.01"
                value={formState.selling_price}
                onChange={(event) => onFormStateChange({ ...formState, selling_price: event.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                required
                type="number"
                min="0"
                step="1"
                value={formState.stock}
                onChange={(event) => onFormStateChange({ ...formState, stock: event.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expired_date">Expired Date</Label>
            <Input
              id="expired_date"
              type="date"
              value={formState.expired_date}
              onChange={(event) => onFormStateChange({ ...formState, expired_date: event.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
