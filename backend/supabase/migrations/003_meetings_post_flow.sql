ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome text CHECK (outcome IN ('won', 'lost', 'nurture'));

ALTER TABLE meetings
  DROP CONSTRAINT IF EXISTS meetings_status_check;

ALTER TABLE meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN ('soft_interest','proposed','confirmed','cancelled','completed'));
