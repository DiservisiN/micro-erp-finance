"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircleIcon, WalletIcon, TrendingUpIcon, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import { useFinanceContext } from "@/context/FinanceContext";

type InvestmentType = "gold" | "bibit";

type Investment = {
  id: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
};

export default function InvestmentsPage() {
  const { 
    wallets, 
    goldPrice, 
    setGoldPrice, 
    updateInvestment,
    investments,        
    setInvestments      
  } = useFinanceContext();

  const [isSaving, setIsSaving] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<InvestmentType>("gold");
  const [editQuantity, setEditQuantity] = useState("");
  const [editAverageBuyPrice, setEditAverageBuyPrice] = useState("");
  const [editCurrentPrice, setEditCurrentPrice] = useState("");

  useEffect(() => {
    if (editingInvestment) {
      setEditName(editingInvestment.name || "");
      setEditType(editingInvestment.type || "gold");
      setEditQuantity(String(editingInvestment.quantity || ""));
      setEditAverageBuyPrice(String(editingInvestment.averageBuyPrice || ""));
      setEditCurrentPrice(String(editingInvestment.currentPrice || ""));
    } else {
      setEditName("");
      setEditType("gold");
      setEditQuantity("");
      setEditAverageBuyPrice("");
      setEditCurrentPrice("");
    }
  }, [editingInvestment]);

  const [name, setName] = useState("");
  const [type, setType] = useState<InvestmentType>("gold");
  const [quantity, setQuantity] = useState("");
  const [averageBuyPrice, setAverageBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const supabase = getSupabaseClient();

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingInvestment) return;

    setIsSaving(true);
    const updatedData = {
      name: editName.trim(),
      type: editType,
      quantity: Number(editQuantity || "0"),
      averageBuyPrice: Number(editAverageBuyPrice || "0"),
      currentPrice: Number(editCurrentPrice || "0"),
    };

    await updateInvestment(editingInvestment.id, updatedData);

    toast.success("Investment updated successfully");
    setIsSaving(false);
    setEditingInvestment(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: name.trim(),
      type,
      quantity: Number(quantity || "0"),
      average_buy_price: Number(averageBuyPrice || "0"),
      current_price: Number(currentPrice || "0"),
    };

    const { data, error } = await supabase
      .from("investments")
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast.error("Failed to add investment", { description: error.message });
      setIsSaving(false);
      return;
    }

    if (data) {
      const newInvestment: Investment = {
        id: data.id,
        name: data.name,
        type: data.type as InvestmentType,
        quantity: Number(data.quantity),
        averageBuyPrice: Number(data.average_buy_price),
        currentPrice: Number(data.current_price),
      };
      setInvestments([...investments, newInvestment]);
    }

    toast.success("Investment added");
    setName("");
    setType("gold");
    setQuantity("");
    setAverageBuyPrice("");
    setCurrentPrice("");
    setIsSaving(false);
  }

  async function handleDeleteInvestment(id: string) {
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    if (!confirm("Are you sure you want to delete this investment?")) return;

    const { error } = await supabase.from("investments").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete investment", { description: error.message });
      return;
    }

    setInvestments(investments.filter((inv) => inv.id !== id));
    toast.success("Investment deleted");
  }

  const totalLiquidCash = wallets
    .filter((wallet) => wallet.type === "business" || wallet.type === "personal")
    .reduce((sum, wallet) => sum + safeNumber(wallet.balance), 0);

  const totalGoldValue = investments
    .filter((item) => item.type === "gold")
    .reduce((sum, item) => sum + safeNumber(item.quantity) * safeNumber(item.currentPrice), 0);

  const totalWealth = totalLiquidCash + totalGoldValue;
  const nishab = 85 * safeNumber(goldPrice);
  const hasReachedNishab = totalWealth >= nishab;
  const estimatedZakat = hasReachedNishab ? totalWealth * 0.025 : 0;

  return (
    <div className="flex flex-col w-full gap-4 md:gap-6 bg-slate-50 dark:bg-[#020617] transition-colors duration-300 min-h-screen p-4 md:p-6 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 w-full shadow-sm dark:shadow-none">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">Investments</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Track investment performance and calculate Zakat Mal eligibility.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 w-full">
        
        {/* KOTAK KIRI: ZAKAT MAL CALCULATOR */}
        <div className="bg-orange-50/50 dark:bg-slate-900/50 backdrop-blur-sm border border-orange-200 dark:border-orange-500/30 ring-1 ring-orange-100 dark:ring-orange-500/10 rounded-xl p-4 md:p-6 w-full shadow-sm dark:shadow-[0_0_15px_rgba(249,115,22,0.05)]">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Zakat Mal Calculator</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Formula: Nishab = 85 x Current Gold Price. Zakat due is 2.5% when wealth reaches Nishab.</p>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-gold-price" className="text-slate-700 dark:text-slate-300">Current Gold Price per Gram</Label>
              <Input
                id="current-gold-price"
                type="number"
                min="0"
                step="1"
                value={goldPrice}
                onChange={(event) => setGoldPrice(Number(event.target.value))}
                className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50 w-full"
              />
            </div>
            
            <div className="grid gap-3 md:grid-cols-2 pt-2 border-t border-orange-200 dark:border-slate-800/50">
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Total Liquid Cash: <span className="font-semibold text-slate-900 dark:text-white ml-1">{formatRupiah(totalLiquidCash)}</span></p>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Total Gold Value: <span className="font-semibold text-slate-900 dark:text-white ml-1">{formatRupiah(totalGoldValue)}</span></p>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Total Wealth: <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-1">{formatRupiah(totalWealth)}</span></p>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Nishab Boundary: <span className="font-semibold text-orange-600 dark:text-orange-400 ml-1">{formatRupiah(nishab)}</span></p>
            </div>

            {hasReachedNishab ? (
              <Alert className="border-red-200 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 mt-4">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Nishab Reached</AlertTitle>
                <AlertDescription className="text-xs md:text-sm text-red-600 dark:text-red-300">
                  Your wealth has reached Nishab. Estimated Zakat Mal (2.5%):{" "}
                  <span className="font-semibold text-red-700 dark:text-red-400">{formatRupiah(estimatedZakat)}</span>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 mt-4 shadow-sm dark:shadow-none">
                <AlertTitle>Below Nishab</AlertTitle>
                <AlertDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Your current tracked wealth has not reached Nishab yet.</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* KOTAK KANAN: ADD INVESTMENT */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 w-full shadow-sm dark:shadow-none">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Investment</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Insert a new investment entry.</p>
          </div>
          
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="investment-name" className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                id="investment-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Antam Gold"
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="investment-type" className="text-slate-700 dark:text-slate-300">Type</Label>
              <select
                id="investment-type"
                value={type}
                onChange={(e) => setType(e.target.value as InvestmentType)}
                className="w-full flex h-10 items-center justify-between rounded-md border border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-orange-500/50"
              >
                <option value="gold">Gold</option>
                <option value="bibit">Bibit (Reksadana)</option>
              </select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="quantity" className="text-slate-700 dark:text-slate-300">Quantity (Grams/Units)</Label>
              <Input
                id="quantity"
                required
                type="number"
                min="0"
                step="0.0001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="0"
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="avg-buy-price" className="text-slate-700 dark:text-slate-300">Avg. Buy Price (Rp)</Label>
              <Input
                id="avg-buy-price"
                required
                type="number"
                min="0"
                step="0.01"
                value={averageBuyPrice}
                onChange={(event) => setAverageBuyPrice(event.target.value)}
                placeholder="0.00"
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="current-price" className="text-slate-700 dark:text-slate-300">Current Price (Rp)</Label>
              <Input
                id="current-price"
                required
                type="number"
                min="0"
                step="0.01"
                value={currentPrice}
                onChange={(event) => setCurrentPrice(event.target.value)}
                placeholder="0.00"
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
              />
            </div>
            
            <div className="md:col-span-2 mt-2">
              <Button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.3)] transition-all"
              >
                {isSaving ? "Saving..." : "Add Investment"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-4 mt-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">Digital Wallets & Investments</h3>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Monitor your active accounts and investment performance.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
          {wallets.map((wallet) => (
            <div 
              key={wallet.id} 
              className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/50 p-5 md:p-6 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 transition-all duration-300 hover:-translate-y-1 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] w-full"
            >
              <div className="flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {wallet.type} Wallet
                  </span>
                  <WalletIcon className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate" title={formatRupiah(wallet.balance)}>
                    {formatRupiah(wallet.balance)}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/50">
                  <span className="text-[10px] md:text-xs text-orange-600 dark:text-orange-500/80 font-medium tracking-wide">Active Balance</span>
                </div>
              </div>
            </div>
          ))}

          {investments.map((item) => {
            const qty = safeNumber(item.quantity);
            const buy = safeNumber(item.averageBuyPrice);
            const current = safeNumber(item.currentPrice);
            const totalValue = qty * current;
            const totalCost = qty * buy;
            const gainLoss = totalValue - totalCost;

            return (
              <div 
                key={item.id} 
                className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/50 p-5 md:p-6 backdrop-blur-md border border-slate-200 dark:border-slate-800/50 transition-all duration-300 hover:-translate-y-1 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] w-full group"
              >
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mr-2">
                      {item.name} ({item.type})
                    </span>
                    <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <TrendingUpIcon className="h-4 w-4 md:h-5 md:w-5 text-orange-500 mr-1 hidden lg:block" />
                      <button
                        type="button"
                        onClick={() => setEditingInvestment(item)}
                        className="inline-flex items-center justify-center rounded-md p-1 md:p-1.5 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        title="Edit Investment"
                      >
                        <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInvestment(item.id)}
                        className="inline-flex items-center justify-center rounded-md p-1 md:p-1.5 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        title="Delete Investment"
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate" title={formatRupiah(totalValue)}>
                      {formatRupiah(totalValue)}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      Qty: {qty} • Avg: {formatRupiah(buy)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/50">
                    <span className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400">Gain/Loss</span>
                    <span 
                      className={`text-[10px] md:text-xs font-semibold ${gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {gainLoss >= 0 ? "+" : ""}{formatRupiah(gainLoss)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {wallets.length === 0 && investments.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-8 border border-dashed border-slate-300 dark:border-slate-800/50 rounded-xl w-full">
              <p className="text-sm">No wallets or investments found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Investment Modal */}
      <Dialog open={!!editingInvestment} onOpenChange={(open) => !open && setEditingInvestment(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">Edit Investment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type" className="text-slate-700 dark:text-slate-300">Type</Label>
              <select
                id="edit-type"
                value={editType}
                onChange={(e) => setEditType(e.target.value as InvestmentType)}
                className="w-full flex h-10 items-center justify-between rounded-md border border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-orange-500/50"
              >
                <option value="gold">Gold</option>
                <option value="bibit">Bibit (Reksadana)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-quantity" className="text-slate-700 dark:text-slate-300">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="0"
                step="0.0001"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-average-buy-price" className="text-slate-700 dark:text-slate-300">Average Buy Price</Label>
              <Input
                id="edit-average-buy-price"
                type="number"
                min="0"
                step="1"
                value={editAverageBuyPrice}
                onChange={(e) => setEditAverageBuyPrice(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-current-price" className="text-slate-700 dark:text-slate-300">Current Price</Label>
              <Input
                id="edit-current-price"
                type="number"
                min="0"
                step="1"
                value={editCurrentPrice}
                onChange={(e) => setEditCurrentPrice(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:ring-orange-500/50"
                required
              />
            </div>
            <DialogFooter className="gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingInvestment(null)}
                disabled={isSaving}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition-all"
              >
                {isSaving ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function safeNumber(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}