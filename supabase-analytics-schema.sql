-- ============================================================
-- MUSKY DOSE FIRST-PARTY CONVERSION ANALYTICS SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  pathname TEXT,
  product_id TEXT,
  product_name TEXT,
  category TEXT,
  search_query TEXT,
  result_count INT DEFAULT 0,
  quantity INT DEFAULT 1,
  value NUMERIC(10, 2) DEFAULT 0,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast aggregations and dashboard filtering
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product ON public.analytics_events (product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_search ON public.analytics_events (search_query) WHERE search_query IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow public event ingestion
DROP POLICY IF EXISTS "Allow public event ingestion" ON public.analytics_events;
CREATE POLICY "Allow public event ingestion" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

-- Allow service role full access for dashboard queries
DROP POLICY IF EXISTS "Allow service role manage analytics" ON public.analytics_events;
CREATE POLICY "Allow service role manage analytics" ON public.analytics_events
  FOR ALL USING (true);
