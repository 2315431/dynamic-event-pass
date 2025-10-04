import React, { useState } from 'react';

export default function Home() {
    const [formData, setFormData] = useState({
        eventId: 'TECH_CONF_2025',
        eventName: 'Future of Web Summit',
        buyerName: 'Jane Doe',
        buyerEmail: 'jane@example.com',
        seatInfo: 'General Admission',
        category: 'All Access'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/.netlify/functions/issue-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                // Try to get a more specific error message from the server
                const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
                throw new Error(errorData.error || `Server responded with status: ${response.status}`);
            }

            const data = await response.json();
            setResult(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-center mb-2 text-lime-300">Ticket Issuer</h1>
            <p className="text-center text-slate-400 mb-6">Create a new signed ticket.</p>
            <form onSubmit={handleSubmit}>
                {/* Event Name */}
                <div className="mb-4">
                    <label htmlFor="eventName" className="block text-sm font-medium text-slate-300 mb-1">Event Name</label>
                    <input type="text" id="eventName" name="eventName" value={formData.eventName} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" />
                </div>
                {/* Buyer Name */}
                <div className="mb-4">
                    <label htmlFor="buyerName" className="block text-sm font-medium text-slate-300 mb-1">Buyer Name</label>
                    <input type="text" id="buyerName" name="buyerName" value={formData.buyerName} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" />
                </div>
                {/* Buyer Email */}
                <div className="mb-4">
                    <label htmlFor="buyerEmail" className="block text-sm font-medium text-slate-300 mb-1">Buyer Email</label>
                    <input type="email" id="buyerEmail" name="buyerEmail" value={formData.buyerEmail} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" />
                </div>
                {/* Seat Info */}
                <div className="mb-6">
                    <label htmlFor="seatInfo" className="block text-sm font-medium text-slate-300 mb-1">Seat Info</label>
                    <input type="text" id="seatInfo" name="seatInfo" value={formData.seatInfo} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-600">
                    {isLoading ? 'Issuing...' : 'Issue Ticket'}
                </button>
            </form>
            {error && <div className="mt-4 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg"><p>{error}</p></div>}
            {result && (
                <div className="mt-4 bg-green-900 border border-green-700 p-4 rounded-lg">
                    <p className="text-green-300 font-semibold mb-2">Ticket Issued!</p>
                    <p className="text-white text-sm mb-2">Backup PIN: <strong className="font-mono">{result.backupPin}</strong></p>
                    <a href={result.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline break-words">
                        View Guest Pass
                    </a>
                </div>
            )}
        </div>
    );
}