create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id text not null unique,
  chat_type text,
  title text,
  username text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clients_telegram_chat_id_not_empty
    check (length(btrim(telegram_chat_id)) > 0)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  telegram_message_id bigint,
  direction text not null,
  text text not null,
  created_at timestamptz not null default now(),

  constraint messages_direction_valid
    check (direction in ('incoming', 'outgoing')),
  constraint messages_text_not_empty
    check (length(btrim(text)) > 0),
  constraint messages_telegram_message_unique
    unique (client_id, telegram_message_id, direction)
);

create index if not exists messages_client_created_at_idx
  on public.messages (client_id, created_at desc);

comment on table public.clients is 'Telegram chats known to the Supabase bot';
comment on table public.messages is 'Incoming and outgoing Telegram messages';
comment on column public.messages.client_id is 'Owning Telegram chat';

alter table public.clients enable row level security;
alter table public.messages enable row level security;

revoke all on table public.clients from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
grant select, insert, update on table public.clients to service_role;
grant select, insert on table public.messages to service_role;
