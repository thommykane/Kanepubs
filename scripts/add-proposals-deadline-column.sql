-- Run once on production if Active Proposals / Active IOs / Sold load empty after the deadline feature shipped.
-- Safe to run multiple times (IF NOT EXISTS).
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deadline timestamp;
