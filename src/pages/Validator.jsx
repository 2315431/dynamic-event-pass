import React, { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QrCode, CheckCircle, XCircle, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const Validator = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastValidation, setLastValidation] = useState(null)
  const [pendingSync, setPendingSync] = useState([])
  const [manualCode, setManualCode] = useState('')
  const scannerRef = useRef(null)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load pending sync items
  useEffect(() => {
    const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]')
    setPendingSync(pending)
  }, [])

  const startScanner = () => {
    if (scannerRef.current) return

    setIsScanning(true)
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0
      },
      false
    )
    
    scannerRef.current.render(handleScanSuccess, (error) => {
      // Ignore scanning errors
    })
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleScanSuccess = (decodedText) => {
    try {
      const [ticketJWT, totpCode] = decodedText.split('|')
      if (!ticketJWT || !totpCode) {
        throw new Error('Invalid QR code format')
      }
      validateTicket(ticketJWT, totpCode)
    } catch (error) {
      toast.error('Invalid QR code format')
    }
  }

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      toast.error('Please enter a ticket code')
      return
    }
    
    try {
      const [ticketJWT, totpCode] = manualCode.split('|')
      if (!ticketJWT || !totpCode) {
        throw new Error('Invalid format. Use: JWT|TOTP_CODE')
      }
      validateTicket(ticketJWT, totpCode)
    } catch (error) {
      toast.error('Invalid format. Use: JWT|TOTP_CODE')
    }
  }

  const validateTicket = async (ticketJWT, totpCode) => {
    try {
      // Simulate validation process
      const isValid = Math.random() > 0.2 // 80% success rate for demo
      
      if (isValid) {
        const ticketData = {
          id: 'TKT-' + Math.random().toString(36).substr(2, 9),
          eventName: 'Sample Event',
          buyerName: 'John Doe',
          seatInfo: 'VIP-001',
          category: 'VIP',
          validatedAt: new Date().toISOString(),
          method: 'qr'
        }

        setLastValidation({
          success: true,
          ticketData,
          isOffline: !isOnline
        })

        // Add to pending sync if offline
        if (!isOnline) {
          const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]')
          pending.push(ticketData.id)
          localStorage.setItem('pendingSync', JSON.stringify(pending))
          setPendingSync(pending)
        }

        toast.success('Ticket validated successfully!')
      } else {
        setLastValidation({
          success: false,
          error: 'Invalid ticket or expired code'
        })
        toast.error('Invalid ticket or expired code')
      }
    } catch (error) {
      setLastValidation({
        success: false,
        error: error.message
      })
      toast.error('Validation failed: ' + error.message)
    }
  }

  const syncPendingRedemptions = async () => {
    if (pendingSync.length === 0) return

    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      localStorage.setItem('pendingSync', JSON.stringify([]))
      setPendingSync([])
      toast.success(`Synced ${pendingSync.length} pending validations`)
    } catch (error) {
      toast.error('Sync failed: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticket Validator</h1>
          <p className="text-lg text-gray-600">Scan QR codes or enter ticket codes manually</p>
        </div>

        {/* Status Indicators */}
        <div className="flex justify-center space-x-4 mb-8">
          <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
            {isOnline ? 'Online' : 'Offline Mode'}
          </div>
          
          {pendingSync.length > 0 && (
            <div className="flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <Clock className="w-4 h-4 mr-2" />
              {pendingSync.length} pending sync
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">QR Code Scanner</h2>
              <div className="flex space-x-2">
                {!isScanning ? (
                  <button
                    onClick={startScanner}
                    className="btn btn-primary btn-md"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Start Scanner
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="btn btn-secondary btn-md"
                  >
                    Stop Scanner
                  </button>
                )}
              </div>
            </div>

            {/* Scanner */}
            {isScanning && (
              <div className="mb-6">
                <div id="qr-reader" className="border-2 border-dashed border-gray-300 rounded-lg p-4"></div>
              </div>
            )}

            {/* Manual Entry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manual Entry (JWT|TOTP_CODE)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste JWT|TOTP_CODE here"
                  className="flex-1 input"
                />
                <button
                  onClick={handleManualSubmit}
                  className="btn btn-primary btn-md"
                >
                  Validate
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Validation Results</h2>
            
            {lastValidation ? (
              <div className={`p-4 rounded-lg ${
                lastValidation.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {lastValidation.success ? (
                  <div>
                    <div className="flex items-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-green-800">Ticket Valid</h3>
                        <p className="text-sm text-green-600">
                          {lastValidation.isOffline ? 'Validated offline - will sync when online' : 'Validated online'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Event</p>
                          <p className="font-semibold">{lastValidation.ticketData.eventName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Guest</p>
                          <p className="font-semibold">{lastValidation.ticketData.buyerName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Seat</p>
                          <p className="font-semibold">{lastValidation.ticketData.seatInfo}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Category</p>
                          <p className="font-semibold">{lastValidation.ticketData.category}</p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Validated at: {new Date(lastValidation.ticketData.validatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <XCircle className="w-8 h-8 text-red-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-800">Validation Failed</h3>
                      <p className="text-red-600">{lastValidation.error}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No validation yet</p>
                <p className="text-sm text-gray-400">Scan a QR code or enter a ticket code to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Sync Section */}
        {pendingSync.length > 0 && (
          <div className="card p-6 mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pending Sync</h3>
                <p className="text-gray-600">
                  {pendingSync.length} validation{pendingSync.length !== 1 ? 's' : ''} waiting to sync
                </p>
              </div>
              <button
                onClick={syncPendingRedemptions}
                disabled={!isOnline}
                className="btn btn-primary btn-md disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">QR Code Scanning</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click "Start Scanner" to activate camera</li>
                <li>• Point camera at the QR code on the ticket</li>
                <li>• The system will automatically validate</li>
                <li>• Works offline - no internet required</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Manual Entry</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Copy the JWT|TOTP_CODE from the ticket</li>
                <li>• Paste into the manual entry field</li>
                <li>• Click "Validate" to check the ticket</li>
                <li>• Use when camera scanning isn't possible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Validator