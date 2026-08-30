-- MUSKY DOSE — Growth schema verification
-- Read-only verification. Safe to run after supabase-growth-migration-001.sql.

WITH expected_tables(table_name) AS (
  VALUES
    ('growth_markets'), ('growth_market_metrics'), ('growth_keywords'),
    ('growth_keyword_snapshots'), ('growth_leads'), ('growth_competitors'),
    ('growth_competitor_observations'), ('growth_data_sources'),
    ('growth_data_sync_logs'), ('growth_recommendations'),
    ('growth_import_jobs'), ('growth_settings')
),
expected_columns(table_name, column_name) AS (
  VALUES
    ('growth_leads','contact_name'), ('growth_leads','whatsapp'), ('growth_leads','lead_type'),
    ('growth_leads','pincode'), ('growth_leads','address'), ('growth_leads','interested_products'),
    ('growth_leads','assigned_to'), ('growth_leads','next_follow_up'), ('growth_leads','last_contacted_at'),
    ('growth_leads','updated_at'),
    ('growth_markets','country'), ('growth_markets','state_code'), ('growth_markets','district_code'),
    ('growth_markets','city_code'), ('growth_markets','pincode'), ('growth_markets','latitude'),
    ('growth_markets','longitude'), ('growth_markets','status'),
    ('growth_keywords','country'), ('growth_keywords','district'), ('growth_keywords','product_id'),
    ('growth_keywords','trend'), ('growth_keywords','source_name'), ('growth_keywords','updated_at'),
    ('growth_keyword_snapshots','keyword'), ('growth_keyword_snapshots','source_name'),
    ('growth_competitors','website'), ('growth_competitors','instagram'), ('growth_competitors','facebook'),
    ('growth_competitors','state'), ('growth_competitors','district'), ('growth_competitors','city'),
    ('growth_competitors','product_categories'), ('growth_competitors','positioning'),
    ('growth_competitors','notes'), ('growth_competitors','source_tier'), ('growth_competitors','source_name'),
    ('growth_competitors','last_checked_at'),
    ('growth_competitor_observations','competitor_name'), ('growth_competitor_observations','product_name'),
    ('growth_competitor_observations','observed_price'), ('growth_competitor_observations','currency'),
    ('growth_competitor_observations','observation_date'), ('growth_competitor_observations','source'),
    ('growth_competitor_observations','notes'), ('growth_competitor_observations','created_at'),
    ('growth_data_sources','provider_key'), ('growth_data_sources','last_synced_at'),
    ('growth_data_sources','records_count'), ('growth_data_sources','error_message'), ('growth_data_sources','quota_status'),
    ('growth_recommendations','priority'), ('growth_recommendations','reason'),
    ('growth_recommendations','supporting_metrics'), ('growth_recommendations','data_sources'),
    ('growth_recommendations','recommended_actions'), ('growth_recommendations','generated_at'),
    ('growth_recommendations','updated_at')
),
table_check AS (
  SELECT COUNT(*) FILTER (WHERE t.table_name IS NULL) AS missing_tables
  FROM expected_tables e
  LEFT JOIN information_schema.tables t
    ON t.table_schema='public' AND t.table_name=e.table_name
),
column_check AS (
  SELECT COUNT(*) FILTER (WHERE c.column_name IS NULL) AS missing_columns
  FROM expected_columns e
  LEFT JOIN information_schema.columns c
    ON c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name
),
rls_check AS (
  SELECT COUNT(*) FILTER (WHERE COALESCE(c.relrowsecurity,false)=false) AS tables_without_rls
  FROM expected_tables e
  JOIN pg_class c ON c.relname=e.table_name
  JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
),
policy_check AS (
  SELECT COUNT(*) FILTER (WHERE p.policyname IS NULL) AS missing_service_policies
  FROM expected_tables e
  LEFT JOIN pg_policies p
    ON p.schemaname='public'
   AND p.tablename=e.table_name
   AND p.policyname='Service role access for ' || e.table_name
)
SELECT
  table_check.missing_tables,
  column_check.missing_columns,
  rls_check.tables_without_rls,
  policy_check.missing_service_policies,
  CASE WHEN table_check.missing_tables=0
         AND column_check.missing_columns=0
         AND rls_check.tables_without_rls=0
         AND policy_check.missing_service_policies=0
       THEN 'PASS'
       ELSE 'FAIL'
  END AS overall_status
FROM table_check, column_check, rls_check, policy_check;
