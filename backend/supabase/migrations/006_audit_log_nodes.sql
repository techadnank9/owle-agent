ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS nodes jsonb DEFAULT '{}';
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
