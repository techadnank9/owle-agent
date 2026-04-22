ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_status_check;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_status_check
  CHECK (status IN ('new','in_outreach','replied','meeting_booked','paused','excluded','customer','churned','nurture'));
