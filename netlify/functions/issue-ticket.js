import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  
  try {
    const { 
      eventName, 
      buyerName, 
      buyerEmail, 
      seatInfo, 
      category = 'General', 
      eventId = 'CONF2025',
      transferAllowed = true,
      expiresAt = null
    } = JSON.parse(event.body);
    
    if (!eventName || !buyerName || !buyerEmail || !seatInfo) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
    }

    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totpSecret = authenticator.generateSecret();
    const backupPin = Math.floor(1000 + Math.random() * 9000).toString();
    const backupPinHash = await bcrypt.hash(backupPin, 10);
    const validFrom = new Date();
    const validTo = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 31536000000); // 1 year default
    
    // Enhanced JWT payload with all necessary data for offline validation
    const ticketPayload = { 
      ticketId, 
      eventName, 
      buyerName, 
      buyerEmail, 
      seatInfo, 
      category, 
      eventId,
      totpSecret, 
      backupPinHash, 
      transferAllowed,
      validFrom: validFrom.toISOString(), 
      validTo: validTo.toISOString(),
      issuedAt: new Date().toISOString()
    };
    
    const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    const ticketJWT = jwt.sign(ticketPayload, privateKey, { 
      algorithm: 'RS256', 
      issuer: process.env.JWT_ISSUER || 'dep-platform', 
      audience: process.env.JWT_AUDIENCE || 'dep-validator', 
      expiresIn: '1y' 
    });

    // Save to database for online validation and sync
    await supabase.from('tickets').insert([{
      ticket_id: ticketId, 
      event_id: eventId, 
      event_name: eventName, 
      buyer_name: buyerName, 
      buyer_email: buyerEmail,
      seat_info: seatInfo, 
      category: category, 
      valid_from: validFrom.toISOString(), 
      valid_to: validTo.toISOString(),
      backup_pin_hash: backupPinHash,
      transfer_allowed: transferAllowed,
      is_redeemed: false,
      created_at: new Date().toISOString()
    }]);

    // Create guest URL with ticket token
    const guestUrl = `${process.env.URL || 'http://localhost:8888'}/ticket?tk=${encodeURIComponent(ticketJWT)}`;

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true, 
        ticketJWT, 
        guestUrl,
        ticketId,
        backupPin, // Only returned during issuance for user to note down
        totpSecret // For testing - remove in production
      }) 
    };
  } catch (error) {
    console.error('Issue ticket error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: `Server error: ${error.message}` }) };
  }
};