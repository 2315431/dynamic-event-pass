import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import QRCode from 'qrcode.react';

function Ticket() {
    const [ticketData, setTicketData] = useState(null);
    const [ticketJWT, setTicketJWT] = useState('');
    // ... other states

    useEffect(() => {
        const jwtFromUrl = new URLSearchParams(window.location.search).get('tk');
        if (!jwtFromUrl) {
            // handle error
            return;
        }
        setTicketJWT(jwtFromUrl);
        const payload = jwtDecode(jwtFromUrl);
        setTicketData(payload);
    }, []);

    const handleDownloadPdf = () => {
        // This opens the PDF generation endpoint in a new tab
        window.open(`/.netlify/functions/generate-pdf?tk=${ticketJWT}`, '_blank');
    };

    if (!ticketData) return <div>Loading...</div>;

    return (
        <div>
            {/* ... Ticket display and QR code ... */}
            <button onClick={handleDownloadPdf}>Download PDF Ticket</button>
        </div>
    );
}

export default Ticket;