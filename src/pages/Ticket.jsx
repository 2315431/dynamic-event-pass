import React, { useState, useEffect } from 'react';
import { authenticator } from 'otplib';
import { jwtDecode } from 'jwt-decode';
import QRCode from 'qrcode.react';

// (Static styles remain the same)
const staticStyles = {
  container: { maxWidth: '400px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' },
  qrContainer: { backgroundColor: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px' },
  header: { fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' },
  subheader: { fontSize: '16px', opacity: 0.9, marginBottom: '30px' },
  timer: { fontSize: '14px', opacity: 0.8 },
  message: { textAlign: 'center', padding: '40px', backgroundColor: '#334155', color: 'white', borderRadius: '20px' }
};

function Ticket() {
  const [ticketData, setTicketData] = useState(null);
  const [dynamicQrValue, setDynamicQrValue] = useState('');
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
      const payload = jwtDecode(jwtFromUrl);
      setTicketData(payload);
      
      const updateCode = () => {
        const code = authenticator.generate(payload.totpSecret);
        const remaining = authenticator.timeRemaining();
        setDynamicQrValue(`${jwtFromUrl}|${code}`);
        setTimeRemaining(remaining);
      };
      
      updateCode();
      const interval = setInterval(updateCode, 1000);
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
        
        <div style={staticStyles.qrContainer}>
            {/* THIS IS THE FIX: 'L' level has less error correction, making the blocks bigger and easier to scan. */}
            <QRCode value={dynamicQrValue} size={256} level="L" style={{ margin: '0 auto' }} />
        </div>
        
        <p style={{opacity: 0.8}}>This QR code updates automatically.</p>
        <div style={staticStyles.timer}>Refreshes in {timeRemaining}s</div>
      </div>
    </div>
  );
}

export default Ticket;