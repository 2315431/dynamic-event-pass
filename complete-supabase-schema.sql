-- =====================================================
-- HYBRID TICKET VALIDATION SYSTEM - COMPLETE SCHEMA
-- =====================================================
-- Copy and paste this entire script into Supabase SQL Editor
-- This creates all tables, indexes, policies, and functions needed

-- =====================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- Tickets table - stores ticket metadata and redemption status
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    seat_info TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    backup_pin_hash TEXT NOT NULL,
    transfer_allowed BOOLEAN DEFAULT true,
    is_redeemed BOOLEAN DEFAULT false,
    is_revoked BOOLEAN DEFAULT false,
    redeemed_at TIMESTAMPTZ,
    redeemed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redemptions table - logs all redemption attempts
CREATE TABLE IF NOT EXISTS redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    validator_id TEXT NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    method TEXT NOT NULL CHECK (method IN ('totp', 'pin', 'offline-sync')),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Transfers table - logs all ticket transfers
CREATE TABLE IF NOT EXISTS transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    transferred_at TIMESTAMPTZ DEFAULT NOW(),
    transfer_reason TEXT,
    validator_id TEXT
);

-- Validators table - tracks validator devices
CREATE TABLE IF NOT EXISTS validators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    validator_id TEXT UNIQUE NOT NULL,
    device_name TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    total_validations INTEGER DEFAULT 0,
    offline_validations INTEGER DEFAULT 0
);

-- Events table - stores event information
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    event_name TEXT NOT NULL,
    event_date TIMESTAMPTZ,
    venue TEXT,
    max_capacity INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Tickets table indexes
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_redeemed ON tickets(is_redeemed);
CREATE INDEX IF NOT EXISTS idx_tickets_is_revoked ON tickets(is_revoked);
CREATE INDEX IF NOT EXISTS idx_tickets_valid_dates ON tickets(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email ON tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- Redemptions table indexes
CREATE INDEX IF NOT EXISTS idx_redemptions_ticket_id ON redemptions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_validator_id ON redemptions(validator_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed_at ON redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_redemptions_success ON redemptions(success);

-- Transfers table indexes
CREATE INDEX IF NOT EXISTS idx_transfers_ticket_id ON transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_email ON transfers(from_email);
CREATE INDEX IF NOT EXISTS idx_transfers_to_email ON transfers(to_email);
CREATE INDEX IF NOT EXISTS idx_transfers_transferred_at ON transfers(transferred_at);

-- Validators table indexes
CREATE INDEX IF NOT EXISTS idx_validators_validator_id ON validators(validator_id);
CREATE INDEX IF NOT EXISTS idx_validators_is_active ON validators(is_active);
CREATE INDEX IF NOT EXISTS idx_validators_last_seen ON validators(last_seen);

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE validators ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Tickets table policies
CREATE POLICY "Allow service role full access to tickets" ON tickets
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read their own tickets" ON tickets
    FOR SELECT USING (auth.role() = 'authenticated' AND buyer_email = auth.jwt() ->> 'email');

-- Redemptions table policies
CREATE POLICY "Allow service role full access to redemptions" ON redemptions
    FOR ALL USING (auth.role() = 'service_role');

-- Transfers table policies
CREATE POLICY "Allow service role full access to transfers" ON transfers
    FOR ALL USING (auth.role() = 'service_role');

-- Validators table policies
CREATE POLICY "Allow service role full access to validators" ON validators
    FOR ALL USING (auth.role() = 'service_role');

-- Events table policies
CREATE POLICY "Allow service role full access to events" ON events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access to active events" ON events
    FOR SELECT USING (is_active = true);

-- =====================================================
-- 6. CREATE FUNCTIONS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check if ticket is valid for redemption
CREATE OR REPLACE FUNCTION is_ticket_valid_for_redemption(ticket_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    ticket_record RECORD;
BEGIN
    SELECT * INTO ticket_record 
    FROM tickets 
    WHERE ticket_id = ticket_id_param;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    IF ticket_record.is_redeemed = TRUE THEN
        RETURN FALSE;
    END IF;
    
    IF ticket_record.is_revoked = TRUE THEN
        RETURN FALSE;
    END IF;
    
    IF NOW() < ticket_record.valid_from THEN
        RETURN FALSE;
    END IF;
    
    IF NOW() > ticket_record.valid_to THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get ticket statistics
CREATE OR REPLACE FUNCTION get_ticket_stats(event_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    total_tickets BIGINT,
    redeemed_tickets BIGINT,
    pending_tickets BIGINT,
    revoked_tickets BIGINT,
    expired_tickets BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE is_redeemed = TRUE) as redeemed_tickets,
        COUNT(*) FILTER (WHERE is_redeemed = FALSE AND is_revoked = FALSE AND NOW() <= valid_to) as pending_tickets,
        COUNT(*) FILTER (WHERE is_revoked = TRUE) as revoked_tickets,
        COUNT(*) FILTER (WHERE NOW() > valid_to AND is_redeemed = FALSE) as expired_tickets
    FROM tickets
    WHERE (event_id_param IS NULL OR event_id = event_id_param);
END;
$$ LANGUAGE plpgsql;

-- Function to get validator statistics
CREATE OR REPLACE FUNCTION get_validator_stats(validator_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    total_validations BIGINT,
    successful_validations BIGINT,
    failed_validations BIGINT,
    offline_validations BIGINT,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_validations,
        COUNT(*) FILTER (WHERE success = TRUE) as successful_validations,
        COUNT(*) FILTER (WHERE success = FALSE) as failed_validations,
        COUNT(*) FILTER (WHERE method = 'offline-sync') as offline_validations,
        MAX(redeemed_at) as last_activity
    FROM redemptions
    WHERE (validator_id_param IS NULL OR validator_id = validator_id_param);
END;
$$ LANGUAGE plpgsql;

-- Function to redeem ticket
CREATE OR REPLACE FUNCTION redeem_ticket(
    ticket_id_param TEXT,
    validator_id_param TEXT,
    method_param TEXT DEFAULT 'totp'
)
RETURNS JSON AS $$
DECLARE
    ticket_record RECORD;
    redemption_id UUID;
    result JSON;
BEGIN
    -- Check if ticket exists and is valid
    IF NOT is_ticket_valid_for_redemption(ticket_id_param) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ticket is not valid for redemption'
        );
    END IF;
    
    -- Get ticket details
    SELECT * INTO ticket_record 
    FROM tickets 
    WHERE ticket_id = ticket_id_param;
    
    -- Mark ticket as redeemed
    UPDATE tickets 
    SET 
        is_redeemed = TRUE,
        redeemed_at = NOW(),
        redeemed_by = validator_id_param,
        updated_at = NOW()
    WHERE ticket_id = ticket_id_param;
    
    -- Log redemption
    INSERT INTO redemptions (ticket_id, validator_id, method, success)
    VALUES (ticket_id_param, validator_id_param, method_param, TRUE)
    RETURNING id INTO redemption_id;
    
    -- Update validator stats
    UPDATE validators 
    SET 
        total_validations = total_validations + 1,
        last_seen = NOW()
    WHERE validator_id = validator_id_param;
    
    -- Return success result
    RETURN json_build_object(
        'success', true,
        'ticket_id', ticket_id_param,
        'event_name', ticket_record.event_name,
        'buyer_name', ticket_record.buyer_name,
        'seat_info', ticket_record.seat_info,
        'category', ticket_record.category,
        'redeemed_at', NOW(),
        'redemption_id', redemption_id
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE TRIGGERS
-- =====================================================

-- Add updated_at trigger to tickets table
CREATE TRIGGER update_tickets_updated_at 
    BEFORE UPDATE ON tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. CREATE VIEWS
-- =====================================================

-- View for easy ticket validation
CREATE OR REPLACE VIEW ticket_validation_view AS
SELECT 
    t.ticket_id,
    t.event_id,
    t.event_name,
    t.buyer_name,
    t.buyer_email,
    t.seat_info,
    t.category,
    t.valid_from,
    t.valid_to,
    t.is_redeemed,
    t.is_revoked,
    t.redeemed_at,
    t.redeemed_by,
    t.created_at,
    CASE 
        WHEN t.is_redeemed THEN 'REDEEMED'
        WHEN t.is_revoked THEN 'REVOKED'
        WHEN NOW() < t.valid_from THEN 'NOT_YET_VALID'
        WHEN NOW() > t.valid_to THEN 'EXPIRED'
        ELSE 'VALID'
    END as status
FROM tickets t;

-- View for redemption analytics
CREATE OR REPLACE VIEW redemption_analytics AS
SELECT 
    DATE(r.redeemed_at) as redemption_date,
    COUNT(*) as total_redemptions,
    COUNT(*) FILTER (WHERE r.success = TRUE) as successful_redemptions,
    COUNT(*) FILTER (WHERE r.success = FALSE) as failed_redemptions,
    COUNT(*) FILTER (WHERE r.method = 'totp') as totp_redemptions,
    COUNT(*) FILTER (WHERE r.method = 'pin') as pin_redemptions,
    COUNT(*) FILTER (WHERE r.method = 'offline-sync') as offline_redemptions
FROM redemptions r
GROUP BY DATE(r.redeemed_at)
ORDER BY redemption_date DESC;

-- =====================================================
-- 9. INSERT SAMPLE DATA
-- =====================================================

-- Insert sample event
INSERT INTO events (event_id, event_name, event_date, venue, max_capacity) VALUES 
('CONF2025', 'Future of Web Summit', '2025-06-15 09:00:00+00', 'Convention Center', 1000)
ON CONFLICT (event_id) DO NOTHING;

-- Insert sample validator
INSERT INTO validators (validator_id, device_name, is_active) VALUES 
('validator-1', 'Main Entrance Scanner', true),
('validator-2', 'VIP Entrance Scanner', true)
ON CONFLICT (validator_id) DO NOTHING;

-- Insert sample ticket (for testing)
INSERT INTO tickets (
    ticket_id, 
    event_id, 
    event_name, 
    buyer_name, 
    buyer_email, 
    seat_info, 
    category, 
    valid_from, 
    valid_to, 
    backup_pin_hash
) VALUES (
    'TKT-SAMPLE-001',
    'CONF2025',
    'Future of Web Summit',
    'John Doe',
    'john@example.com',
    'VIP-001',
    'VIP',
    NOW(),
    NOW() + INTERVAL '1 year',
    '$2a$10$sample.hash.here'
) ON CONFLICT (ticket_id) DO NOTHING;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to service role
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant select permissions to authenticated users for their own tickets
GRANT SELECT ON ticket_validation_view TO authenticated;
GRANT SELECT ON redemption_analytics TO authenticated;

-- =====================================================
-- 11. CREATE STORAGE BUCKETS (OPTIONAL)
-- =====================================================

-- Create bucket for ticket images (if needed)
INSERT INTO storage.buckets (id, name, public) VALUES 
('ticket-images', 'ticket-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for event assets (if needed)
INSERT INTO storage.buckets (id, name, public) VALUES 
('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tickets', 'redemptions', 'transfers', 'validators', 'events')
ORDER BY table_name;

-- Verify indexes were created
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('tickets', 'redemptions', 'transfers', 'validators', 'events')
ORDER BY tablename, indexname;

-- Verify functions were created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_ticket_valid_for_redemption', 'get_ticket_stats', 'redeem_ticket')
ORDER BY routine_name;

-- =====================================================
-- SCHEMA COMPLETE! 
-- =====================================================
-- Your hybrid ticket validation system database is ready!
-- 
-- Next steps:
-- 1. Get your Supabase project URL and service role key
-- 2. Add them to your Netlify environment variables
-- 3. Deploy your application
-- 4. Test the system!