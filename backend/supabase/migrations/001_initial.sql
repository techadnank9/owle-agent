CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text,
  bed_count int,
  location text,
  raw_data jsonb DEFAULT '{}',
  icp_score numeric,
  priority_score numeric,
  status text DEFAULT 'new' CHECK (status IN ('new','in_outreach','replied','meeting_booked','paused','excluded')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  name text,
  title text,
  email text,
  linkedin_url text,
  source text CHECK (source IN ('verified','inferred')),
  confidence numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE outreach_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  channel text CHECK (channel IN ('email','linkedin')),
  subject text,
  body text,
  sent_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','sent','failed')),
  gmail_thread_id text
);

CREATE TABLE replies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outreach_action_id uuid REFERENCES outreach_actions(id),
  body text,
  received_at timestamptz DEFAULT now(),
  classification text CHECK (classification IN ('interested','not_now','referral','not_a_fit','unsubscribe','unclear')),
  confidence numeric,
  response_draft text
);

CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  contact_id uuid REFERENCES contacts(id),
  status text DEFAULT 'soft_interest' CHECK (status IN ('soft_interest','proposed','confirmed','cancelled')),
  proposed_times jsonb DEFAULT '[]',
  confirmed_at timestamptz,
  calendar_link text
);

CREATE TABLE agent_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  graph_thread_id text UNIQUE NOT NULL,
  current_node text,
  status text DEFAULT 'running' CHECK (status IN ('running','waiting_hitl','completed','failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  agent_run_id uuid REFERENCES agent_runs(id),
  node text NOT NULL,
  action text NOT NULL,
  rationale text,
  verified_facts jsonb DEFAULT '{}',
  inferred_assumptions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE outcome_signals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  message_angle text,
  persona text,
  channel text,
  reply_received boolean DEFAULT false,
  meeting_booked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- auto-update updated_at on agent_runs
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_runs_updated_at
  BEFORE UPDATE ON agent_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
