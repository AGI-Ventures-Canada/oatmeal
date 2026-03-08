create table cli_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  device_token text not null unique,
  tenant_id uuid references tenants(id),
  encrypted_api_key text,
  key_id uuid references api_keys(id),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

alter table cli_auth_sessions enable row level security;
create policy "Deny all access" on cli_auth_sessions for all using (false);

create index idx_cli_auth_device_token on cli_auth_sessions(device_token)
  where status = 'pending' or status = 'complete';
