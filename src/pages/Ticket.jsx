import React, { useState, useEffect } from 'react'
import { authenticator } from 'otplib'

function Ticket() {
  const [ticketData, setTicketData] = useState(null);
  const [currentCode, setCurrentCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get ticket from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const ticketJWT = urlParams.get('tk');
    
    if (!ticketJWT) {
      setError('No ticket found in URL');
      return;
    }

    try {
      // Decode JWT payload (client-side, no verification)
      const payload = JSON.parse(atob(ticketJWT.split('.')[1]));
      setTicketData(payload);
      
      // Generate initial TOTP code
      generateCode(payload.totpSecret);
      
      // Update code every second
      const interval = setInterval(() => {
        generateCode(payload.totpSecret);
      }, 1000);
      
      return () => clearInterval(interval);
    } catch (err) {
      setError('Invalid ticket format');
    }
  }, []);

  const generateCode = (secret) => {
    try {
      const code = authenticator.generate(secret);
      setCurrentCode(code);
      
      // Calculate time remaining
      const now = Math.floor(Date.now() / 1000);
      const timeStep = 30;
      const timeRemaining = timeStep - (now % timeStep);
      setTimeRemaining(timeRemaining);
    } catch (err) {
      console.error('Error generating code:', err);
    }
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>❌ {error}</div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading ticket...</div>
      </div>
    );
  }

  const styles = {
    container: {
      maxWidth: '400px',
      margin: '20px auto',
      fontFamily: 'system-ui, sans-serif'
    },
    ticket: {
      background: `linear-gradient(135deg, ${ticketData.brandingData?.backgroundColor || '#1e40af'}, #3b82f6)`,
      color: ticketData.brandingData?.primaryColor || 'white',
      borderRadius: '20px',
      padding: '30px',
      textAlign: 'center',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      position: 'relative',
      overflow: 'hidden'
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
    error: {
      textAlign: 'center',
      color: 'red',
      padding: '20px'
    },
    loading: {
      textAlign: 'center',
      padding: '20px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.ticket}>
        <div style={styles.header}>{ticketData.eventName}</div>
        <div style={styles.subheader}>{ticketData.buyerName}</div>
        
        <div style={styles.codeSection}>
          <div style={styles.code}>{currentCode}</div>
          <div style={styles.timer}>
            Refreshes in {timeRemaining}s
          </div>
        </div>
        
        <div style={styles.details}>
          <div style={styles.detailRow}>
            <span>Ticket ID:</span>
            <span>{ticketData.ticketId}</span>
          </div>
          <div style={styles.detailRow}>
            <span>Category:</span>
            <span>{ticketData.category}</span>
          </div>
          <div style={styles.detailRow}>
            <span>Seat:</span>
            <span>{ticketData.seatInfo}</span>
          </div>
          <div style={styles.detailRow}>
            <span>Valid Until:</span>
            <span>{new Date(ticketData.validTo).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div style={styles.backup}>
          <strong>Works Offline!</strong><br/>
          This code updates automatically without internet.<br/>
          If phone battery dies, show backup PIN to staff.
        </div>
      </div>
    </div>
  );
}

export default Ticket;
