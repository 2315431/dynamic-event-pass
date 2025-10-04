import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { 
      eventId = 'DEFAULT_EVENT', 
      eventName, 
      buyerName, 
      buyerEmail, 
      seatInfo, 
      category = 'General'
    } = JSON.parse(event.body);

    // Validate required fields
    if (!eventName || !buyerName || !buyerEmail || !seatInfo) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
    }

    const ticketId = `TKT-${Date.now()}`;
    const totpSecret = authenticator.generateSecret();
    const backupPin = Math.floor(1000 + Math.random() * 9000).toString();
    const backupPinHash = await bcrypt.hash(backupPin, 10);
    const validFrom = new Date();
    const validTo = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year validity

    const ticketPayload = {
      ticketId, eventId, eventName, buyerName, buyerEmail, seatInfo, category, totpSecret, backupPinHash,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
    };

    const ticketJWT = jwt.sign(ticketPayload, process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), {
      algorithm: 'RS256',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresIn: '1y'
    });

    const { error: dbError } = await supabase.from('tickets').insert({
      ticket_id: ticketId,
      event_id: eventId,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      is_redeemed: false,
    });

    if (dbError) {
      console.error('Supabase error:', dbError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Database operation failed.' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        ticketJWT,
        backupPin,
        ticketUrl: `/ticket?tk=${ticketJWT}`
      })
    };

  } catch (error) {
    console.error('Internal Server Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unexpected error occurred.' })
    };
  }
};