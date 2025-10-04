import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        eventId: 'TECH_CONF_2025',
        eventName: 'Future of Web Summit',
        buyerName: 'Jane Doe',
        buyerEmail: 'jane.doe@example.com',
        seatInfo: 'General Admission',
        category: 'All Access',
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
            // THE FIX IS HERE: Removed ".js" from the URL
            const response = await fetch('/.netlify/functions/issue-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                // Provide a more detailed error message
                throw new Error(`Server responded with ${response.status}: ${errorText || 'No error message from server.'}`);
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
            <button
                onClick={() => navigate('/validator')}
                className="w-full mb-6 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
                Go to Validator Page
            </button>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="buyerName" className="block text-sm font-medium text-slate-300 mb-1">Guest Name</label>
                    <input type="text" id="buyerName" name="buyerName" value={formData.buyerName} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400" />
                </div>
                 <div>
                    <label htmlFor="buyerEmail" className="block text-sm font-medium text-slate-300 mb-1">Guest Email</label>
                    <input type="email" id="buyerEmail" name="buyerEmail" value={formData.buyerEmail} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400" />
                </div>
                 <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-slate-300 mb-1">Event Name</label>
                    <input type="text" id="eventName" name="eventName" value={formData.eventName} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400" />
                </div>
                <div>
                    <label htmlFor="seatInfo" className="block text-sm font-medium text-slate-300 mb-1">Seat Info</label>
                    <input type="text" id="seatInfo" name="seatInfo" value={formData.seatInfo} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-600">
                    {isLoading ? 'Issuing...' : 'Issue Ticket'}
                </button>
            </form>
            {error && <div className="mt-4 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg"><h3 className="font-bold">Error</h3><pre className="whitespace-pre-wrap break-all">{error}</pre></div>}
            {result && (
                <div className="mt-4 bg-green-900 border border-green-700 p-4 rounded-lg">
                    <p className="text-green-300 font-semibold mb-2">Ticket Issued!</p>
                    <p className="text-slate-300 text-sm mb-2">Backup PIN: <strong className="text-white">{result.backupPin}</strong></p>
                     <a href={result.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline break-words">
                        View Guest Pass
                    </a>
                </div>
            )}
        </div>
    );
}

