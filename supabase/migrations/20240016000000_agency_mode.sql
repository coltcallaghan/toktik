-- Migration: Agency mode – multi-client workspaces

CREATE TABLE IF NOT EXISTS agency_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agency_clients_user ON agency_clients(agency_user_id);

ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owners manage clients"
  ON agency_clients FOR ALL
  USING (agency_user_id = auth.uid());

-- Link accounts to agency clients
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS agency_client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_agency_client ON accounts(agency_client_id);
