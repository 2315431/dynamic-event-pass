import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ 
        eventName: 'Future of Web Summit', 
        buyerName: 'Jane Doe', 
        buyerEmail: 'jane@example.com', 
        seatInfo: 'General Admission',
        category: 'VIP',
        eventId: 'FOWS2025'
    });
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            // This is now a simple JSON request again.
            const response = await fetch('/.netlify/functions/issue-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-slate-800 p-8 rounded-2xl shadow-lg max-w-lg mx-auto">
             <h1 className="text-3xl font-bold text-center mb-6 text-lime-300">Issue New Ticket</h1>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-slate-300">Event Name</label>
                    <input type="text" id="eventName" name="eventName" value={formData.eventName} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 mt-1" />
                </div>
                 <div>
                    <label htmlFor="buyerName" className="block text-sm font-medium text-slate-300">Guest Name</label>
                    <input type="text" id="buyerName" name="buyerName" value={formData.buyerName} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 mt-1" />
                </div>
                 <div>
                    <label htmlFor="buyerEmail" className="block text-sm font-medium text-slate-300">Guest Email</label>
                    <input type="email" id="buyerEmail" name="buyerEmail" value={formData.buyerEmail} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 mt-1" />
                </div>
                <div>
                    <label htmlFor="seatInfo" className="block text-sm font-medium text-slate-300">Seat Info</label>
                    <input type="text" id="seatInfo" name="seatInfo" value={formData.seatInfo} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 mt-1" />
                </div>
                 <div>
                    <label htmlFor="category" className="block text-sm font-medium text-slate-300">Category</label>
                    <input type="text" id="category" name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 mt-1" />
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-600">
                    {isLoading ? 'Issuing...' : 'Issue Ticket'}
                </button>
             </form>
             {error && <div className="mt-4 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg">{error}</div>}
             {result && (
                <div className="mt-4 bg-green-900 border border-green-700 p-4 rounded-lg">
                    <p className="text-green-300 font-semibold mb-2">Ticket Issued!</p>
                    <a href={`/ticket?tk=${result.ticketJWT}`} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline break-words">
                        View Guest Pass
                    </a>
                </div>
             )}
        </div>
    );
}

export default Home;