-- =====================================================
-- ROYALTY PAYOUT SYSTEM AUDIT - TABLE STRUCTURE ONLY
-- =====================================================

-- 1. CHECK ROYALTY-RELATED TABLES EXISTENCE
-- =====================================================
SELECT 
    'ROYALTY TABLES CHECK' as audit_section,
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
        ('royalty_payouts', 'CRITICAL', 'Track all royalty payouts to users'),
        ('royalty_leaderboard', 'CRITICAL', 'Track royalty earnings leaderboard'),
        ('royalty_agreement_versions', 'CRITICAL', 'Track royalty agreement versions'),
        ('royalty_agreement_version_shares', 'CRITICAL', 'Track individual royalty shares'),
        ('token_ownership', 'CRITICAL', 'Track token ownership and royalty earners'),
        ('fee_accrual_ledger', 'CRITICAL', 'Track fee accrual and payouts'),
        ('earner_token_balances_v', 'CRITICAL', 'View of earner balances'),
        ('token_balances_v', 'CRITICAL', 'View of token treasury balances')
) AS t(table_name, importance, description)
ORDER BY 
    CASE importance 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'IMPORTANT' THEN 2 
        WHEN 'OPTIONAL' THEN 3 
    END,
    table_name;

-- 2. CHECK ROYALTY PAYOUTS TABLE STRUCTURE
-- =====================================================
SELECT 
    'ROYALTY PAYOUTS STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'royalty_payouts'
ORDER BY ordinal_position;

-- 3. CHECK ROYALTY LEADERBOARD TABLE STRUCTURE
-- =====================================================
SELECT 
    'ROYALTY LEADERBOARD STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'royalty_leaderboard'
ORDER BY ordinal_position;

-- 4. CHECK ROYALTY AGREEMENT VERSIONS TABLE STRUCTURE
-- =====================================================
SELECT 
    'ROYALTY AGREEMENT VERSIONS STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'royalty_agreement_versions'
ORDER BY ordinal_position;

-- 5. CHECK ROYALTY AGREEMENT VERSION SHARES TABLE STRUCTURE
-- =====================================================
SELECT 
    'ROYALTY AGREEMENT VERSION SHARES STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'royalty_agreement_version_shares'
ORDER BY ordinal_position;

-- 6. CHECK FEE ACCRUAL LEDGER TABLE STRUCTURE
-- =====================================================
SELECT 
    'FEE ACCRUAL LEDGER STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'fee_accrual_ledger'
ORDER BY ordinal_position;

-- 7. CHECK TOKEN OWNERSHIP TABLE STRUCTURE
-- =====================================================
SELECT 
    'TOKEN OWNERSHIP STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'token_ownership'
ORDER BY ordinal_position;

-- 8. CHECK ROYALTY VIEWS EXISTENCE
-- =====================================================
SELECT 
    'ROYALTY VIEWS CHECK' as audit_section,
    view_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = v.view_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    description
FROM (
    VALUES 
        ('earner_token_balances_v', 'View of earner balances per token'),
        ('token_balances_v', 'View of token treasury balances')
) AS v(view_name, description)
ORDER BY view_name;

-- 9. CHECK ROYALTY VIEW STRUCTURES (if they exist)
-- =====================================================
SELECT 
    'EARNER TOKEN BALANCES VIEW STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'earner_token_balances_v'
ORDER BY ordinal_position;

SELECT 
    'TOKEN BALANCES VIEW STRUCTURE' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'token_balances_v'
ORDER BY ordinal_position;

-- 10. ROYALTY PAYOUT SYSTEM SUMMARY
-- =====================================================
SELECT 
    'ROYALTY PAYOUT SYSTEM SUMMARY' as audit_section,
    'Total Royalty Tables' as metric,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN (
        'royalty_payouts', 'royalty_leaderboard', 'royalty_agreement_versions', 
        'royalty_agreement_version_shares', 'token_ownership', 'fee_accrual_ledger'
    )) as count,
    '6 required tables' as expected
UNION ALL
SELECT 
    'ROYALTY PAYOUT SYSTEM SUMMARY' as audit_section,
    'Total Royalty Views' as metric,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_name IN (
        'earner_token_balances_v', 'token_balances_v'
    )) as count,
    '2 required views' as expected;
