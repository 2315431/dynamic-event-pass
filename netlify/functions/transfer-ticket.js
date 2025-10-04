const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { ticketJWT, newBuyerName, newBuyerEmail } = JSON.parse(event.body);

    // Verify current ticket
    const ticketData = jwt.verify(ticketJWT, process.env.PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });

    if (!ticketData.transferAllowed) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Transfer not allowed' })
      };
    }

    // Check ticket status
    const { data: ticket } = await supabase
      .from('tickets')
      .select('is_redeemed, is_revoked')
      .eq('ticket_id', ticketData.ticketId)
      .single();

    if (ticket.is_redeemed || ticket.is_revoked) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Cannot transfer used/revoked ticket' })
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
      iat: Math.floor(Date.now() / 1000) // New issued at time
    };

    const newTicketJWT = jwt.sign(newTicketPayload, process.env.PRIVATE_KEY, {
      algorithm: 'RS256',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresIn: ticketData.validTo
    });

    // Update database
    await supabase
      .from('tickets')
      .update({
        buyer_name: newBuyerName,
        buyer_email: newBuyerEmail,
        backup_pin_hash: newBackupPinHash,
        updated_at: new Date().toISOString()
      })
      .eq('ticket_id', ticketData.ticketId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        newTicketJWT,
        newBackupPin,
        ticketUrl: `${process.env.URL || 'http://localhost:3000'}/ticket?tk=${newTicketJWT}`
      })
    };
  } catch (error) {
    console.error('Transfer error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Transfer failed' })
    };
  }
};
