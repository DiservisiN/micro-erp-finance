"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, XCircle, Trash } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState<Repair | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<Repair | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editCustomer, setEditCustomer] = useState("");
  const [editDevice, setEditDevice] = useState("");
  const [editProblem, setEditProblem] = useState("");
  const [editCost, setEditCost] = useState("");

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
    const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border";
    switch (status) {
      case "pending":
        return <span className={`${baseClasses} bg-orange-500/10 text-orange-400 border-orange-500/20`}>Pending</span>;
      case "processing":
        return <span className={`${baseClasses} bg-yellow-500/10 text-yellow-400 border-yellow-500/20`}>Processing</span>;
      case "ready":
        return <span className={`${baseClasses} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Ready</span>;
      case "picked_up":
        return <span className={`${baseClasses} bg-green-500/10 text-green-400 border-green-500/20`}>Sudah Diambil</span>;
      default:
        return <span className={`${baseClasses} border-slate-700 text-slate-400`}>{status}</span>;
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

  async function handleCancelRepair() {
    if (!supabase || !cancelTarget) return;
    setIsCancelling(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    try {
      const { error } = await sb.from("repairs").delete().eq("id", cancelTarget.id);

      if (error) {
        toast.error("Failed to cancel service", { description: error.message });
        setIsCancelling(false);
        return;
      }

      toast.success("Service cancelled successfully");
      setIsCancelling(false);
      setIsCancelOpen(false);
      setCancelTarget(null);
      await loadRepairs();
    } catch {
      toast.error("An unexpected error occurred");
      setIsCancelling(false);
    }
  }

  function openEditRepair(repair: Repair) {
    setEditTarget(repair);
    setEditCustomer(repair.customer_name);
    setEditDevice(repair.device_name);
    setEditProblem(repair.problem_description);
    setEditCost(String(repair.estimated_cost));
    setIsEditOpen(true);
  }

  async function handleEditRepair() {
    if (!supabase || !editTarget) return;
    setIsSavingEdit(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("repairs").update({
      customer_name: editCustomer.trim(),
      device_name: editDevice.trim(),
      problem_description: editProblem.trim(),
      estimated_cost: Number(editCost),
    } as any).eq("id", editTarget.id);

    if (error) {
      toast.error("Failed to update repair", { description: error.message });
      setIsSavingEdit(false);
      return;
    }

    toast.success("Repair updated successfully");
    setIsSavingEdit(false);
    setIsEditOpen(false);
    setEditTarget(null);
    await loadRepairs();
  }

  async function handleDeleteRepair(repairId: string) {
    if (!window.confirm('Hapus data servis ini?')) return;
    if (!supabase) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("repairs").delete().eq("id", repairId);

    if (error) {
      toast.error("Failed to delete repair", { description: error.message });
      return;
    }

    toast.success("Repair deleted successfully");
    setRepairs((prev) => prev.filter((r) => r.id !== repairId));
  }

  return (
    <section className="space-y-6 bg-[#020617] min-h-screen p-6">
      <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Service & Repairs</h2>
          <p className="text-slate-400 text-sm">Track customer electronics brought in for repair.</p>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Total Potential Revenue</p>
            <p className="text-3xl font-bold text-white font-mono shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              {formatRupiah(repairs.reduce((sum, r) => sum + r.estimated_cost, 0))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">{repairs.length} Active Repairs</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
        <form onSubmit={handleAddRepair} className="grid gap-4 md:grid-cols-4 items-end">
          <div className="grid gap-2">
            <Label htmlFor="customerName" className="text-slate-300">Customer Name</Label>
            <Input id="customerName" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Budi" className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deviceName" className="text-slate-300">Device</Label>
            <Input id="deviceName" required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. Laptop Asus" className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="problem" className="text-slate-300">Problem</Label>
            <Input id="problem" required value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. LCD Mati" className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="estimatedCost" className="text-slate-300">Est. Cost</Label>
            <Input id="estimatedCost" type="number" min="0" step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0" className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500" />
          </div>
          <Button type="submit" disabled={isSubmitting} className="md:col-span-4 bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
            {isSubmitting ? "Adding..." : "Add Repair Order"}
          </Button>
        </form>
      </div>

      {dataError ? <p className="text-sm text-destructive">{dataError}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-slate-500 col-span-full">Loading repairs...</p>
        ) : repairs.length === 0 ? (
          <p className="text-sm text-slate-500 col-span-full">No active repair orders found.</p>
        ) : (
          repairs.map((repair) => (
            <Card key={repair.id} className="flex flex-col bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:border-orange-500/30 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-white">{repair.device_name}</CardTitle>
                    <CardDescription className="text-slate-400">{repair.customer_name}</CardDescription>
                  </div>
                  {getStatusBadge(repair.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold block text-slate-300">Problem:</span>
                    <span className="text-slate-400">{repair.problem_description}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-300">Est. Cost:</span>
                    <span className="font-mono text-orange-400 font-semibold shadow-[0_0_8px_rgba(249,115,22,0.3)]">{formatRupiah(repair.estimated_cost)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-800/50">
                  <Label className="text-slate-300">Update Status</Label>
                  <select
                    value={repair.status}
                    onChange={(e) => handleStatusChange(repair.id, e.target.value as RepairStatus)}
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="ready">Ready</option>
                    <option value="picked_up">Sudah Diambil (Picked Up)</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => openEditRepair(repair)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-700 bg-slate-800/50 transition-all duration-200 hover:text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRepair(repair.id)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-700 bg-slate-800/50 transition-all duration-200 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                  >
                    <Trash className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  {repair.status === "picked_up" && (
                    <Button
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all"
                      onClick={() => handleProcessPayment(repair)}
                    >
                      Process Payment
                    </Button>
                  )}
                  {(repair.status === "pending" || repair.status === "processing") && (
                    <button
                      type="button"
                      onClick={() => { setCancelTarget(repair); setIsCancelOpen(true); }}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-700 bg-slate-800/50 transition-all duration-200 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel Service
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Cancel Service Confirmation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={(v) => { setIsCancelOpen(v); if (!v) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-[400px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Cancel Service</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to cancel this service? Any allocated spare parts will be restocked.
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <div className="rounded-md border border-slate-800 bg-slate-800/50 p-3 text-sm space-y-1">
              <p><span className="text-slate-400">Customer:</span> {cancelTarget.customer_name}</p>
              <p><span className="text-slate-400">Device:</span> {cancelTarget.device_name}</p>
              <p><span className="text-slate-400">Problem:</span> {cancelTarget.problem_description}</p>
              <p><span className="text-slate-400">Est. Cost:</span> {formatRupiah(cancelTarget.estimated_cost)}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setIsCancelOpen(false); setCancelTarget(null); }} disabled={isCancelling} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Go Back
            </Button>
            <Button
              onClick={handleCancelRepair}
              disabled={isCancelling}
              className="bg-red-600 text-white hover:bg-red-700 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all"
            >
              {isCancelling ? "Cancelling..." : "Cancel Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Repair Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Repair</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-customer" className="text-slate-300">Customer Name</Label>
                <Input id="edit-customer" value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-device" className="text-slate-300">Device</Label>
                <Input id="edit-device" value={editDevice} onChange={(e) => setEditDevice(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-problem" className="text-slate-300">Problem</Label>
                <Input id="edit-problem" value={editProblem} onChange={(e) => setEditProblem(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cost" className="text-slate-300">Estimated Cost</Label>
                <Input id="edit-cost" type="number" min="0" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} disabled={isSavingEdit} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
                <Button onClick={handleEditRepair} disabled={isSavingEdit} className="bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all">
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
