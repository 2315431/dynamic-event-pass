import { PDFDocument, rgb } from 'pdf-lib';
import jwt from 'jsonwebtoken';

export const handler = async (event) => {
    try {
        const { tk } = event.queryStringParameters;
        const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
        const decoded = jwt.verify(tk, publicKey, { algorithms: ['RS256'] });

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();

        // Draw text
        page.drawText(`Event: ${decoded.eventName}`, { x: 50, y: 700, size: 24 });
        page.drawText(`Guest: ${decoded.buyerName}`, { x: 50, y: 650, size: 18 });

        // If there's an image, fetch and embed it
        if (decoded.imageUrl) {
            const imageBytes = await fetch(decoded.imageUrl).then(res => res.arrayBuffer());
            const pdfImage = await pdfDoc.embedPng(imageBytes); // or embedJpg
            page.drawImage(pdfImage, { x: 50, y: 400, width: 200 });
        }
        
        const pdfBytes = await pdfDoc.save();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="ticket.pdf"' },
            body: Buffer.from(pdfBytes).toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};