-- ============================================================================
-- MUSKY DOSE — P0.2 PERSISTENT RATE LIMITING
-- Supabase/Postgres-backed limiter with atomic window consumption.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access for rate_limit_buckets" ON public.rate_limit_buckets;
CREATE POLICY "Service role access for rate_limit_buckets"
  ON public.rate_limit_buckets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_ms BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket public.rate_limit_buckets%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_window_seconds DOUBLE PRECISION := GREATEST(p_window_ms, 1) / 1000.0;
  v_elapsed_ms DOUBLE PRECISION;
  v_reset_ms BIGINT;
  v_remaining INT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Rate limit key is required';
  END IF;

  IF p_limit IS NULL OR p_limit <= 0 THEN
    RAISE EXCEPTION 'Rate limit must be positive';
  END IF;

  INSERT INTO public.rate_limit_buckets (key, window_start, request_count, updated_at)
  VALUES (p_key, v_now, 1, v_now)
  ON CONFLICT (key) DO NOTHING;

  SELECT * INTO v_bucket
  FROM public.rate_limit_buckets
  WHERE key = p_key
  FOR UPDATE;

  v_elapsed_ms := EXTRACT(EPOCH FROM (v_now - v_bucket.window_start)) * 1000.0;

  IF v_elapsed_ms >= p_window_ms THEN
    UPDATE public.rate_limit_buckets
    SET window_start = v_now,
        request_count = 1,
        updated_at = v_now
    WHERE key = p_key;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', GREATEST(p_limit - 1, 0),
      'reset_ms', p_window_ms
    );
  END IF;

  IF v_bucket.request_count >= p_limit THEN
    v_reset_ms := GREATEST((p_window_ms - v_elapsed_ms)::BIGINT, 0);
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_ms', v_reset_ms
    );
  END IF;

  UPDATE public.rate_limit_buckets
  SET request_count = request_count + 1,
      updated_at = v_now
  WHERE key = p_key
  RETURNING request_count INTO v_bucket.request_count;

  v_remaining := GREATEST(p_limit - v_bucket.request_count, 0);
  v_reset_ms := GREATEST((p_window_ms - v_elapsed_ms)::BIGINT, 0);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'reset_ms', v_reset_ms
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INT, BIGINT) TO service_role;

-- Optional cleanup helper. Execute from a privileged scheduled job when needed.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets(p_older_than_hours INT DEFAULT 24)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limit_buckets
  WHERE updated_at < NOW() - make_interval(hours => GREATEST(p_older_than_hours, 1));
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limit_buckets(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets(INT) TO service_role;
