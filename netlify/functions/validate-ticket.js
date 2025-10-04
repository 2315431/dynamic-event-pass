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
    const { ticketJWT, code, codeType = 'totp', validatorDevice = 'unknown' } = JSON.parse(event.body);

    // Verify JWT signature
    let ticketData;
    try {
      ticketData = jwt.verify(ticketJWT, process.env.PUBLIC_KEY, {
        algorithms: ['ES256'],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE
      });
    } catch (jwtError) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid ticket signature',
          details: jwtError.message 
        })
      };
    }

    // Check if ticket exists and is not redeemed/revoked
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticketData.ticketId)
      .single();

    if (fetchError || !ticket) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Ticket not found' })
      };
    }

    if (ticket.is_redeemed) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket already used',
          redeemedAt: ticket.redeemed_at
        })
      };
    }

    if (ticket.is_revoked) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Ticket revoked' })
      };
    }

    // Check validity period
    const now = new Date();
    const validFrom = new Date(ticketData.validFrom);
    const validTo = new Date(ticketData.validTo);

    if (now < validFrom || now > validTo) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket not valid for current time',
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString()
        })
      };
    }

    // Validate code
    let codeValid = false;
    
    if (codeType === 'totp') {
      // Verify TOTP code
      codeValid = authenticator.verify({
        token: code,
        secret: ticketData.totpSecret,
        window: parseInt(process.env.TOTP_WINDOW) || 1
      });
    } else if (codeType === 'pin') {
      // Verify backup PIN
      codeValid = await bcrypt.compare(code, ticketData.backupPinHash);
    }

    if (!codeValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Invalid code' })
      };
    }

    // Mark as redeemed
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        is_redeemed: true,
        redeemed_at: new Date().toISOString()
      })
      .eq('ticket_id', ticketData.ticketId);

    if (updateError) {
      console.error('Update error:', updateError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to redeem ticket' })
      };
    }

    // Log redemption
    await supabase.from('redemption_logs').insert({
      ticket_id: ticketData.ticketId,
      validator_device: validatorDevice,
      redeemed_at: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        ticketData: {
          ticketId: ticketData.ticketId,
          eventName: ticketData.eventName,
          buyerName: ticketData.buyerName,
          seatInfo: ticketData.seatInfo,
          category: ticketData.category
        },
        redeemedAt: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
