alter table public.intakes
  add column input_tokens integer not null default 0 check (input_tokens >= 0),
  add column output_tokens integer not null default 0 check (output_tokens >= 0),
  add column cost_usd numeric(10, 6) not null default 0 check (cost_usd >= 0),
  add column model text check (char_length(model) <= 80);
