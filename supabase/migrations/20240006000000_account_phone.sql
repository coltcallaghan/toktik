-- Add encrypted phone number column to accounts
alter table public.accounts
  add column if not exists tiktok_phone_encrypted text;

comment on column public.accounts.tiktok_phone_encrypted is
  'TikTok account phone number encrypted with pgp_sym_encrypt. Visible only to the owning user via RLS.';

-- ── Update RPC: read credentials (now includes phone) ────────────────────────
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
  v_row     accounts%rowtype;
  v_password text;
  v_phone    text;
begin
  select * into v_row
  from public.accounts
  where id = p_account_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Account not found or access denied';
  end if;

  if v_row.tiktok_password_encrypted is not null then
    v_password := pgp_sym_decrypt(v_row.tiktok_password_encrypted::bytea, p_enc_key);
  end if;

  if v_row.tiktok_phone_encrypted is not null then
    v_phone := pgp_sym_decrypt(v_row.tiktok_phone_encrypted::bytea, p_enc_key);
  end if;

  return json_build_object(
    'email',    v_row.tiktok_email,
    'password', v_password,
    'phone',    v_phone
  );
end;
$$;

-- ── Update RPC: write credentials (now includes phone) ───────────────────────
create or replace function public.set_account_credentials(
  p_account_id uuid,
  p_email      text,
  p_password   text,
  p_phone      text,
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
    tiktok_email              = p_email,
    tiktok_password_encrypted = case
      when p_password is null then null
      else pgp_sym_encrypt(p_password, p_enc_key)
    end,
    tiktok_phone_encrypted    = case
      when p_phone is null then null
      else pgp_sym_encrypt(p_phone, p_enc_key)
    end
  where id = p_account_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Account not found or access denied';
  end if;
end;
$$;

revoke all on function public.get_account_credentials from public;
revoke all on function public.set_account_credentials from public;
grant execute on function public.get_account_credentials to authenticated;
grant execute on function public.set_account_credentials to authenticated;
