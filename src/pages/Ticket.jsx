import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, MapPin, Users, QrCode, Download, Share2, Clock } from 'lucide-react'
import QRCode from 'qrcode.react'
import { authenticator } from 'otplib'
import toast from 'react-hot-toast'

const Ticket = () => {
  const { token } = useParams()
  const [ticketData, setTicketData] = useState(null)
  const [currentCode, setCurrentCode] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Mock ticket data - in real app, decode from JWT token
  useEffect(() => {
    // Simulate loading ticket data
    const mockTicket = {
      id: 'TKT-' + Math.random().toString(36).substr(2, 9),
      eventName: 'Tech Conference 2024',
      buyerName: 'John Doe',
      buyerEmail: 'john@example.com',
      seatInfo: 'VIP-001',
      category: 'VIP',
      date: '2024-03-15',
      time: '09:00 AM',
      venue: 'Convention Center',
      city: 'San Francisco',
      totpSecret: 'JBSWY3DPEHPK3PXP', // Mock TOTP secret
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      qrData: `TKT-${Math.random().toString(36).substr(2, 9)}|${Math.random().toString().substr(2, 6)}`
    }
    
    setTicketData(mockTicket)
  }, [token])

  // Generate TOTP code and update countdown
  useEffect(() => {
    if (!ticketData?.totpSecret) return

    const updateCode = () => {
      const code = authenticator.generate(ticketData.totpSecret)
      setCurrentCode(code)
      
      // Calculate time left in current window
      const epoch = Math.round(new Date().getTime() / 1000.0)
      const timeStep = 30 // 30 seconds
      const timeLeft = timeStep - (epoch % timeStep)
      setTimeLeft(timeLeft)
    }

    updateCode()
    const interval = setInterval(updateCode, 1000)

    return () => clearInterval(interval)
  }, [ticketData?.totpSecret])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleDownload = () => {
    toast.success('Downloading ticket...')
    // In real app, generate and download PDF
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `My ticket for ${ticketData?.eventName}`,
        text: `Check out my ticket for ${ticketData?.eventName}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Ticket link copied to clipboard!')
    }
  }

  if (!ticketData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your ticket...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 p-4">
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
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white text-center">
            <h1 className="text-2xl font-bold mb-2">{ticketData.eventName}</h1>
            <p className="text-primary-100">Digital Event Pass</p>
          </div>

          {/* Guest Info */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {ticketData.buyerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">{ticketData.buyerName}</h2>
              <p className="text-gray-600">{ticketData.buyerEmail}</p>
            </div>

            {/* Event Details */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-3" />
                <span>{new Date(ticketData.date).toLocaleDateString()} at {ticketData.time}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-3" />
                <span>{ticketData.venue}, {ticketData.city}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="w-5 h-5 mr-3" />
                <span>{ticketData.seatInfo} • {ticketData.category}</span>
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
                  value={ticketData.qrData} 
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
                onClick={handleDownload}
                className="w-full btn btn-primary btn-lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </button>
              
              <button
                onClick={handleShare}
                className="w-full btn btn-outline btn-lg"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share Ticket
              </button>
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

        {/* Security Notice */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-green-800">Secure Ticket</p>
              <p className="text-xs text-green-600">This ticket is cryptographically signed and cannot be forged</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ticket