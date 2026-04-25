"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type Transaction = {
  id: string;
  date: string;
  created_at: string;
  type: string;
  amount: number;
  admin_fee: number;
  notes: string;
};

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    async function loadTransactions() {
      if (!supabase) {
        setErrorMessage("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      // Order by created_at descending (newest first)
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, created_at, type, amount, admin_fee, notes")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setTransactions((data ?? []) as Transaction[]);
      setErrorMessage(null);
      setIsLoading(false);
    }

    loadTransactions();
  }, [supabase]);

  function formatDate(dateString: string) {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateString;
    }
  }

  function formatType(type: string) {
    if (!type) return "-";
    // Convert e.g., "physical_sale" to "Physical Sale"
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function handleExportCSV() {
    if (transactions.length === 0) return;

    const headers = ["Date", "Type", "Amount", "Admin Fee", "Notes"];
    const rows = transactions.map((tx) => [
      formatDate(tx.created_at || tx.date).replace(/,/g, ""), // Basic comma removal for date string safety
      formatType(tx.type),
      tx.amount.toString(),
      (tx.admin_fee || 0).toString(),
      `"${(tx.notes || "").replace(/"/g, '""')}"`, // Escape quotes and wrap in quotes for robust CSV
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Laporan_Keuangan_MicroERP.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Reports</h2>
        <p className="text-muted-foreground">View your transaction history and activity.</p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>A complete log of all module activities.</CardDescription>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="shrink-0" disabled={isLoading || transactions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export to CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Admin Fee</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(tx.created_at || tx.date)}</TableCell>
                    <TableCell className="capitalize">{formatType(tx.type)}</TableCell>
                    <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">{formatRupiah(tx.amount)}</TableCell>
                    <TableCell>{tx.admin_fee ? formatRupiah(tx.admin_fee) : "-"}</TableCell>
                    <TableCell className="max-w-xs truncate" title={tx.notes || ""}>
                      {tx.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedReceipt(tx); setIsReceiptOpen(true); }} title="Print Receipt">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="print:hidden">
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="flex flex-col items-center justify-center py-4 print:py-0">
              <div 
                id="receipt-print-area" 
                className="w-[300px] bg-white text-black p-6 font-mono text-sm leading-tight border border-dashed border-gray-300 print:border-none print:w-full print:max-w-none print:p-0"
              >
                <div className="text-center font-bold text-lg mb-2">MicroERP Store</div>
                <div className="text-center text-xs mb-4">Jl. Teknologi No. 1, Jakarta<br/>Telp: 0812-3456-7890</div>
                <div className="border-b border-dashed border-black mb-2 pb-2">
                  <div>Date: {formatDate(selectedReceipt.created_at || selectedReceipt.date)}</div>
                  <div>Trx ID: {selectedReceipt.id.split('-')[0].toUpperCase()}</div>
                </div>
                <div className="mb-4">
                  <div className="font-semibold">{formatType(selectedReceipt.type)}</div>
                  <div className="text-xs break-words">{selectedReceipt.notes || "-"}</div>
                </div>
                <div className="border-t border-dashed border-black mt-2 pt-2 flex justify-between items-center">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedReceipt.amount)}</span>
                </div>
                {selectedReceipt.admin_fee > 0 && (
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span>Admin Fee</span>
                    <span>{formatRupiah(selectedReceipt.admin_fee)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-black mt-2 pt-2 flex justify-between items-center font-bold">
                  <span>TOTAL</span>
                  <span>{formatRupiah(selectedReceipt.amount + (selectedReceipt.admin_fee || 0))}</span>
                </div>
                <div className="text-center text-xs mt-6">
                  Thank you for your business!
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4 print:hidden">
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>Close</Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
