import React, { useState, useEffect } from 'react';
import { authenticator } from 'otplib';

// These styles do NOT depend on ticket data, so they can live outside the component.
// This prevents the production build error.
const staticStyles = {
  container: {
    maxWidth: '400px',
    margin: '40px auto',
    fontFamily: 'system-ui, sans-serif',
    padding: '0 20px',
  },
  header: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  subheader: {
    fontSize: '16px',
    opacity: 0.9,
    marginBottom: '30px'
  },
  codeSection: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '25px'
  },
  code: {
    fontSize: '48px',
    fontWeight: 'bold',
    letterSpacing: '8px',
    marginBottom: '10px',
    fontFamily: 'monospace'
  },
  timer: {
    fontSize: '14px',
    opacity: 0.8
  },
  details: {
    textAlign: 'left',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '5px'
  },
  backup: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: '12px'
  },
  message: {
      textAlign: 'center',
      padding: '40px',
      backgroundColor: '#334155',
      color: 'white',
      borderRadius: '20px'
  }
};


function Ticket() {
  const [ticketData, setTicketData] = useState(null);
  const [currentCode, setCurrentCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketJWT = urlParams.get('tk');
    
    if (!ticketJWT) {
      setError('No ticket found in URL.');
      return;
    }

    try {
      // Decode the payload from the JWT
      const payload = JSON.parse(atob(ticketJWT.split('.')[1]));
      setTicketData(payload);
      
      // Function to generate the TOTP code
      const generateCode = (secret) => {
        const code = authenticator.generate(secret);
        const remaining = authenticator.timeRemaining();
        setCurrentCode(code);
        setTimeRemaining(remaining);
      };
      
      // Generate the first code immediately, then set an interval to update it.
      generateCode(payload.totpSecret);
      const interval = setInterval(() => generateCode(payload.totpSecret), 1000);
      
      // Clean up the interval when the component unmounts
      return () => clearInterval(interval);
    } catch (err) {
      setError('Invalid ticket format.');
    }
  }, []);

  // Show an error message if something went wrong
  if (error) {
    return (
      <div style={staticStyles.container}>
        <div style={staticStyles.message}>❌ {error}</div>
      </div>
    );
  }

  // Show a loading message until the ticket data is ready
  if (!ticketData) {
    return (
       <div style={staticStyles.container}>
        <div style={staticStyles.message}>Loading ticket...</div>
      </div>
    );
  }

  // These styles DEPEND on ticketData, so they are created here, only AFTER we know data exists.
  // This is the fix for the bug.
  const dynamicTicketStyle = {
    background: `linear-gradient(135deg, ${ticketData.brandingData?.backgroundColor || '#1e40af'}, #3b82f6)`,
    color: ticketData.brandingData?.primaryColor || 'white',
    borderRadius: '20px',
    padding: '30px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={staticStyles.container}>
      <div style={dynamicTicketStyle}>
        <div style={staticStyles.header}>{ticketData.eventName}</div>
        <div style={staticStyles.subheader}>{ticketData.buyerName}</div>
        
        <div style={staticStyles.codeSection}>
          <div style={staticStyles.code}>{currentCode}</div>
          <div style={staticStyles.timer}>
            Refreshes in {timeRemaining}s
          </div>
        </div>
        
        <div style={staticStyles.details}>
          <div style={staticStyles.detailRow}>
            <span>Ticket ID:</span>
            <span>{ticketData.ticketId}</span>
          </div>
          <div style={staticStyles.detailRow}>
            <span>Category:</span>
            <span>{ticketData.category}</span>
          </div>
          <div style={staticStyles.detailRow}>
            <span>Seat:</span>
            <span>{ticketData.seatInfo}</span>
          </div>
          <div style={staticStyles.detailRow}>
            <span>Valid Until:</span>
            <span>{new Date(ticketData.validTo).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div style={staticStyles.backup}>
          <strong>Works Offline!</strong><br/>
          This code updates automatically without internet.
        </div>
      </div>
    </div>
  );
}

export default Ticket;