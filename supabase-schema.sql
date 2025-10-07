-- Hybrid Ticket Validation System - Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

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
    ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id),
    validator_id TEXT NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    method TEXT NOT NULL CHECK (method IN ('totp', 'pin', 'offline-sync')),
    ip_address INET,
    user_agent TEXT
);

-- Transfers table - logs all ticket transfers
CREATE TABLE IF NOT EXISTS transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id),
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    transferred_at TIMESTAMPTZ DEFAULT NOW(),
    transfer_reason TEXT
);

-- Validators table - tracks validator devices
CREATE TABLE IF NOT EXISTS validators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    validator_id TEXT UNIQUE NOT NULL,
    device_name TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_redeemed ON tickets(is_redeemed);
CREATE INDEX IF NOT EXISTS idx_tickets_valid_dates ON tickets(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_redemptions_ticket_id ON redemptions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_validator_id ON redemptions(validator_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed_at ON redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_transfers_ticket_id ON transfers(ticket_id);

-- Enable RLS on all tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE validators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets table
CREATE POLICY "Allow service role full access to tickets" ON tickets
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read their own tickets" ON tickets
    FOR SELECT USING (auth.role() = 'authenticated' AND buyer_email = auth.jwt() ->> 'email');

-- RLS Policies for redemptions table
CREATE POLICY "Allow service role full access to redemptions" ON redemptions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for transfers table
CREATE POLICY "Allow service role full access to transfers" ON transfers
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for validators table
CREATE POLICY "Allow service role full access to validators" ON validators
    FOR ALL USING (auth.role() = 'service_role');

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to tickets table
CREATE TRIGGER update_tickets_updated_at 
    BEFORE UPDATE ON tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

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
    revoked_tickets BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE is_redeemed = TRUE) as redeemed_tickets,
        COUNT(*) FILTER (WHERE is_redeemed = FALSE AND is_revoked = FALSE) as pending_tickets,
        COUNT(*) FILTER (WHERE is_revoked = TRUE) as revoked_tickets
    FROM tickets
    WHERE (event_id_param IS NULL OR event_id = event_id_param);
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO tickets (
    ticket_id, event_id, event_name, buyer_name, buyer_email, 
    seat_info, category, valid_from, valid_to, backup_pin_hash
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

-- Create a view for easy ticket validation
CREATE OR REPLACE VIEW ticket_validation_view AS
SELECT 
    t.ticket_id,
    t.event_name,
    t.buyer_name,
    t.seat_info,
    t.category,
    t.valid_from,
    t.valid_to,
    t.is_redeemed,
    t.is_revoked,
    t.redeemed_at,
    t.redeemed_by,
    CASE 
        WHEN t.is_redeemed THEN 'REDEEMED'
        WHEN t.is_revoked THEN 'REVOKED'
        WHEN NOW() < t.valid_from THEN 'NOT_YET_VALID'
        WHEN NOW() > t.valid_to THEN 'EXPIRED'
        ELSE 'VALID'
    END as status
FROM tickets t;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;