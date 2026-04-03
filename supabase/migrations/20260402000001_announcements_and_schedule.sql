-- Announcements: organizer broadcasts to participants
create table hackathon_announcements (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hackathon_announcements_hackathon on hackathon_announcements(hackathon_id);

alter table hackathon_announcements enable row level security;
create policy "deny all" on hackathon_announcements for all using (false);

-- Schedule items: event agenda managed by organizers
create table hackathon_schedule_items (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hackathon_schedule_items_hackathon on hackathon_schedule_items(hackathon_id);

alter table hackathon_schedule_items enable row level security;
create policy "deny all" on hackathon_schedule_items for all using (false);
