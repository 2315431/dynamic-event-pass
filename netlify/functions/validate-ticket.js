import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { ticketId } = JSON.parse(event.body);

    if (!ticketId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing ticketId.' }) };
    }

    // 1. Check if the ticket exists and is already redeemed
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('is_redeemed, buyer_name')
      .eq('ticket_id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Ticket not found.' }) };
    }

    if (ticket.is_redeemed) {
      return { statusCode: 409, body: JSON.stringify({ success: false, error: 'This ticket has already been redeemed.' }) };
    }

    // 2. If not redeemed, mark it as redeemed
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ is_redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('ticket_id', ticketId);

    if (updateError) {
      throw new Error(updateError.message);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Ticket successfully redeemed in database.', guestName: ticket.buyer_name }),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};