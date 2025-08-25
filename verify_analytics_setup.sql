-- =====================================================
-- ANALYTICS SETUP VERIFICATION QUERIES
-- =====================================================

-- 1. CHECK IF ALL REQUIRED TABLES EXIST
-- =====================================================
SELECT 'Table Existence Check' as check_type, table_name, 'EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN (
    'platform_revenue',
    'token_fee_periods', 
    'auction_bids',
    'analytics_cache',
    'marketplace_auctions',
    'marketplace_offers',
    'marketplace_sales',
    'tokens',
    'profiles'
)
ORDER BY table_name;

-- 2. CHECK IF ALL REQUIRED VIEWS EXIST
-- =====================================================
SELECT 'View Existence Check' as check_type, table_name as view_name, 'EXISTS' as status
FROM information_schema.views 
WHERE table_name IN (
    'auction_analytics',
    'offer_analytics', 
    'revenue_analytics',
    'platform_revenue_summary',
    'token_fee_periods_summary'
)
ORDER BY table_name;

-- 3. CHECK IF ALL REQUIRED INDEXES EXIST
-- =====================================================
SELECT 'Index Existence Check' as check_type, indexname, 'EXISTS' as status
FROM pg_indexes 
WHERE indexname IN (
    'idx_platform_revenue_type',
    'idx_platform_revenue_collection_date',
    'idx_platform_revenue_sale_id',
    'idx_platform_revenue_auction_id',
    'idx_token_fee_periods_token',
    'idx_token_fee_periods_sale',
    'idx_token_fee_periods_status',
    'idx_token_fee_periods_period',
    'idx_auction_bids_auction_id',
    'idx_auction_bids_bidder_user_id',
    'idx_auction_bids_bid_time',
    'idx_analytics_cache_key',
    'idx_analytics_cache_expires_at'
)
ORDER BY indexname;

-- 4. CHECK IF ALL REQUIRED FUNCTIONS EXIST
-- =====================================================
SELECT 'Function Existence Check' as check_type, routine_name, 'EXISTS' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'calculate_platform_fee',
    'calculate_seller_amount'
)
ORDER BY routine_name;

-- =====================================================
-- AUCTION ANALYTICS VERIFICATION
-- =====================================================

-- 5. AUCTION SUCCESS RATES
-- =====================================================
SELECT 
    'Auction Success Rates' as metric,
    COUNT(*) as total_auctions,
    COUNT(CASE WHEN status = 'sold' THEN 1 END) as successful_auctions,
    COALESCE(
        ROUND(
            (COUNT(CASE WHEN status = 'sold' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
        ), 0
    ) as success_rate_percent
FROM marketplace_auctions
WHERE auction_end < NOW();

-- 6. AVERAGE BID AMOUNTS
-- =====================================================
SELECT 
    'Average Bid Amounts' as metric,
    COUNT(*) as total_bids,
    COALESCE(ROUND(AVG(bid_amount), 4), 0) as average_bid_amount_sol,
    COALESCE(ROUND(MIN(bid_amount), 4), 0) as min_bid_amount_sol,
    COALESCE(ROUND(MAX(bid_amount), 4), 0) as max_bid_amount_sol
FROM auction_bids;

-- 7. AUCTION DURATION STATS
-- =====================================================
SELECT 
    'Auction Duration Stats' as metric,
    COUNT(*) as completed_auctions,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (auction_end - auction_start)) / 3600), 2), 0) as avg_duration_hours,
    COALESCE(ROUND(MIN(EXTRACT(EPOCH FROM (auction_end - auction_start)) / 3600), 2), 0) as min_duration_hours,
    COALESCE(ROUND(MAX(EXTRACT(EPOCH FROM (auction_end - auction_start)) / 3600), 2), 0) as max_duration_hours
FROM marketplace_auctions
WHERE status = 'sold' AND auction_end < NOW();

-- 8. BIDDER PARTICIPATION
-- =====================================================
SELECT 
    'Bidder Participation' as metric,
    COUNT(DISTINCT bidder_user_id) as unique_bidders,
    COUNT(*) as total_bids,
    COALESCE(
        ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT bidder_user_id), 0), 2), 0
    ) as avg_bids_per_bidder
FROM auction_bids;

-- =====================================================
-- OFFER ANALYTICS VERIFICATION
-- =====================================================

-- 9. OFFER ACCEPTANCE RATES
-- =====================================================
SELECT 
    'Offer Acceptance Rates' as metric,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_offers,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_offers,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_offers,
    COALESCE(
        ROUND(
            (COUNT(CASE WHEN status = 'accepted' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
        ), 0
    ) as acceptance_rate_percent
FROM marketplace_offers;

-- 10. AVERAGE OFFER AMOUNTS
-- =====================================================
SELECT 
    'Average Offer Amounts' as metric,
    COUNT(*) as total_offers,
    COALESCE(ROUND(AVG(offer_amount), 4), 0) as average_offer_amount_sol,
    COALESCE(ROUND(MIN(offer_amount), 4), 0) as min_offer_amount_sol,
    COALESCE(ROUND(MAX(offer_amount), 4), 0) as max_offer_amount_sol
FROM marketplace_offers;

-- 11. NEGOTIATION PATTERNS (Time to resolution)
-- =====================================================
SELECT 
    'Negotiation Patterns' as metric,
    COUNT(*) as resolved_offers,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 2), 0) as avg_resolution_hours,
    COALESCE(ROUND(MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 2), 0) as min_resolution_hours,
    COALESCE(ROUND(MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 2), 0) as max_resolution_hours
FROM marketplace_offers
WHERE status IN ('accepted', 'rejected') AND updated_at IS NOT NULL;

-- 12. TIME TO ACCEPTANCE
-- =====================================================
SELECT 
    'Time to Acceptance' as metric,
    COUNT(*) as accepted_offers,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 2), 0) as avg_acceptance_hours,
    COALESCE(ROUND(MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 2), 0) as min_acceptance_hours,
    COALESCE(ROUND(MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 2), 0) as max_acceptance_hours
FROM marketplace_offers
WHERE status = 'accepted' AND updated_at IS NOT NULL;

-- =====================================================
-- REVENUE ANALYTICS VERIFICATION
-- =====================================================

-- 13. PLATFORM FEE REVENUE
-- =====================================================
SELECT 
    'Platform Fee Revenue' as metric,
    COUNT(*) as total_transactions,
    COALESCE(ROUND(SUM(amount_sol), 4), 0) as total_revenue_sol,
    COALESCE(ROUND(SUM(amount_usd), 2), 0) as total_revenue_usd,
    COALESCE(ROUND(AVG(amount_sol), 4), 0) as avg_revenue_per_transaction_sol
FROM platform_revenue
WHERE revenue_type = 'sale_fee' AND status = 'collected';

-- 14. TOKEN FEE REVENUE
-- =====================================================
SELECT 
    'Token Fee Revenue' as metric,
    COUNT(*) as total_transactions,
    COALESCE(ROUND(SUM(amount_sol), 4), 0) as total_revenue_sol,
    COALESCE(ROUND(SUM(amount_usd), 2), 0) as total_revenue_usd,
    COALESCE(ROUND(AVG(amount_sol), 4), 0) as avg_revenue_per_transaction_sol
FROM platform_revenue
WHERE revenue_type = 'token_fee' AND status = 'collected';

-- 15. REVENUE TRENDS (Daily breakdown)
-- =====================================================
SELECT 
    'Revenue Trends (Last 30 Days)' as metric,
    DATE_TRUNC('day', COALESCE(collection_date, created_at)) as date,
    revenue_type,
    COUNT(*) as transaction_count,
    COALESCE(ROUND(SUM(amount_sol), 4), 0) as daily_revenue_sol,
    COALESCE(ROUND(SUM(amount_usd), 2), 0) as daily_revenue_usd
FROM platform_revenue
WHERE status = 'collected' 
    AND COALESCE(collection_date, created_at) >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', COALESCE(collection_date, created_at)), revenue_type
ORDER BY date DESC, revenue_type;

-- 16. FEE COLLECTION EFFICIENCY
-- =====================================================
SELECT 
    'Fee Collection Efficiency' as metric,
    COUNT(*) as total_revenue_records,
    COUNT(CASE WHEN status = 'collected' THEN 1 END) as successfully_collected,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_collection,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_collection,
    COALESCE(
        ROUND(
            (COUNT(CASE WHEN status = 'collected' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
        ), 0
    ) as collection_success_rate_percent
FROM platform_revenue;

-- =====================================================
-- TOKEN FEE PERIODS VERIFICATION
-- =====================================================

-- 17. TOKEN FEE PERIODS SUMMARY
-- =====================================================
SELECT 
    'Token Fee Periods Summary' as metric,
    COUNT(*) as total_periods,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_periods,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_periods,
    COALESCE(ROUND(SUM(total_fees_generated), 4), 0) as total_fees_generated_sol,
    COALESCE(ROUND(SUM(platform_fee_collected), 4), 0) as total_platform_fees_collected_sol
FROM token_fee_periods;

-- =====================================================
-- ANALYTICS CACHE VERIFICATION
-- =====================================================

-- 18. ANALYTICS CACHE STATUS
-- =====================================================
SELECT 
    'Analytics Cache Status' as metric,
    COUNT(*) as total_cache_entries,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_cache_entries,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_cache_entries,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600), 2), 0) as avg_cache_duration_hours
FROM analytics_cache;

-- =====================================================
-- VIEW DATA VERIFICATION
-- =====================================================

-- 19. VERIFY AUCTION ANALYTICS VIEW
-- =====================================================
SELECT 
    'Auction Analytics View' as metric,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_auctions,
    COALESCE(ROUND(AVG(total_bids), 2), 0) as avg_bids_per_auction,
    COALESCE(ROUND(AVG(unique_bidders), 2), 0) as avg_unique_bidders_per_auction
FROM auction_analytics;

-- 20. VERIFY OFFER ANALYTICS VIEW
-- =====================================================
SELECT 
    'Offer Analytics View' as metric,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_offers,
    COALESCE(ROUND(AVG(time_to_resolution_hours), 2), 0) as avg_resolution_time_hours
FROM offer_analytics;

-- 21. VERIFY REVENUE ANALYTICS VIEW
-- =====================================================
SELECT 
    'Revenue Analytics View' as metric,
    COUNT(*) as total_records,
    COUNT(CASE WHEN revenue_type = 'sale_fee' THEN 1 END) as sale_fee_records,
    COUNT(CASE WHEN revenue_type = 'token_fee' THEN 1 END) as token_fee_records,
    COALESCE(ROUND(SUM(amount_sol), 4), 0) as total_revenue_sol
FROM revenue_analytics;

-- =====================================================
-- DATA QUALITY CHECKS
-- =====================================================

-- 22. CHECK FOR NULL VALUES IN CRITICAL COLUMNS
-- =====================================================
SELECT 
    'Data Quality - Null Check' as check_type,
    'platform_revenue.amount_sol' as column_name,
    COUNT(*) as null_count
FROM platform_revenue 
WHERE amount_sol IS NULL
UNION ALL
SELECT 
    'Data Quality - Null Check' as check_type,
    'platform_revenue.revenue_type' as column_name,
    COUNT(*) as null_count
FROM platform_revenue 
WHERE revenue_type IS NULL
UNION ALL
SELECT 
    'Data Quality - Null Check' as check_type,
    'auction_bids.bid_amount' as column_name,
    COUNT(*) as null_count
FROM auction_bids 
WHERE bid_amount IS NULL
UNION ALL
SELECT 
    'Data Quality - Null Check' as check_type,
    'marketplace_offers.offer_amount' as column_name,
    COUNT(*) as null_count
FROM marketplace_offers 
WHERE offer_amount IS NULL;

-- 23. CHECK FOR INVALID DATA
-- =====================================================
SELECT 
    'Data Quality - Invalid Data' as check_type,
    'platform_revenue.amount_sol <= 0' as issue,
    COUNT(*) as count
FROM platform_revenue 
WHERE amount_sol <= 0
UNION ALL
SELECT 
    'Data Quality - Invalid Data' as check_type,
    'auction_bids.bid_amount <= 0' as issue,
    COUNT(*) as count
FROM auction_bids 
WHERE bid_amount <= 0
UNION ALL
SELECT 
    'Data Quality - Invalid Data' as check_type,
    'marketplace_offers.offer_amount <= 0' as issue,
    COUNT(*) as count
FROM marketplace_offers 
WHERE offer_amount <= 0;

-- =====================================================
-- SUMMARY REPORT
-- =====================================================

-- 24. OVERALL ANALYTICS SETUP SUMMARY
-- =====================================================
SELECT 
    'ANALYTICS SETUP SUMMARY' as summary_type,
    'Tables' as component,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('platform_revenue', 'token_fee_periods', 'auction_bids', 'analytics_cache')) as count,
    '4 required tables' as expected
UNION ALL
SELECT 
    'ANALYTICS SETUP SUMMARY' as summary_type,
    'Views' as component,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_name IN ('auction_analytics', 'offer_analytics', 'revenue_analytics', 'platform_revenue_summary', 'token_fee_periods_summary')) as count,
    '5 required views' as expected
UNION ALL
SELECT 
    'ANALYTICS SETUP SUMMARY' as summary_type,
    'Indexes' as component,
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%') as count,
    '13+ required indexes' as expected
UNION ALL
SELECT 
    'ANALYTICS SETUP SUMMARY' as summary_type,
    'Functions' as component,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name IN ('calculate_platform_fee', 'calculate_seller_amount')) as count,
    '2 required functions' as expected;
