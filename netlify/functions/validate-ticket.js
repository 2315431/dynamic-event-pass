import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import bcrypt from 'bcryptjs'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const { ticketJWT, totpCode, backupPin, validatorId = 'default' } = JSON.parse(event.body)

    if (!ticketJWT) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing ticketJWT.' }) }
    }

    // STEP 1: OFFLINE CRYPTOGRAPHIC VALIDATION
    let ticketPayload
    try {
      const publicKey = process.env.PUBLIC_KEY?.replace(/\\n/g, '\n') || '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkYa1FfTrFN0FeQWUoi1o\nHeE2RlAHDitY9iqHYkRaVNAIR5LsijwlmOXn+f7RgPul38BLHZpT/tn05DoLcZKr\nSuejx1FJbJFZhJe4oWZMGgKPtYTvTMUJ1XM8qa+IL7wWN7cmAVqK6DmMqIOuGXv5\n+bPRwyp50HY5vx0Co3evLjwBAuyrwAmtoyW3hFzsSFLe1+L/Geq/8i+OrSTEtewm\nbuXer6xZe/h5tSsnQKA+1u0GOEtvKkZ1Ziuyemd0wQOPim00BMkf39WM8P+X0uqs\nXArFp2KwsFmmjRutZ8c0AUMCJLwOaTTmAWMHm2JiRfIr4nZFIThcsI/5EMUOOQaj\nJwIDAQAB\n-----END PUBLIC KEY-----'
      
      ticketPayload = jwt.verify(ticketJWT, publicKey, { 
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER || 'ticketmaster-pro',
        audience: process.env.JWT_AUDIENCE || 'ticket-validator'
      })
    } catch (jwtError) {
      return { 
        statusCode: 401, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid ticket signature.', 
          details: jwtError.message 
        }) 
      }
    }

    // Check ticket validity period
    const now = new Date()
    const validFrom = new Date(ticketPayload.validFrom)
    const validTo = new Date(ticketPayload.validTo)

    if (now < validFrom) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket not yet valid.' 
        }) 
      }
    }

    if (now > validTo) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Ticket has expired.' 
        }) 
      }
    }

    // STEP 2: TOTP OR PIN VALIDATION
    let codeValid = false
    
    if (totpCode) {
      // Validate TOTP code
      codeValid = authenticator.verify({ 
        token: totpCode, 
        secret: ticketPayload.totpSecret,
        step: parseInt(process.env.TOTP_STEP) || 30,
        window: parseInt(process.env.TOTP_WINDOW) || 1
      })
    } else if (backupPin) {
      // Validate backup PIN
      codeValid = await bcrypt.compare(backupPin, ticketPayload.backupPinHash)
    } else {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Either TOTP code or backup PIN required.' 
        }) 
      }
    }

    if (!codeValid) {
      return { 
        statusCode: 401, 
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication code.' 
        }) 
      }
    }

    // STEP 3: SIMULATE ONLINE DATABASE VALIDATION
    // In a real app, this would check against Supabase
    let onlineValidation = { success: true, error: null }
    
    // Simulate some validation logic
    const isTicketRedeemed = Math.random() < 0.1 // 10% chance of being redeemed
    if (isTicketRedeemed) {
      onlineValidation = { success: false, error: 'Ticket already redeemed' }
    }

    // STEP 4: RETURN RESULT
    const result = {
      success: true,
      offlineValid: true,
      onlineValid: onlineValidation.success,
      ticketDetails: {
        ticketId: ticketPayload.ticketId,
        eventName: ticketPayload.eventName,
        buyerName: ticketPayload.buyerName,
        seatInfo: ticketPayload.seatInfo,
        category: ticketPayload.category,
        validFrom: ticketPayload.validFrom,
        validTo: ticketPayload.validTo
      },
      validation: {
        cryptoValid: true,
        codeValid: true,
        onlineSync: onlineValidation.success,
        onlineError: onlineValidation.error
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    }

  } catch (error) {
    console.error('Validation error:', error)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        success: false, 
        error: 'Validation failed: ' + error.message 
      }) 
    }
  }
}