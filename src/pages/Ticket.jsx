import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import QRCode from 'qrcode.react';
import { authenticator } from 'otplib';

function Ticket() {
    const [ticketData, setTicketData] = useState(null);
    const [ticketJWT, setTicketJWT] = useState('');
    const [currentCode, setCurrentCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const jwtFromUrl = new URLSearchParams(window.location.search).get('tk');
        if (!jwtFromUrl) {
            setTicketData({ error: 'No ticket token found in URL' });
            return;
        }
        
        try {
            setTicketJWT(jwtFromUrl);
            const payload = jwtDecode(jwtFromUrl);
            setTicketData(payload);
        } catch (error) {
            setTicketData({ error: 'Invalid ticket token' });
        }
    }, []);

    // Generate TOTP code and update countdown
    useEffect(() => {
        if (!ticketData?.totpSecret) return;

        const updateCode = () => {
            const code = authenticator.generate(ticketData.totpSecret);
            setCurrentCode(code);
            
            // Calculate time left in current window
            const epoch = Math.round(new Date().getTime() / 1000.0);
            const timeStep = 30; // 30 seconds
            const timeLeft = timeStep - (epoch % timeStep);
            setTimeLeft(timeLeft);
        };

        updateCode();
        const interval = setInterval(updateCode, 1000);

        return () => clearInterval(interval);
    }, [ticketData?.totpSecret]);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleDownloadPdf = () => {
        window.open(`/.netlify/functions/generate-pdf?tk=${ticketJWT}`, '_blank');
    };

    if (ticketData?.error) {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-red-800 mb-4">Invalid Ticket</h1>
                    <p className="text-red-600">{ticketData.error}</p>
                </div>
            </div>
        );
    }

    if (!ticketData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading ticket...</p>
                </div>
            </div>
        );
    }

    const qrData = `${ticketJWT}|${currentCode}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
            {/* Offline indicator */}
            {isOffline && (
                <div className="fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    📱 Offline Mode
                </div>
            )}

            <div className="max-w-md mx-auto">
                {/* Ticket Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
                        <h1 className="text-2xl font-bold mb-2">{ticketData.eventName}</h1>
                        <p className="text-blue-100">Digital Event Pass</p>
                    </div>

                    {/* Guest Info */}
                    <div className="p-6">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <span className="text-white text-2xl font-bold">
                                    {ticketData.buyerName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">{ticketData.buyerName}</h2>
                            <p className="text-gray-600">{ticketData.buyerEmail}</p>
                        </div>

                        {/* Seat Info */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Seat</span>
                                <span className="font-bold text-gray-800">{ticketData.seatInfo}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-gray-600">Category</span>
                                <span className="font-bold text-gray-800">{ticketData.category}</span>
                            </div>
                        </div>

                        {/* TOTP Code */}
                        <div className="text-center mb-6">
                            <p className="text-sm text-gray-600 mb-2">Your rotating access code</p>
                            <div className="bg-black text-green-400 font-mono text-3xl font-bold p-4 rounded-lg mb-2 tracking-wider">
                                {currentCode}
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm text-gray-600">
                                    Updates in {timeLeft}s
                                </span>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="text-center mb-6">
                            <p className="text-sm text-gray-600 mb-3">Scan at entry</p>
                            <div className="bg-white p-4 rounded-lg inline-block">
                                <QRCode 
                                    value={qrData} 
                                    size={200}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>
                        </div>

                        {/* Validity Period */}
                        <div className="text-center text-sm text-gray-500 mb-6">
                            <p>Valid from: {new Date(ticketData.validFrom).toLocaleDateString()}</p>
                            <p>Valid until: {new Date(ticketData.validTo).toLocaleDateString()}</p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={handleDownloadPdf}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                📄 Download PDF
                            </button>
                            
                            <div className="text-center">
                                <button
                                    onClick={() => window.location.href = '/validator'}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    🔍 Open Validator
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-white rounded-lg p-4 shadow-lg">
                    <h3 className="font-bold text-gray-800 mb-2">How to use this ticket:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Show the QR code to the validator at entry</li>
                        <li>• The rotating code above changes every 30 seconds</li>
                        <li>• Keep this page open for the best experience</li>
                        <li>• Works offline - no internet required</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Ticket;