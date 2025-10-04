import React, { useState } from 'react'

function Validator() {
  const [ticketJWT, setTicketJWT] = useState('');
  const [code, setCode] = useState('');
  const [codeType, setCodeType] = useState('totp');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState(null);

  const validateTicket = async () => {
    if (!ticketJWT.trim() || !code.trim()) {
      setResult({ success: false, error: 'Please enter both ticket and code' });
      return;
    }

    setIsValidating(true);
    
    try {
      const response = await fetch('/.netlify/functions/validate-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketJWT: ticketJWT.trim(),
          code: code.trim(),
          codeType,
          validatorDevice: 'Web Validator Demo'
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        // Clear form on success
        setTicketJWT('');
        setCode('');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setResult({ success: false, error: 'Network error' });
    } finally {
      setIsValidating(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '20px auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    },
    header: {
      textAlign: 'center',
      color: '#1e40af',
      marginBottom: '30px'
    },
    scanner: {
      backgroundColor: '#f8fafc',
      padding: '30px',
      borderRadius: '12px',
      marginBottom: '20px'
    },
    input: {
      width: '100%',
      padding: '12px',
      marginBottom: '15px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '16px'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      marginBottom: '15px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'monospace',
      minHeight: '100px',
      resize: 'vertical'
    },
    radio: {
      marginBottom: '20px'
    },
    radioOption: {
      display: 'inline-block',
      marginRight: '20px'
    },
    button: {
      width: '100%',
      padding: '15px',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      cursor: 'pointer',
      fontWeight: 'bold'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    result: {
      padding: '20px',
      borderRadius: '8px',
      marginTop: '20px'
    },
    success: {
      backgroundColor: '#ecfdf5',
      border: '1px solid #10b981',
      color: '#065f46'
    },
    error: {
      backgroundColor: '#fef2f2',
      border: '1px solid #ef4444',
      color: '#991b1b'
    },
    ticketInfo: {
      backgroundColor: '#f8fafc',
      padding: '15px',
      borderRadius: '8px',
      marginTop: '15px'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🔍 Ticket Validator</h1>
      
      <div style={styles.scanner}>
        <h2>Scan or Enter Ticket</h2>
        
        <textarea
          style={styles.textarea}
          placeholder="Paste ticket JWT here..."
          value={ticketJWT}
          onChange={(e) => setTicketJWT(e.target.value)}
        />
        
        <input
          style={styles.input}
          type="text"
          placeholder="Enter 6-digit code or backup PIN"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />
        
        <div style={styles.radio}>
          <label style={styles.radioOption}>
            <input
              type="radio"
              value="totp"
              checked={codeType === 'totp'}
              onChange={(e) => setCodeType(e.target.value)}
            />
            TOTP Code (6 digits)
          </label>
          <label style={styles.radioOption}>
            <input
              type="radio"
              value="pin"
              checked={codeType === 'pin'}
              onChange={(e) => setCodeType(e.target.value)}
            />
            Backup PIN (4 digits)
          </label>
        </div>
        
        <button
          style={{
            ...styles.button,
            ...(isValidating ? styles.buttonDisabled : {})
          }}
          onClick={validateTicket}
          disabled={isValidating}
        >
          {isValidating ? 'Validating...' : '✓ Validate Ticket'}
        </button>
      </div>

      {result && (
        <div style={{
          ...styles.result,
          ...(result.success ? styles.success : styles.error)
        }}>
          {result.success ? (
            <>
              <h3>✅ Entry Approved</h3>
              <div style={styles.ticketInfo}>
                <p><strong>Ticket ID:</strong> {result.ticketData.ticketId}</p>
                <p><strong>Event:</strong> {result.ticketData.eventName}</p>
                <p><strong>Guest:</strong> {result.ticketData.buyerName}</p>
                <p><strong>Category:</strong> {result.ticketData.category}</p>
                <p><strong>Seat:</strong> {result.ticketData.seatInfo}</p>
                <p><strong>Verified At:</strong> {new Date(result.redeemedAt).toLocaleString()}</p>
              </div>
            </>
          ) : (
            <>
              <h3>❌ Entry Denied</h3>
              <p>{result.error}</p>
              {result.details && <p><small>{result.details}</small></p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Validator;
