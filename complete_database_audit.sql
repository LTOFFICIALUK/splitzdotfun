-- =====================================================
-- COMPLETE DATABASE AUDIT & SETUP VERIFICATION
-- =====================================================

-- 1. GET ALL TABLES IN THE DATABASE
-- =====================================================
SELECT 
    'ALL TABLES IN DATABASE' as audit_section,
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. GET ALL VIEWS IN THE DATABASE
-- =====================================================
SELECT 
    'ALL VIEWS IN DATABASE' as audit_section,
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- 3. GET ALL INDEXES IN THE DATABASE
-- =====================================================
SELECT 
    'ALL INDEXES IN DATABASE' as audit_section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. GET ALL FUNCTIONS IN THE DATABASE
-- =====================================================
SELECT 
    'ALL FUNCTIONS IN DATABASE' as audit_section,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 5. DETAILED TABLE STRUCTURE ANALYSIS
-- =====================================================

-- 5.1 PLATFORM_REVENUE TABLE STRUCTURE
SELECT 
    'PLATFORM_REVENUE STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'platform_revenue'
ORDER BY ordinal_position;

-- 5.2 TOKEN_FEE_PERIODS TABLE STRUCTURE
SELECT 
    'TOKEN_FEE_PERIODS STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'token_fee_periods'
ORDER BY ordinal_position;

-- 5.3 AUCTION_BIDS TABLE STRUCTURE
SELECT 
    'AUCTION_BIDS STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'auction_bids'
ORDER BY ordinal_position;

-- 5.4 ANALYTICS_CACHE TABLE STRUCTURE
SELECT 
    'ANALYTICS_CACHE STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'analytics_cache'
ORDER BY ordinal_position;

-- 5.5 MARKETPLACE_AUCTIONS TABLE STRUCTURE
SELECT 
    'MARKETPLACE_AUCTIONS STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marketplace_auctions'
ORDER BY ordinal_position;

-- 5.6 MARKETPLACE_OFFERS TABLE STRUCTURE
SELECT 
    'MARKETPLACE_OFFERS STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marketplace_offers'
ORDER BY ordinal_position;

-- 5.7 MARKETPLACE_SALES TABLE STRUCTURE
SELECT 
    'MARKETPLACE_SALES STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marketplace_sales'
ORDER BY ordinal_position;

-- 5.8 TOKENS TABLE STRUCTURE
SELECT 
    'TOKENS STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'tokens'
ORDER BY ordinal_position;

-- 5.9 PROFILES TABLE STRUCTURE
SELECT 
    'PROFILES STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 6. CHECK FOR MISSING CRITICAL TABLES
-- =====================================================
SELECT 
    'MISSING CRITICAL TABLES' as audit_section,
    'marketplace_listings' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_listings') 
        THEN 'EXISTS' 
        ELSE 'MISSING - CRITICAL FOR OFFERS' 
    END as status
UNION ALL
SELECT 
    'MISSING CRITICAL TABLES' as audit_section,
    'notifications' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
        THEN 'EXISTS' 
        ELSE 'MISSING - CRITICAL FOR NOTIFICATIONS' 
    END as status
UNION ALL
SELECT 
    'MISSING CRITICAL TABLES' as audit_section,
    'explore_page' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'explore_page') 
        THEN 'EXISTS' 
        ELSE 'MISSING - CRITICAL FOR EXPLORE PAGE' 
    END as status
UNION ALL
SELECT 
    'MISSING CRITICAL TABLES' as audit_section,
    'marketplace_sales' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_sales') 
        THEN 'EXISTS' 
        ELSE 'MISSING - CRITICAL FOR SALES TRACKING' 
    END as status;

-- 7. CHECK TABLE RELATIONSHIPS AND FOREIGN KEYS
-- =====================================================
SELECT 
    'FOREIGN KEY RELATIONSHIPS' as audit_section,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 8. CHECK ROW LEVEL SECURITY POLICIES
-- =====================================================
SELECT 
    'ROW LEVEL SECURITY POLICIES' as audit_section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. CHECK TABLE SIZES AND ROW COUNTS
-- =====================================================
SELECT 
    'TABLE SIZES AND ROW COUNTS' as audit_section,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    (SELECT COUNT(*) FROM information_schema.tables t2 WHERE t2.table_name = t1.tablename) as row_count_estimate
FROM pg_tables t1
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 10. CHECK FOR GENERATED COLUMNS
-- =====================================================
SELECT 
    'GENERATED COLUMNS' as audit_section,
    table_name,
    column_name,
    generation_expression,
    is_generated,
    generation_expression
FROM information_schema.columns 
WHERE is_generated = 'ALWAYS' 
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 11. CHECK FOR CONSTRAINTS
-- =====================================================
SELECT 
    'TABLE CONSTRAINTS' as audit_section,
    table_name,
    constraint_name,
    constraint_type,
    is_deferrable,
    initially_deferred
FROM information_schema.table_constraints 
WHERE table_schema = 'public'
ORDER BY table_name, constraint_type;

-- 12. CHECK FOR TRIGGERS
-- =====================================================
SELECT 
    'TRIGGERS' as audit_section,
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 13. COMPREHENSIVE SETUP SUMMARY
-- =====================================================
SELECT 
    'COMPREHENSIVE SETUP SUMMARY' as audit_section,
    'Total Tables' as metric,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as count,
    'All marketplace tables' as description
UNION ALL
SELECT 
    'COMPREHENSIVE SETUP SUMMARY' as audit_section,
    'Total Views' as metric,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as count,
    'Analytics and summary views' as description
UNION ALL
SELECT 
    'COMPREHENSIVE SETUP SUMMARY' as audit_section,
    'Total Indexes' as metric,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as count,
    'Performance optimization indexes' as description
UNION ALL
SELECT 
    'COMPREHENSIVE SETUP SUMMARY' as audit_section,
    'Total Functions' as metric,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as count,
    'Revenue calculation functions' as description
UNION ALL
SELECT 
    'COMPREHENSIVE SETUP SUMMARY' as audit_section,
    'Total RLS Policies' as metric,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as count,
    'Row level security policies' as description
UNION ALL
SELECT 
    'COMPREHENSIVE SETUP SUMMARY' as audit_section,
    'Total Foreign Keys' as metric,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public') as count,
    'Table relationship constraints' as description;

-- 14. RECOMMENDED TABLES CHECKLIST
-- =====================================================
SELECT 
    'RECOMMENDED TABLES CHECKLIST' as audit_section,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    importance,
    description
FROM (
    VALUES 
        ('platform_revenue', 'CRITICAL', 'Track all platform revenue and fees'),
        ('token_fee_periods', 'CRITICAL', 'Track 7-day fee collection periods'),
        ('auction_bids', 'CRITICAL', 'Track all auction bids'),
        ('analytics_cache', 'CRITICAL', 'Cache analytics data for performance'),
        ('marketplace_auctions', 'CRITICAL', 'Track all marketplace auctions'),
        ('marketplace_offers', 'CRITICAL', 'Track all marketplace offers'),
        ('marketplace_sales', 'CRITICAL', 'Track all marketplace sales'),
        ('marketplace_listings', 'CRITICAL', 'Track all marketplace listings'),
        ('tokens', 'CRITICAL', 'Track all tokens'),
        ('profiles', 'CRITICAL', 'Track all user profiles'),
        ('notifications', 'IMPORTANT', 'Track user notifications'),
        ('explore_page', 'IMPORTANT', 'Track explore page data'),
        ('royalty_leaderboard', 'OPTIONAL', 'Track royalty leaderboard'),
        ('royalty_payouts', 'OPTIONAL', 'Track royalty payouts'),
        ('token_statistics', 'OPTIONAL', 'Track token statistics'),
        ('stats_cache', 'OPTIONAL', 'Cache statistics data')
) AS t(table_name, importance, description)
ORDER BY 
    CASE importance 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'IMPORTANT' THEN 2 
        WHEN 'OPTIONAL' THEN 3 
    END,
    table_name;
