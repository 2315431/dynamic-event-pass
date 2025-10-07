import React, { useState } from 'react'
import { CreditCard, Lock, CheckCircle } from 'lucide-react'

const PaymentForm = ({ onPaymentSuccess, onPaymentError, amount, currency = 'USD' }) => {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    city: '',
    zipCode: '',
    country: 'US'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.cardNumber.replace(/\s/g, '')) {
      newErrors.cardNumber = 'Card number is required'
    } else if (formData.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Card number is too short'
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required'
    } else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = 'Invalid expiry date format'
    }

    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required'
    } else if (formData.cvv.length < 3) {
      newErrors.cvv = 'CVV is too short'
    }

    if (!formData.cardholderName) {
      newErrors.cardholderName = 'Cardholder name is required'
    }

    if (!formData.billingAddress) {
      newErrors.billingAddress = 'Billing address is required'
    }

    if (!formData.city) {
      newErrors.city = 'City is required'
    }

    if (!formData.zipCode) {
      newErrors.zipCode = 'ZIP code is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsProcessing(true)

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate payment success/failure
      const isSuccess = Math.random() > 0.1 // 90% success rate
      
      if (isSuccess) {
        onPaymentSuccess({
          transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9),
          amount,
          currency,
          paymentMethod: 'card',
          timestamp: new Date().toISOString()
        })
      } else {
        throw new Error('Payment was declined by the bank')
      }
    } catch (error) {
      onPaymentError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <div className="flex items-center mb-6">
          <CreditCard className="w-6 h-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Card Details</h3>
            
            <div>
              <label className="label">Card Number</label>
              <input
                type="text"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value)
                  setFormData(prev => ({ ...prev, cardNumber: formatted }))
                }}
                placeholder="1234 5678 9012 3456"
                className={`input ${errors.cardNumber ? 'border-red-500' : ''}`}
                maxLength={19}
              />
              {errors.cardNumber && <p className="error mt-1">{errors.cardNumber}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Expiry Date</label>
                <input
                  type="text"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={(e) => {
                    const formatted = formatExpiryDate(e.target.value)
                    setFormData(prev => ({ ...prev, expiryDate: formatted }))
                  }}
                  placeholder="MM/YY"
                  className={`input ${errors.expiryDate ? 'border-red-500' : ''}`}
                  maxLength={5}
                />
                {errors.expiryDate && <p className="error mt-1">{errors.expiryDate}</p>}
              </div>
              <div>
                <label className="label">CVV</label>
                <input
                  type="text"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  className={`input ${errors.cvv ? 'border-red-500' : ''}`}
                  maxLength={4}
                />
                {errors.cvv && <p className="error mt-1">{errors.cvv}</p>}
              </div>
            </div>

            <div>
              <label className="label">Cardholder Name</label>
              <input
                type="text"
                name="cardholderName"
                value={formData.cardholderName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className={`input ${errors.cardholderName ? 'border-red-500' : ''}`}
              />
              {errors.cardholderName && <p className="error mt-1">{errors.cardholderName}</p>}
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Billing Address</h3>
            
            <div>
              <label className="label">Address</label>
              <input
                type="text"
                name="billingAddress"
                value={formData.billingAddress}
                onChange={handleInputChange}
                placeholder="123 Main Street"
                className={`input ${errors.billingAddress ? 'border-red-500' : ''}`}
              />
              {errors.billingAddress && <p className="error mt-1">{errors.billingAddress}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="San Francisco"
                  className={`input ${errors.city ? 'border-red-500' : ''}`}
                />
                {errors.city && <p className="error mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="label">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="94105"
                  className={`input ${errors.zipCode ? 'border-red-500' : ''}`}
                />
                {errors.zipCode && <p className="error mt-1">{errors.zipCode}</p>}
              </div>
            </div>

            <div>
              <label className="label">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="input"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
              </select>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Lock className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">Secure Payment</p>
                <p className="text-xs text-green-600">
                  Your payment information is encrypted and secure. We never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-primary-600">
                {currency} {amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full btn btn-primary btn-lg disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing Payment...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Lock className="w-5 h-5 mr-2" />
                Pay {currency} {amount.toFixed(2)}
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PaymentForm