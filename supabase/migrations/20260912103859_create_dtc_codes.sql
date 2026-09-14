create table public.dtc_codes (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now(),

  constraint dtc_codes_code_format
    check (code ~ '^[PBCU][0-9A-F]{4}$'),

  constraint dtc_codes_description_not_empty
    check (length(btrim(description)) > 0)
);

comment on table public.dtc_codes is
  'Universal OBD-II diagnostic trouble codes';

comment on column public.dtc_codes.code is
  'Five-character OBD-II code, for example P0420';

comment on column public.dtc_codes.description is
  'Reference description of the diagnostic trouble code';

alter table public.dtc_codes enable row level security;

revoke all on table public.dtc_codes from anon, authenticated;
grant select on table public.dtc_codes to service_role;
