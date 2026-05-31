-- Add weekly/monthly price columns to existing databases (safe to run once)
ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS weekly_rate DECIMAL(10, 2) NULL AFTER daily_rate,
  ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10, 2) NULL AFTER weekly_rate;

-- Backfill from daily rate where not set
UPDATE cars
SET
  weekly_rate = COALESCE(weekly_rate, ROUND(daily_rate * 5.5, 2)),
  monthly_rate = COALESCE(monthly_rate, ROUND(daily_rate * 22, 2))
WHERE daily_rate IS NOT NULL
  AND (weekly_rate IS NULL OR monthly_rate IS NULL);
