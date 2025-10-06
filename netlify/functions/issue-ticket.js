// This function now requires 'busboy' to handle file uploads.
// Add it to your package.json: "busboy": "^1.6.0"
import busboy from 'busboy';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper to parse multipart form data
const parseMultipartForm = (event) => {
    return new Promise((resolve) => {
        const bb = busboy({ headers: event.headers });
        const fields = {};
        let uploadedFile = null;

        bb.on('file', (fieldname, file, { filename, mimeType }) => {
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                uploadedFile = {
                    content: Buffer.concat(chunks),
                    filename,
                    mimeType
                };
            });
        });

        bb.on('field', (fieldname, val) => { fields[fieldname] = val; });
        bb.on('close', () => resolve({ fields, file: uploadedFile }));
        bb.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
        bb.end();
    });
};


export const handler = async (event) => {
  try {
    const { fields, file } = await parseMultipartForm(event);
    const { eventName, buyerName, buyerEmail, seatInfo } = fields;
    
    let imageUrl = null;
    if (file) {
        const filePath = `event-images/${Date.now()}-${file.filename}`;
        const { error: uploadError } = await supabase.storage.from('ticket-assets').upload(filePath, file.content, { contentType: file.mimeType });
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from('ticket-assets').getPublicUrl(filePath);
        imageUrl = publicUrl;
    }

    const ticketId = `TKT-${Date.now()}`;
    const totpSecret = authenticator.generateSecret();
    const backupPinHash = await bcrypt.hash(Math.floor(1000 + Math.random() * 9000).toString(), 10);

    const ticketPayload = { ticketId, eventName, buyerName, buyerEmail, seatInfo, totpSecret, backupPinHash, imageUrl };
    const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    const ticketJWT = jwt.sign(ticketPayload, privateKey, { algorithm: 'ES256', expiresIn: '1y' });

    await supabase.from('tickets').insert([{ ticket_id: ticketId, event_name: eventName, buyer_name: buyerName, buyer_email: buyerEmail, image_url: imageUrl }]);

    return { statusCode: 200, body: JSON.stringify({ success: true, ticketJWT }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};