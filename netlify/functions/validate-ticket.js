import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  try {
    const { ticketJWT, code } = JSON.parse(event.body);
    if (!ticketJWT || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing ticket or code.' }) };
    }

    // THIS IS THE FIX: Re-fold the public key so the JWT library can read it.
    const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');

    const decoded = jwt.verify(ticketJWT, publicKey, {
      algorithms: ['ES256'],
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    const isTotpValid = authenticator.verify({ token: code, secret: decoded.totpSecret });
    if (!isTotpValid) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Invalid code.' }) };
    }

    // In a real app, you would now update your database to mark this ticket as redeemed.
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Ticket is valid and has been redeemed.',
        ticketDetails: decoded,
      }),
    };
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        error: 'Invalid ticket signature',
        details: error.message,
      }),
    };
  }
};