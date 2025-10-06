import React, { useState, useEffect } from 'react';
import { authenticator } from 'otplib';
import { jwtDecode } from 'jwt-decode';
import QRCode from 'qrcode.react'; // <-- Import the QR code generator

// (Static styles remain the same)
const staticStyles = {
  container: { maxWidth: '400px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' },
  qrContainer: { backgroundColor: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px' },
  header: { fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' },
  subheader: { fontSize: '16px', opacity: 0.9, marginBottom: '30px' },
  codeSection: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '15px', padding: '25px', marginBottom: '25px' },
  code: { fontSize: '48px', fontWeight: 'bold', letterSpacing: '8px', marginBottom: '10px', fontFamily: 'monospace' },
  timer: { fontSize: '14px', opacity: 0.8 },
  details: { textAlign: 'left', fontSize: '14px', lineHeight: '1.6' },
  detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '5px' },
  message: { textAlign: 'center', padding: '40px', backgroundColor: '#334155', color: 'white', borderRadius: '20px' }
};

function Ticket() {
  const [ticketData, setTicketData] = useState(null);
  const [ticketJWT, setTicketJWT] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jwtFromUrl = urlParams.get('tk');
    if (!jwtFromUrl) {
      setError('No ticket found in URL.');
      return;
    }
    try {
      setTicketJWT(jwtFromUrl); // <-- Store the raw JWT for the QR code
      const payload = jwtDecode(jwtFromUrl);
      setTicketData(payload);
      const generateCode = (secret) => {
        const code = authenticator.generate(secret);
        const remaining = authenticator.timeRemaining();
        setCurrentCode(code);
        setTimeRemaining(remaining);
      };
      generateCode(payload.totpSecret);
      const interval = setInterval(() => generateCode(payload.totpSecret), 1000);
      return () => clearInterval(interval);
    } catch (err) {
      setError('Invalid ticket format.');
    }
  }, []);

  if (error) return <div style={staticStyles.container}><div style={staticStyles.message}>❌ {error}</div></div>;
  if (!ticketData) return <div style={staticStyles.container}><div style={staticStyles.message}>Loading ticket...</div></div>;

  const dynamicTicketStyle = {
    background: `linear-gradient(135deg, ${ticketData.brandingData?.backgroundColor || '#1e40af'}, #3b82f6)`,
    color: ticketData.brandingData?.primaryColor || 'white',
    borderRadius: '20px', padding: '30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  };

  return (
    <div style={staticStyles.container}>
      <div style={dynamicTicketStyle}>
        <div style={staticStyles.header}>{ticketData.eventName}</div>
        <div style={staticStyles.subheader}>{ticketData.buyerName}</div>
        
        {/* THIS IS THE NEW QR CODE SECTION */}
        <div style={staticStyles.qrContainer}>
            <QRCode value={ticketJWT} size={256} style={{ margin: '0 auto' }} />
        </div>
        
        <div style={staticStyles.codeSection}>
          <div style={staticStyles.code}>{currentCode}</div>
          <div style={staticStyles.timer}>Refreshes in {timeRemaining}s</div>
        </div>
        
        <div style={staticStyles.details}>
          <div style={staticStyles.detailRow}><span>Ticket ID:</span><span>{ticketData.ticketId}</span></div>
          <div style={staticStyles.detailRow}><span>Seat:</span><span>{ticketData.seatInfo}</span></div>
        </div>
      </div>
    </div>
  );
}

export default Ticket;