import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { ticketJWT, totpCode, backupPin, validatorId = 'default' } = JSON.parse(event.body);

    if (!ticketJWT) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing ticketJWT.' }) };
    }

    // STEP 1: OFFLINE CRYPTOGRAPHIC VALIDATION
    let ticketPayload;
    try {
      const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
      ticketPayload = jwt.verify(ticketJWT, publicKey, { 
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER || 'dep-platform',
        audience: process.env.JWT_AUDIENCE || 'dep-validator'
      });
    } catch (jwtError) {
      return { 
        statusCode: 401, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid ticket signature.', 
          details: jwtError.message 
        }) 
      };
    }

    // Check ticket validity period
    const now = new Date();
    const validFrom = new Date(ticketPayload.validFrom);
    const validTo = new Date(ticketPayload.validTo);

    if (now < validFrom) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket not yet valid.' 
        }) 
      };
    }

    if (now > validTo) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket has expired.' 
        }) 
      };
    }

    // STEP 2: TOTP OR PIN VALIDATION
    let codeValid = false;
    
    if (totpCode) {
      // Validate TOTP code
      codeValid = authenticator.verify({ 
        token: totpCode, 
        secret: ticketPayload.totpSecret,
        step: parseInt(process.env.TOTP_STEP) || 30,
        window: parseInt(process.env.TOTP_WINDOW) || 1
      });
    } else if (backupPin) {
      // Validate backup PIN
      codeValid = await bcrypt.compare(backupPin, ticketPayload.backupPinHash);
    } else {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Either TOTP code or backup PIN required.' 
        }) 
      };
    }

    if (!codeValid) {
      return { 
        statusCode: 401, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication code.' 
        }) 
      };
    }

    // STEP 3: ONLINE DATABASE VALIDATION (if possible)
    let onlineValidation = { success: false, error: 'Offline mode' };
    
    try {
      // Check if ticket is already redeemed in database
      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('is_redeemed, buyer_name, event_name, seat_info, category')
        .eq('ticket_id', ticketPayload.ticketId)
        .single();

      if (fetchError) {
        onlineValidation = { success: false, error: 'Database error: ' + fetchError.message };
      } else if (!ticket) {
        onlineValidation = { success: false, error: 'Ticket not found in database' };
      } else if (ticket.is_redeemed) {
        onlineValidation = { success: false, error: 'Ticket already redeemed' };
      } else {
        // Mark as redeemed
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ 
            is_redeemed: true, 
            redeemed_at: new Date().toISOString(),
            redeemed_by: validatorId
          })
          .eq('ticket_id', ticketPayload.ticketId);

        if (updateError) {
          onlineValidation = { success: false, error: 'Failed to mark as redeemed: ' + updateError.message };
        } else {
          onlineValidation = { success: true };
          
          // Log redemption
          await supabase.from('redemptions').insert([{
            ticket_id: ticketPayload.ticketId,
            validator_id: validatorId,
            redeemed_at: new Date().toISOString(),
            method: totpCode ? 'totp' : 'pin'
          }]);
        }
      }
    } catch (dbError) {
      onlineValidation = { success: false, error: 'Database unavailable: ' + dbError.message };
    }

    // STEP 4: RETURN RESULT
    const result = {
      success: true,
      offlineValid: true,
      onlineValid: onlineValidation.success,
      ticketDetails: {
        ticketId: ticketPayload.ticketId,
        eventName: ticketPayload.eventName,
        buyerName: ticketPayload.buyerName,
        seatInfo: ticketPayload.seatInfo,
        category: ticketPayload.category,
        validFrom: ticketPayload.validFrom,
        validTo: ticketPayload.validTo
      },
      validation: {
        cryptoValid: true,
        codeValid: true,
        onlineSync: onlineValidation.success,
        onlineError: onlineValidation.error
      }
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Validation error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        success: false, 
        error: 'Validation failed: ' + error.message 
      }) 
    };
  }
};