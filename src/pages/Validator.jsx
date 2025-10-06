import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const styles = {
    container: { maxWidth: '500px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' },
    card: { backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', color: 'white' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#cbd5e1', textAlign: 'center', marginBottom: '20px' },
    scanButton: { width: '100%', backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', padding: '15px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginBottom: '20px' },
    scanner: { border: '2px solid #4f46e5', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', padding: '10px' },
    result: { marginTop: '20px', padding: '20px', borderRadius: '10px', textAlign: 'center' },
    success: { backgroundColor: '#14532d', color: '#a7f3d0' },
    error: { backgroundColor: '#7f1d1d', color: '#fca5a5' },
};

function Validator() {
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  const validateTicket = async (decodedText) => {
    setIsScanning(false); // Stop scanning immediately
    setResult({ validating: true }); // Show a validating message
    try {
      // Split the scanned data into the JWT and the code
      const [ticketJWT, code] = decodedText.split('|');

      if (!ticketJWT || !code) {
        setResult({ success: false, error: 'Invalid QR code format.' });
        return;
      }

      const response = await fetch('/.netlify/functions/validate-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketJWT, code }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: 'Network error.' });
    }
  };

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 5, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(validateTicket); // The validateTicket function is now the success callback
      scannerRef.current = scanner;
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner.", error));
        scannerRef.current = null;
      }
    }
    return () => {
      if (scannerRef.current) scannerRef.current.clear();
    };
  }, [isScanning]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Instant Ticket Validator</h1>
        
        <button onClick={() => { setResult(null); setIsScanning(!isScanning); }} style={styles.scanButton}>
          {isScanning ? '📷 Stop Scanning' : '📷 Start Scanning'}
        </button>
        
        {isScanning && <div id="qr-reader" style={styles.scanner}></div>}

        {result && (
          <div style={{ ...styles.result, ...(result.success ? styles.success : result.validating ? {} : styles.error) }}>
            {result.validating ? (
              <strong>Validating...</strong>
            ) : (
              <>
                <strong>{result.success ? '✅ Access Granted' : '❌ Entry Denied'}</strong>
                <p>{result.message || result.error || result.details}</p>
                {result.success && <p>Guest: {result.ticketDetails?.buyerName}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Validator;