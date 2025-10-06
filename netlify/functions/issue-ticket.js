import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const { eventName, buyerName, buyerEmail, seatInfo, category = 'General', eventId = 'CONF2025' } = JSON.parse(event.body);
    if (!eventName || !buyerName || !buyerEmail || !seatInfo) return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };

    const ticketId = `TKT-${Date.now()}`;
    const totpSecret = authenticator.generateSecret();
    const backupPin = Math.floor(1000 + Math.random() * 9000).toString();
    const backupPinHash = await bcrypt.hash(backupPin, 10);
    const validFrom = new Date();
    const validTo = new Date(Date.now() + 31536000000); // 1 year
    
    // The JWT payload is simple again, without image data.
    const ticketPayload = { ticketId, eventName, buyerName, buyerEmail, seatInfo, category, totpSecret, backupPinHash, validFrom: validFrom.toISOString(), validTo: validTo.toISOString() };
    const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    const ticketJWT = jwt.sign(ticketPayload, privateKey, { algorithm: 'ES256', issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: '1y' });

    // Save the essential data to your database.
    await supabase.from('tickets').insert([{
      ticket_id: ticketId, event_id: eventId, event_name: eventName, buyer_name: buyerName, buyer_email: buyerEmail,
      seat_info: seatInfo, category: category, valid_from: validFrom.toISOString(), valid_to: validTo.toISOString(),
      backup_pin_hash: backupPinHash
    }]);

    return { statusCode: 200, body: JSON.stringify({ success: true, ticketJWT }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: `Server error: ${error.message}` }) };
  }
};