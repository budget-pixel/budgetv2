-- Recovery definition for the redundant index identified on 2026-11-01.
-- The UNIQUE constraint already maintains an equivalent valid index named
-- public_transactions_raw_transaction_id_key. Ordinarily keep only that one.
-- Run this single statement outside an explicit transaction only if restoring
-- the redundant copy is necessary; no transaction rows are affected.
create unique index concurrently if not exists public_transactions_raw_transaction_id_uidx
  on public.public_transactions using btree (raw_transaction_id);
