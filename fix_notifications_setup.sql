-- Fix notifications setup
-- This will create the notifications table and all necessary components

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Changed from UUID to TEXT to match wallet addresses
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified for service role access)
CREATE POLICY "Allow all operations for service role" ON notifications
    FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Create function to clean up old notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = false) as unread_count,
    COUNT(*) FILTER (WHERE read = true) as read_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d,
    MAX(created_at) as last_notification_at
FROM notifications
GROUP BY user_id;

-- Create a view for notification types summary
CREATE OR REPLACE VIEW notification_types_summary AS
SELECT 
    type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE read = false) as unread_count,
    COUNT(*) FILTER (WHERE read = true) as read_count,
    AVG(EXTRACT(EPOCH FROM (read_at - created_at))) as avg_read_time_seconds
FROM notifications
GROUP BY type
ORDER BY total_count DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO service_role;
GRANT SELECT ON notification_stats TO service_role;
GRANT SELECT ON notification_types_summary TO service_role;
