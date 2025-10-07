import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import bcrypt from 'bcryptjs'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const { 
      eventName, 
      buyerName, 
      buyerEmail, 
      seatInfo, 
      category = 'General',
      eventId = 'EVT-' + Date.now(),
      transferAllowed = true,
      expiresAt = null
    } = JSON.parse(event.body)
    
    if (!eventName || !buyerName || !buyerEmail || !seatInfo) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing required fields.' }) 
      }
    }

    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const totpSecret = authenticator.generateSecret()
    const backupPin = Math.floor(1000 + Math.random() * 9000).toString()
    const backupPinHash = await bcrypt.hash(backupPin, 10)
    const validFrom = new Date()
    const validTo = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 31536000000) // 1 year default
    
    // Enhanced JWT payload with all necessary data for offline validation
    const ticketPayload = { 
      ticketId, 
      eventName, 
      buyerName, 
      buyerEmail, 
      seatInfo, 
      category, 
      eventId,
      totpSecret, 
      backupPinHash, 
      transferAllowed,
      validFrom: validFrom.toISOString(), 
      validTo: validTo.toISOString(),
      issuedAt: new Date().toISOString()
    }
    
    const privateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n') || '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCRhrUV9OsU3QV5\nBZSiLWgd4TZGUAcOK1j2KodiRFpU0AhHkuyKPCWY5ef5/tGA+6XfwEsdmlP+2fTk\nOgtxkqtK56PHUUlskVmEl7ihZkwaAo+1hO9MxQnVczypr4gvvBY3tyYBWoroOYyo\ng64Ze/n5s9HDKnnQdjm/HQKjd68uPAEC7KvACa2jJbeEXOxIUt7X4v8Z6r/yL46t\nJMS17CZu5d6vrFl7+Hm1KydAoD7W7QY4S28qRnVmK7J6Z3TBA4+KbTQEyR/f1Yzw\n/5fS6qxcCsWnYrCwWaaNG61nxzQBQwIkvA5pNOYBYwebYmJF8ividkUhOFywj/kQ\nxQ45BqMnAgMBAAECggEAHi3YafhDtCzt0J42p7dQ6zlkPwqjm+2jYlGJh/hy3znR\nLb6rbTNx/JZZGEAfBGeri45eRYJWvvhGT/o1m1T2Tu9gyJnz5x7xeIzaTiZfy9kS\nImuyELKgCnL+dpYfYP7ZgK5rpEY5nlUo9V1xgnlyarU+4AF0B6Ys7ZQ/ktTkMGsT\nHdnZ0sCfjCEBH/67NwzxkENBolIJl7KTrOJUoTLzS3M2RVYNM1VssqxfHt+mpZxp\nE4pbfcEoHoPpC7o4LltNuHZK7ohZ5LxhyxemqL8GSCnW42ReS8fPXyX6yJZth0IH\n4MnwoGk2D/DWYy/H/WLN+dPqT7nk6iFcgrnoRaUNIQKBgQDEEO0F0tqDp8tEos96\nFWG1YFQfbCXSFojjPI7kXJKJqu3vnKNiPauFRx27YVot/S/oRvPZ5CNjujoAR8YZ\nus+OJDzSk+AIJdvhksB+iSa4jmDONvIl4+vAic0s7J0ac8oJVN26u2l2XCAi4aBT\nA8+cL2aU2ahEvLyHScFu2w5adwKBgQC+As0KvoThhkIlQgh/aDngTdvNSLOVM7TF\nVKH6bUlUKf5X57mZghkxYZ6OfPRAVMY9Tjuq5UUlThCiD+kahNjk8UFAESSbPNyF\nKOnVOelXXe0w9cGGJKyGej/UdcrOa/i74YVulsLk/a3p1GhlnkQGrK2M6YxtZF2m\noSouChF40QKBgFswiBzqSalsFDVTB+5/HVevetC2iwygYIBXvRnnGFyhPFLyZmcd\nybWOMvzgtYGoPWzp+yZ/XhpXFfzlZPS4lypEHmnOTyda/F5408DGZ1T1G38tvQf0\nbsS5Es1vK06PRgt7BjmASve6t1Oh3uBdaGT7Atn+Na3qnkDKBAZcKdvXAoGADQ70\nOIDPcRBhC152Zwsqrxequ3j7no1nJwih+Sv5licsq63pO3uNb69dzj0YLDOnTB9M\nSnpnPiEXU4v0YTYwEcviyBxlf6W3Ig+lwlmwh6iU3ICHREjQ8o0ERf2yam1RMthU\n6zzBOCuXADLw2cr+sda8Nqr2U65KIWGCHJfki4ECgYASyqlD8RwyJ8D0L99ZCAwE\n9IxUUV7l9sjZ7itgSZ4PAMoAUbZ37432x77syr1IjbUhgMWPbuWtZCJvRqn/tDAG\nEQR4sPrvDrhY/7FZOM6rZ0rino45sfzXFtrrToKAqerKI5X4vQZjgCHYJFyEQ6/C\ntXbbSp/QAucjvj57aMrLfA==\n-----END PRIVATE KEY-----'
    
    const ticketJWT = jwt.sign(ticketPayload, privateKey, { 
      algorithm: 'RS256', 
      issuer: process.env.JWT_ISSUER || 'ticketmaster-pro', 
      audience: process.env.JWT_AUDIENCE || 'ticket-validator', 
      expiresIn: '1y' 
    })

    // Create guest URL with ticket token
    const guestUrl = `${process.env.URL || 'http://localhost:3000'}/ticket/${encodeURIComponent(ticketJWT)}`

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true, 
        ticketJWT, 
        guestUrl,
        ticketId,
        backupPin, // Only returned during issuance for user to note down
        totpSecret // For testing - remove in production
      }) 
    }
  } catch (error) {
    console.error('Issue ticket error:', error)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: `Server error: ${error.message}` }) 
    }
  }
}