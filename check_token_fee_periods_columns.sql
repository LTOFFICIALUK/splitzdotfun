-- Check the current structure of token_fee_periods table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'token_fee_periods'
ORDER BY ordinal_position;

-- Also check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'token_fee_periods'
) as table_exists;
