import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';

// (Styles remain the same)
const styles = {
    container: { maxWidth: '500px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' },
    card: { backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', color: 'white' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#cbd5e1', textAlign: 'center', marginBottom: '20px' },
    scanButton: { width: '100%', backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', padding: '15px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginBottom: '20px' },
    scanner: { border: '2px solid #4f46e5', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', padding: '10px' },
    result: { marginTop: '20px', padding: '20px', borderRadius: '10px', textAlign: 'center' },
    success: { backgroundColor: '#14532d', color: '#a7f3d0' },
    error: { backgroundColor: '#7f1d1d', color: '#fca5a5' },
    warning: { backgroundColor: '#854d0e', color: '#fde68a'}
};

// This variable will hold the public key fetched from the server
let publicKey = null;

function Validator() {
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Fetch the public key when the component loads
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const response = await fetch('/.netlify/functions/get-public-key');
        const data = await response.json();
        publicKey = data.publicKey.replace(/\\n/g, '\n');
        setIsReady(true);
      } catch (e) {
        setResult({ success: false, error: 'Could not load validator config. Check connection.'});
      }
    };
    fetchPublicKey();
  }, []);

  const validateTicket = async (decodedText) => {
    setIsScanning(false);
    setResult({ validating: true });

    try {
      const [ticketJWT, code] = decodedText.split('|');
      if (!ticketJWT || !code) throw new Error('Invalid QR code format.');

      // STEP 1: OFFLINE AUTHENTICITY CHECK
      const decodedToken = jwt.verify(ticketJWT, publicKey, { algorithms: ['ES256'] });
      const isCodeValid = authenticator.verify({ token: code, secret: decodedToken.totpSecret });
      if (!isCodeValid) throw new Error('Invalid rotating code.');

      // If offline check passes, show an initial success message
      setResult({ success: true, message: 'Ticket is authentic. Now checking database...', ticketDetails: decodedToken });

      // STEP 2: ONLINE DATABASE CHECK
      const isOnline = navigator.onLine;
      if (!isOnline) {
        // Handle offline success: let them in but show a warning
        setResult({ isWarning: true, message: 'OFFLINE SCAN: Ticket is authentic. Please sync with server later.', ticketDetails: decodedToken });
        // In a real app, you would save this ticketId to local storage to sync later.
        return;
      }
      
      const response = await fetch('/.netlify/functions/validate-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: decodedToken.ticketId }),
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      setResult({ success: true, message: 'Access Granted. Ticket redeemed in database.', ticketDetails: decodedToken });

    } catch (err) {
      setResult({ success: false, error: err.message });
    }
  };

  useEffect(() => {
    if (isScanning && isReady) {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 5, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(validateTicket);
      scannerRef.current = scanner;
    } else if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    return () => { if (scannerRef.current) scannerRef.current.clear(); };
  }, [isScanning, isReady]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Hybrid Validator</h1>
        
        <button onClick={() => { setResult(null); setIsScanning(!isScanning); }} style={styles.scanButton} disabled={!isReady}>
          {!isReady ? 'Loading Config...' : (isScanning ? '📷 Stop Scanning' : '📷 Start Scanning')}
        </button>
        
        {isScanning && <div id="qr-reader" style={styles.scanner}></div>}

        {result && (
          <div style={{ ...styles.result, ...(result.success ? styles.success : result.isWarning ? styles.warning : styles.error) }}>
            {result.validating ? <strong>Validating...</strong> : (
              <>
                <strong>{result.success ? '✅ Access Granted' : result.isWarning ? '⚠️ OFFLINE SCAN' : '❌ Entry Denied'}</strong>
                <p>{result.message || result.error}</p>
                {result.ticketDetails && <p>Guest: {result.ticketDetails.buyerName}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Validator;