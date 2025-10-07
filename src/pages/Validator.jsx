import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as jose from 'jose';
import { authenticator } from 'otplib';

let cryptoPublicKey = null;

function Validator() {
    const [result, setResult] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [pendingSync, setPendingSync] = useState([]);
    const scannerRef = useRef(null);

    useEffect(() => {
        const prepareValidator = async () => {
            try {
                const response = await fetch('/.netlify/functions/get-public-key');
                const { publicKey: rawKey } = await response.json();
                cryptoPublicKey = await jose.importSPKI(rawKey, 'RS256', { extractable: true });
                setIsReady(true);
                
                // Load pending sync items
                const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
                setPendingSync(pending);
            } catch (e) {
                setResult({ success: false, error: 'Failed to initialize validator.' });
            }
        };
        prepareValidator();
    }, []);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            syncPendingRedemptions();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const syncPendingRedemptions = async () => {
        const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
        if (pending.length === 0) return;

        for (const ticketId of pending) {
            try {
                const response = await fetch('/.netlify/functions/sync-redemption', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        ticketId, 
                        validatorId: 'validator-1',
                        method: 'offline-sync'
                    })
                });

                if (response.ok) {
                    // Remove from pending list
                    const updatedPending = pending.filter(id => id !== ticketId);
                    localStorage.setItem('pendingSync', JSON.stringify(updatedPending));
                    setPendingSync(updatedPending);
                }
            } catch (error) {
                console.error('Failed to sync ticket:', ticketId, error);
            }
        }
    };

    const validateTicket = async (ticketJWT, totpCode) => {
        try {
            setResult(null);
            
            // STEP 1: OFFLINE CRYPTOGRAPHIC VALIDATION
            const { payload } = await jose.jwtVerify(ticketJWT, cryptoPublicKey, {
                issuer: 'dep-platform',
                audience: 'dep-validator'
            });

            // Check ticket validity period
            const now = new Date();
            const validFrom = new Date(payload.validFrom);
            const validTo = new Date(payload.validTo);

            if (now < validFrom) {
                throw new Error('Ticket not yet valid');
            }

            if (now > validTo) {
                throw new Error('Ticket has expired');
            }

            // STEP 2: TOTP VALIDATION
            const isCodeValid = authenticator.verify({ 
                token: totpCode, 
                secret: payload.totpSecret,
                step: 30,
                window: 1
            });

            if (!isCodeValid) {
                throw new Error('Invalid rotating code');
            }

            // STEP 3: LOCAL DOUBLE-SCAN CHECK
            const redeemedList = JSON.parse(localStorage.getItem('redeemedTickets') || '[]');
            if (redeemedList.includes(payload.ticketId)) {
                throw new Error('This ticket has already been scanned on this device');
            }

            // Add to local redeemed list
            redeemedList.push(payload.ticketId);
            localStorage.setItem('redeemedTickets', JSON.stringify(redeemedList));

            // STEP 4: ONLINE SYNC (if possible)
            let onlineSync = { success: false, error: 'Offline mode' };

            if (navigator.onLine) {
                try {
                    const response = await fetch('/.netlify/functions/validate-ticket', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            ticketJWT, 
                            totpCode,
                            validatorId: 'validator-1'
                        })
                    });

                    const data = await response.json();
                    onlineSync = { success: data.success, error: data.error };
                } catch (error) {
                    // Add to pending sync
                    const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
                    if (!pending.includes(payload.ticketId)) {
                        pending.push(payload.ticketId);
                        localStorage.setItem('pendingSync', JSON.stringify(pending));
                        setPendingSync(pending);
                    }
                    onlineSync = { success: false, error: 'Will sync when online' };
                }
            } else {
                // Add to pending sync for later
                const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
                if (!pending.includes(payload.ticketId)) {
                    pending.push(payload.ticketId);
                    localStorage.setItem('pendingSync', JSON.stringify(pending));
                    setPendingSync(pending);
                }
            }

            setResult({ 
                success: true, 
                isOffline: !navigator.onLine,
                onlineSync: onlineSync.success,
                ticketDetails: {
                    ticketId: payload.ticketId,
                    eventName: payload.eventName,
                    buyerName: payload.buyerName,
                    seatInfo: payload.seatInfo,
                    category: payload.category
                },
                validation: {
                    cryptoValid: true,
                    codeValid: true,
                    onlineSync: onlineSync.success,
                    onlineError: onlineSync.error
                }
            });

        } catch (err) {
            setResult({ success: false, error: err.message });
        }
    };

    const handleScanSuccess = (decodedText) => {
        try {
            const [ticketJWT, totpCode] = decodedText.split('|');
            if (!ticketJWT || !totpCode) {
                throw new Error('Invalid QR code format');
            }
            validateTicket(ticketJWT, totpCode);
        } catch (error) {
            setResult({ success: false, error: 'Invalid QR code format' });
        }
    };

    const handleManualSubmit = () => {
        if (!manualCode.trim()) return;
        
        try {
            const [ticketJWT, totpCode] = manualCode.split('|');
            if (!ticketJWT || !totpCode) {
                throw new Error('Invalid format. Use: JWT|TOTP_CODE');
            }
            validateTicket(ticketJWT, totpCode);
        } catch (error) {
            setResult({ success: false, error: 'Invalid format. Use: JWT|TOTP_CODE' });
        }
    };

    const startScanner = () => {
        if (scannerRef.current) return;
        
        setIsScanning(true);
        scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            false
        );
        
        scannerRef.current.render(handleScanSuccess, (error) => {
            // Ignore scanning errors
        });
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    if (!isReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Initializing validator...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            {/* Header */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-800">Ticket Validator</h1>
                        <div className="flex items-center space-x-4">
                            {isOffline && (
                                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                    📱 Offline Mode
                                </span>
                            )}
                            {pendingSync.length > 0 && (
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    🔄 {pendingSync.length} pending sync
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Scanner Controls */}
                    <div className="flex space-x-4 mb-6">
                        {!isScanning ? (
                            <button
                                onClick={startScanner}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                📷 Start Scanner
                            </button>
                        ) : (
                            <button
                                onClick={stopScanner}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                ⏹️ Stop Scanner
                            </button>
                        )}
                        
                        <button
                            onClick={syncPendingRedemptions}
                            disabled={!navigator.onLine || pendingSync.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            🔄 Sync Pending ({pendingSync.length})
                        </button>
                    </div>

                    {/* Scanner */}
                    {isScanning && (
                        <div className="mb-6">
                            <div id="qr-reader" className="border-2 border-dashed border-gray-300 rounded-lg p-4"></div>
                        </div>
                    )}

                    {/* Manual Entry */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Manual Entry (JWT|TOTP_CODE)
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Paste JWT|TOTP_CODE here"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleManualSubmit}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Validate
                            </button>
                        </div>
                    </div>

                    {/* Result Display */}
                    {result && (
                        <div className={`p-4 rounded-lg ${
                            result.success 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            {result.success ? (
                                <div>
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-2">✅</span>
                                        <h3 className="text-lg font-bold text-green-800">Ticket Valid</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Event</p>
                                            <p className="font-semibold">{result.ticketDetails.eventName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Guest</p>
                                            <p className="font-semibold">{result.ticketDetails.buyerName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Seat</p>
                                            <p className="font-semibold">{result.ticketDetails.seatInfo}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Category</p>
                                            <p className="font-semibold">{result.ticketDetails.category}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <span className="text-green-600 mr-2">✓</span>
                                            <span className="text-sm">Cryptographic validation passed</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-green-600 mr-2">✓</span>
                                            <span className="text-sm">TOTP code valid</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className={`${result.validation.onlineSync ? "text-green-600" : "text-yellow-600"} mr-2`}>
                                                {result.validation.onlineSync ? "✓" : "⚠"}
                                            </span>
                                            <span className="text-sm">
                                                {result.validation.onlineSync 
                                                    ? "Online sync successful" 
                                                    : `Offline mode: ${result.validation.onlineError}`
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <span className="text-2xl mr-2">❌</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-red-800">Validation Failed</h3>
                                        <p className="text-red-600">{result.error}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">How to use the validator:</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">QR Code Scanning:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Click "Start Scanner" to activate camera</li>
                                <li>• Point camera at the QR code on the ticket</li>
                                <li>• The system will automatically validate</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Manual Entry:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Copy the JWT|TOTP_CODE from the ticket</li>
                                <li>• Paste into the manual entry field</li>
                                <li>• Click "Validate" to check the ticket</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Validator;