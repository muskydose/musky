-- ============================================================
-- MUSKY DOSE — PHASE 9G: GOOGLE SEARCH CONSOLE DEDICATED SNAPSHOTS
-- Migration: 002-gsc
-- ============================================================

CREATE TABLE IF NOT EXISTS growth_gsc_snapshots (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  canonical_page TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'IND',
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  ctr NUMERIC(6, 4) NOT NULL DEFAULT 0,
  average_position NUMERIC(5, 2) NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'GOOGLE_SEARCH_CONSOLE',
  keyword_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_growth_gsc_snapshots_natural UNIQUE (query, canonical_page, country, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_gsc_snapshots_query ON growth_gsc_snapshots(query);
CREATE INDEX IF NOT EXISTS idx_growth_gsc_snapshots_date ON growth_gsc_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_growth_gsc_snapshots_page ON growth_gsc_snapshots(canonical_page);
CREATE INDEX IF NOT EXISTS idx_growth_gsc_snapshots_query_date ON growth_gsc_snapshots(query, snapshot_date DESC);

-- Enable RLS
ALTER TABLE growth_gsc_snapshots ENABLE ROW LEVEL SECURITY;

-- Service Role Policy
DROP POLICY IF EXISTS "Service role access for growth_gsc_snapshots" ON growth_gsc_snapshots;
CREATE POLICY "Service role access for growth_gsc_snapshots" ON growth_gsc_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

