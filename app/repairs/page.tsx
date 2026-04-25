"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getSupabaseClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";

type RepairStatus = "pending" | "processing" | "ready" | "picked_up";

type Repair = {
  id: string;
  created_at: string;
  customer_name: string;
  device_name: string;
  problem_description: string;
  estimated_cost: number;
  status: RepairStatus;
};

export default function RepairsPage() {
  const router = useRouter();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // New Repair Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [problem, setProblem] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  async function loadRepairs() {
    if (!supabase) {
      setDataError("Missing Supabase configuration.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("repairs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setDataError(error.message);
    } else {
      setRepairs((data ?? []) as Repair[]);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadRepairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleAddRepair(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    if (!customerName.trim() || !deviceName.trim() || !problem.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const cost = Number(estimatedCost || "0");

    const { error } = await supabase.from("repairs").insert({
      customer_name: customerName.trim(),
      device_name: deviceName.trim(),
      problem_description: problem.trim(),
      estimated_cost: cost,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to add repair", { description: error.message });
    } else {
      toast.success("Repair added successfully");
      setCustomerName("");
      setDeviceName("");
      setProblem("");
      setEstimatedCost("");
      loadRepairs(); // Refresh list
    }
    setIsSubmitting(false);
  }

  async function handleStatusChange(repairId: string, newStatus: RepairStatus) {
    if (!supabase) return;
    
    // Optimistic UI Update
    setRepairs((prev) =>
      prev.map((r) => (r.id === repairId ? { ...r, status: newStatus } : r))
    );

    const { error } = await supabase
      .from("repairs")
      .update({ status: newStatus })
      .eq("id", repairId);

    if (error) {
      toast.error("Failed to update status", { description: error.message });
      loadRepairs(); // Revert on error
    } else {
      toast.success("Status updated");
    }
  }

  function getStatusBadge(status: RepairStatus) {
    const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
    switch (status) {
      case "pending":
        return <span className={`${baseClasses} bg-muted text-muted-foreground`}>Pending</span>;
      case "processing":
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`}>Processing</span>;
      case "ready":
        return <span className={`${baseClasses} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300`}>Ready</span>;
      case "picked_up":
        return <span className={`${baseClasses} bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300`}>Sudah Diambil</span>;
      default:
        return <span className={`${baseClasses} border border-input text-foreground`}>{status}</span>;
    }
  }

  function handleProcessPayment(repair: Repair) {
    const params = new URLSearchParams({
      type: "Electronic Service",
      fee: repair.estimated_cost.toString(),
      notes: `Repair payment for ${repair.customer_name} - ${repair.device_name}`,
      paymentMethod: "lunas",
    });
    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Service & Repairs</h2>
        <p className="text-muted-foreground">Track customer electronics brought in for repair.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Repair</CardTitle>
          <CardDescription>Log a new device repair order.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddRepair} className="grid gap-4 md:grid-cols-4 items-end">
            <div className="grid gap-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Budi" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deviceName">Device</Label>
              <Input id="deviceName" required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. Laptop Asus" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="problem">Problem</Label>
              <Input id="problem" required value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. LCD Mati" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimatedCost">Est. Cost</Label>
              <Input id="estimatedCost" type="number" min="0" step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0" />
            </div>
            <Button type="submit" disabled={isSubmitting} className="md:col-span-4 mt-2">
              {isSubmitting ? "Adding..." : "Add Repair Order"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {dataError ? <p className="text-sm text-destructive">{dataError}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground col-span-full">Loading repairs...</p>
        ) : repairs.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full">No active repair orders found.</p>
        ) : (
          repairs.map((repair) => (
            <Card key={repair.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{repair.device_name}</CardTitle>
                    <CardDescription>{repair.customer_name}</CardDescription>
                  </div>
                  {getStatusBadge(repair.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold block">Problem:</span>
                    <span className="text-muted-foreground">{repair.problem_description}</span>
                  </div>
                  <div>
                    <span className="font-semibold block">Est. Cost:</span>
                    <span className="text-muted-foreground">{formatRupiah(repair.estimated_cost)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Update Status</Label>
                  <select
                    value={repair.status}
                    onChange={(e) => handleStatusChange(repair.id, e.target.value as RepairStatus)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="ready">Ready</option>
                    <option value="picked_up">Sudah Diambil (Picked Up)</option>
                  </select>
                </div>

                {repair.status === "picked_up" && (
                  <Button 
                    className="w-full mt-4" 
                    variant="default"
                    onClick={() => handleProcessPayment(repair)}
                  >
                    Process Payment
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
