-- Run this in Supabase SQL Editor before using /api/transactions/transfer.
-- This function performs an atomic wallet transfer:
-- 1) Deduct amount from source wallet
-- 2) Add (amount + admin_fee) to destination wallet
-- 3) Log transfer in transactions table

create or replace function public.transfer_funds(
  p_amount numeric,
  p_admin_fee numeric,
  p_from_wallet_id uuid,
  p_to_wallet_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_balance numeric;
  transfer_transaction_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero';
  end if;

  if p_admin_fee is null or p_admin_fee < 0 then
    raise exception 'Admin fee cannot be negative';
  end if;

  if p_from_wallet_id is null or p_to_wallet_id is null then
    raise exception 'Source and destination wallet are required';
  end if;

  if p_from_wallet_id = p_to_wallet_id then
    raise exception 'Source and destination wallet must be different';
  end if;

  -- Lock source wallet row and verify funds.
  select balance
  into source_balance
  from public.wallets
  where id = p_from_wallet_id
  for update;

  if not found then
    raise exception 'Source wallet not found';
  end if;

  -- Lock destination wallet row.
  perform 1
  from public.wallets
  where id = p_to_wallet_id
  for update;

  if not found then
    raise exception 'Destination wallet not found';
  end if;

  if source_balance < p_amount then
    raise exception 'Insufficient source wallet balance';
  end if;

  update public.wallets
  set balance = balance - p_amount
  where id = p_from_wallet_id;

  update public.wallets
  set balance = balance + p_amount + p_admin_fee
  where id = p_to_wallet_id;

  insert into public.transactions (
    date,
    type,
    amount,
    admin_fee,
    from_wallet_id,
    to_wallet_id,
    notes
  )
  values (
    now(),
    'money_transfer',
    p_amount,
    p_admin_fee,
    p_from_wallet_id,
    p_to_wallet_id,
    p_notes
  )
  returning id into transfer_transaction_id;

  return transfer_transaction_id;
end;
$$;
