import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ eventName: 'Future of Web Summit', buyerName: 'Jane Doe', buyerEmail: 'jane@example.com', seatInfo: 'General Admission' });
    const [imageFile, setImageFile] = useState(null);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResult(null);

        // This is a multipart form because it includes a file
        const formPayload = new FormData();
        formPayload.append('eventName', formData.eventName);
        formPayload.append('buyerName', formData.buyerName);
        formPayload.append('buyerEmail', formData.buyerEmail);
        formPayload.append('seatInfo', formData.seatInfo);
        if (imageFile) {
            formPayload.append('image', imageFile);
        }

        try {
            const response = await fetch('/.netlify/functions/issue-ticket', {
                method: 'POST',
                body: formPayload, // Send as FormData, not JSON
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
    
    // (UI Code for the form, including a new file input)
    return (
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg max-w-md mx-auto">
             <h1 className="text-2xl font-bold text-center mb-6 text-lime-300">Issue New Ticket</h1>
             <form onSubmit={handleSubmit}>
                {/* ... other form inputs ... */}
                 <div className="mb-4">
                    <label htmlFor="image" className="block text-sm font-medium text-slate-300 mb-1">Event Image (Optional)</label>
                    <input type="file" id="image" name="image" onChange={handleFileChange} accept="image/png, image/jpeg" className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-lime-500 ...">
                    {isLoading ? 'Issuing...' : 'Issue Ticket'}
                </button>
             </form>
             {error && <div className="mt-4 bg-red-900 ...">{error}</div>}
             {result && (
                <div className="mt-4 bg-green-900 ...">
                    <p>Ticket Issued!</p>
                    <a href={`/ticket?tk=${result.ticketJWT}`} target="_blank">View Guest Pass</a>
                </div>
             )}
        </div>
    );
}

export default Home;