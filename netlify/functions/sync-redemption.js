import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { ticketId, validatorId = 'default', method = 'offline' } = JSON.parse(event.body);

    if (!ticketId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing ticketId.' }) };
    }

    // Check if ticket exists and is not already redeemed
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('is_redeemed, buyer_name, event_name')
      .eq('ticket_id', ticketId)
      .single();

    if (fetchError) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket not found in database.' 
        }) 
      };
    }

    if (ticket.is_redeemed) {
      return { 
        statusCode: 409, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket already redeemed in database.' 
        }) 
      };
    }

    // Mark as redeemed
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        is_redeemed: true, 
        redeemed_at: new Date().toISOString(),
        redeemed_by: validatorId
      })
      .eq('ticket_id', ticketId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Log redemption
    await supabase.from('redemptions').insert([{
      ticket_id: ticketId,
      validator_id: validatorId,
      redeemed_at: new Date().toISOString(),
      method: method
    }]);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Offline redemption synced successfully.',
        guestName: ticket.buyer_name
      })
    };

  } catch (error) {
    console.error('Sync redemption error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        success: false, 
        error: 'Sync failed: ' + error.message 
      }) 
    };
  }
};