-- Contact submissions table for passive support form
create table contact_submissions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamp with time zone default now(),
  read boolean default false
);

-- Index for faster queries
create index contact_submissions_created_at_idx on contact_submissions(created_at desc);
create index contact_submissions_read_idx on contact_submissions(read);

-- Allow anyone to insert (no auth required for contact form)
alter table contact_submissions enable row level security;

create policy "Anyone can create contact submissions"
  on contact_submissions for insert
  with check (true);

-- Only authenticated users (owner checking Supabase UI) can read
create policy "Only authenticated users can read contact submissions"
  on contact_submissions for select
  using (auth.role() = 'authenticated');
