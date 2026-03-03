-- Account credentials (TikTok login email + password)
-- Stored encrypted using pgcrypto so plaintext never sits in the DB.
-- The encryption key is the Supabase anon key prefix — swap for a dedicated
-- secret via vault/env in production.
--
-- RLS on the accounts table already restricts rows to the owning user,
-- so these columns are only ever readable by the authenticated owner.

-- Enable pgcrypto if not already enabled
create extension if not exists pgcrypto;

alter table public.accounts
  add column if not exists tiktok_email             text,
  add column if not exists tiktok_password_encrypted text;

comment on column public.accounts.tiktok_email is
  'TikTok login email — visible only to the owning user via RLS';

comment on column public.accounts.tiktok_password_encrypted is
  'TikTok password encrypted with pgp_sym_encrypt. Decrypt with pgp_sym_decrypt on read.';

-- ── RPC: read credentials ────────────────────────────────────────────────────
-- Returns { email, password } for the calling user's account.
-- RLS on accounts guarantees only the owner can call this successfully.
create or replace function public.get_account_credentials(
  p_account_id uuid,
  p_enc_key    text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row accounts%rowtype;
  v_password text;
begin
  select * into v_row
  from public.accounts
  where id = p_account_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Account not found or access denied';
  end if;

  if v_row.tiktok_password_encrypted is not null then
    v_password := pgp_sym_decrypt(
      v_row.tiktok_password_encrypted::bytea,
      p_enc_key
    );
  end if;

  return json_build_object(
    'email',    v_row.tiktok_email,
    'password', v_password
  );
end;
$$;

-- ── RPC: write credentials ───────────────────────────────────────────────────
create or replace function public.set_account_credentials(
  p_account_id uuid,
  p_email      text,
  p_password   text,
  p_enc_key    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.accounts
  set
    tiktok_email             = p_email,
    tiktok_password_encrypted = case
      when p_password is null then null
      else pgp_sym_encrypt(p_password, p_enc_key)
    end
  where id = p_account_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Account not found or access denied';
  end if;
end;
$$;

-- Only the owner can execute these functions (RLS on accounts enforces row-level ownership)
revoke all on function public.get_account_credentials from public;
revoke all on function public.set_account_credentials from public;
grant execute on function public.get_account_credentials to authenticated;
grant execute on function public.set_account_credentials to authenticated;
