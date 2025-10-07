import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { ticketJWT, newBuyerName, newBuyerEmail } = JSON.parse(event.body);

    if (!ticketJWT || !newBuyerName || !newBuyerEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Missing required fields' })
      };
    }

    // Verify current ticket
    const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
    const ticketData = jwt.verify(ticketJWT, publicKey, {
      algorithms: ['RS256'],
      issuer: process.env.JWT_ISSUER || 'dep-platform',
      audience: process.env.JWT_AUDIENCE || 'dep-validator'
    });

    if (!ticketData.transferAllowed) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Transfer not allowed for this ticket' })
      };
    }

    // Check ticket status in database
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('is_redeemed, is_revoked')
      .eq('ticket_id', ticketData.ticketId)
      .single();

    if (fetchError) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Ticket not found in database' })
      };
    }

    if (ticket.is_redeemed) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Cannot transfer already redeemed ticket' })
      };
    }

    if (ticket.is_revoked) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Cannot transfer revoked ticket' })
      };
    }

    // Generate new credentials
    const newTotpSecret = authenticator.generateSecret();
    const newBackupPin = Math.floor(1000 + Math.random() * 9000).toString();
    const newBackupPinHash = await bcrypt.hash(newBackupPin, 10);

    // Create new ticket payload
    const newTicketPayload = {
      ...ticketData,
      buyerName: newBuyerName,
      buyerEmail: newBuyerEmail,
      totpSecret: newTotpSecret,
      backupPinHash: newBackupPinHash,
      issuedAt: new Date().toISOString()
    };

    // Sign new ticket
    const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    const newTicketJWT = jwt.sign(newTicketPayload, privateKey, {
      algorithm: 'RS256',
      issuer: process.env.JWT_ISSUER || 'dep-platform',
      audience: process.env.JWT_AUDIENCE || 'dep-validator',
      expiresIn: '1y'
    });

    // Update database with new owner and credentials
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        buyer_name: newBuyerName,
        buyer_email: newBuyerEmail,
        backup_pin_hash: newBackupPinHash,
        updated_at: new Date().toISOString()
      })
      .eq('ticket_id', ticketData.ticketId);

    if (updateError) {
      throw new Error('Failed to update ticket in database: ' + updateError.message);
    }

    // Log the transfer
    await supabase.from('transfers').insert([{
      ticket_id: ticketData.ticketId,
      from_email: ticketData.buyerEmail,
      to_email: newBuyerEmail,
      transferred_at: new Date().toISOString()
    }]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        newTicketJWT,
        newBackupPin,
        ticketId: ticketData.ticketId,
        guestUrl: `${process.env.URL || 'http://localhost:8888'}/ticket?tk=${encodeURIComponent(newTicketJWT)}`,
        message: 'Ticket successfully transferred'
      })
    };
  } catch (error) {
    console.error('Transfer error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Transfer failed: ' + error.message 
      })
    };
  }
};
