import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type TransferRequestBody = {
  amount: number;
  adminFee: number;
  fromWalletId: string;
  toWalletId: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<TransferRequestBody>;

    const amount = Number(body.amount);
    const adminFee = Number(body.adminFee ?? 0);
    const fromWalletId = body.fromWalletId?.trim();
    const toWalletId = body.toWalletId?.trim();
    const notes = body.notes?.trim() || null;

    if (!fromWalletId || !toWalletId) {
      return NextResponse.json({ error: "Source and destination wallet are required." }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Transfer amount must be greater than zero." }, { status: 400 });
    }

    if (!Number.isFinite(adminFee) || adminFee < 0) {
      return NextResponse.json({ error: "Admin fee cannot be negative." }, { status: 400 });
    }

    if (fromWalletId === toWalletId) {
      return NextResponse.json({ error: "Source and destination wallet must be different." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcArgs: any = {
      p_amount: amount,
      p_admin_fee: adminFee,
      p_from_wallet_id: fromWalletId,
      p_notes: notes,
      p_to_wallet_id: toWalletId,
    };
    const { data, error } = await supabase.rpc("transfer_funds", rpcArgs);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, transactionId: data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
