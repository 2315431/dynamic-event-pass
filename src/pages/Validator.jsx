import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Styles for the modern validator UI
const styles = {
    container: { maxWidth: '500px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' },
    card: { backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', color: 'white' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#cbd5e1', textAlign: 'center', marginBottom: '20px' },
    input: { width: '100%', boxSizing: 'border-box', backgroundColor: '#334155', border: '1px solid #475569', color: 'white', padding: '12px', borderRadius: '10px', marginBottom: '15px' },
    button: { width: '100%', backgroundColor: '#16a34a', color: 'white', fontWeight: 'bold', padding: '15px', borderRadius: '10px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
    scanButton: { width: '100%', backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', padding: '15px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginBottom: '20px', transition: 'background-color 0.2s' },
    scannerContainer: { border: '2px solid #4f46e5', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', padding: '10px', background: '#334155' },
    result: { marginTop: '20px', padding: '20px', borderRadius: '10px' },
    success: { backgroundColor: '#14532d', color: '#a7f3d0' },
    error: { backgroundColor: '#7f1d1d', color: '#fca5a5' },
};

function Validator() {
  const [ticketJWT, setTicketJWT] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null); // This holds the scanner instance

  useEffect(() => {
    if (isScanning) {
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      const onScanSuccess = (decodedText) => {
        setTicketJWT(decodedText);
        setIsScanning(false); // Stop scanning on success
      };

      const onScanError = (error) => {
        // This is called continuously, so we don't log it to avoid spam.
      };

      // Ensure the element exists before trying to render the scanner
      const scannerElement = document.getElementById('qr-reader');
      if (scannerElement) {
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner('qr-reader', config, false);
            scanner.render(onScanSuccess, onScanError);
            scannerRef.current = scanner;
        }
      }
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner.", error);
        });
        scannerRef.current = null;
      }
    }
  }, [isScanning]);

  const handleValidate = async () => {
    setResult(null);
    try {
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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Ticket Validator</h1>
        
        <button onClick={() => setIsScanning(!isScanning)} style={styles.scanButton}>
          {isScanning ? '📷 Stop Scanning' : '📷 Scan QR Code'}
        </button>
        
        {isScanning && <div id="qr-reader" style={styles.scannerContainer}></div>}

        <textarea
          style={{ ...styles.input, minHeight: '80px', fontFamily: 'monospace' }}
          value={ticketJWT}
          onChange={(e) => setTicketJWT(e.target.value)}
          placeholder="Ticket JWT appears here after scan"
        />
        <input
          style={styles.input}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit rotating code"
          maxLength="6"
        />
        <button onClick={handleValidate} style={styles.button}>
          ✓ Validate Ticket
        </button>

        {result && (
          <div style={{ ...styles.result, ...(result.success ? styles.success : styles.error) }}>
            <strong>{result.success ? '✅ Access Granted' : '❌ Entry Denied'}</strong>
            <p>{result.message || result.error || result.details}</p>
            {result.success && <p>Guest: {result.ticketDetails?.buyerName}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default Validator;