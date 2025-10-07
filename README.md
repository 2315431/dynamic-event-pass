# Hybrid Ticket Validation System

A production-ready, offline-capable ticket validation system built with Netlify Functions, React, and cryptographic security. This system implements a hybrid validation model that works both online and offline, ensuring tickets can be validated even when internet connectivity is unavailable.

## 🚀 Key Features

### **Hybrid Validation Architecture**
- **Offline Cryptographic Validation**: Uses RS256 JWT signatures for instant offline verification
- **Online Database Sync**: Syncs redemption status when internet is available
- **Offline Queue**: Queues offline redemptions for later synchronization
- **Double-Scan Prevention**: Prevents duplicate redemptions on the same device

### **Security Features**
- **RSA-256 JWT Signing**: Only the platform can create valid tickets
- **TOTP Rotating Codes**: Time-based one-time passwords that change every 30 seconds
- **Backup PIN System**: 4-digit PINs as fallback authentication
- **Cryptographic Integrity**: Tickets cannot be forged or tampered with

### **Offline Capabilities**
- **PWA Support**: Works as a Progressive Web App
- **Service Worker**: Caches resources for offline use
- **Local Storage**: Maintains redemption history locally
- **Auto-Sync**: Automatically syncs when connectivity returns

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ticket        │    │   Validator     │    │   Database      │
│   Issuance      │    │   (Offline)     │    │   (Online)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Issue JWT          │ 2. Verify JWT         │ 3. Sync Status
         │    + TOTP Seed        │    + TOTP Code        │    + Logs
         │    + Backup PIN       │    + Local Check      │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Guest Pass    │    │   Validation    │    │   Supabase      │
│   (Offline)     │    │   Result        │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
├── netlify/functions/
│   ├── issue-ticket.js      # Issues signed JWT tickets
│   ├── validate-ticket.js   # Hybrid validation endpoint
│   ├── sync-redemption.js   # Syncs offline redemptions
│   ├── transfer-ticket.js   # Transfers ticket ownership
│   └── get-public-key.js    # Returns public key for validation
├── src/pages/
│   ├── Home.jsx             # Ticket issuance form
│   ├── Ticket.jsx           # Guest pass with TOTP
│   └── Validator.jsx        # PWA validator interface
├── public/
│   ├── manifest.json        # PWA manifest
│   └── sw.js               # Service worker
└── supabase-schema.sql      # Database schema
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Netlify Functions (Node.js 18)
- **Database**: Supabase (PostgreSQL)
- **Security**: JWT (RS256), TOTP (otplib), bcrypt
- **QR Codes**: html5-qrcode, qrcode.react
- **PWA**: Service Worker, Web App Manifest

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd hybrid-ticket-validation
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql`
3. Get your project URL and service role key

### 3. Configure Environment Variables

Create a `.env` file or set in Netlify:

```env
# RSA Keys (generate with: openssl genrsa -out private.pem 2048)
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----"

# JWT Configuration
JWT_ISSUER="dep-platform"
JWT_AUDIENCE="dep-validator"

# TOTP Configuration
TOTP_STEP=30
TOTP_WINDOW=1

# Supabase Configuration
VITE_SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 4. Generate RSA Keypair

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem

# Copy the contents to your environment variables
```

### 5. Run Locally

```bash
npm run dev
```

### 6. Deploy to Netlify

```bash
npm run build
netlify deploy --prod
```

## 🔐 Security Model

### **Ticket Creation**
1. Platform generates unique ticket ID
2. Creates TOTP secret and backup PIN
3. Signs JWT with private key (RS256)
4. Stores metadata in database

### **Offline Validation**
1. Validator verifies JWT signature with public key
2. Checks TOTP code against embedded secret
3. Validates ticket expiration dates
4. Prevents double-scan on same device

### **Online Sync**
1. Checks database for redemption status
2. Updates redemption status if valid
3. Logs redemption attempt
4. Queues offline redemptions for later sync

## 📱 Usage Guide

### **Issuing Tickets**
1. Fill out the ticket form on the home page
2. Click "Issue Ticket" to generate a signed JWT
3. Share the guest URL with the ticket holder
4. Save the backup PIN for emergency access

### **Guest Experience**
1. Open the guest URL on any device
2. View the rotating TOTP code (updates every 30s)
3. Show QR code to validator at entry
4. Works completely offline

### **Validation Process**
1. Open validator app (works as PWA)
2. Scan QR code or enter manually
3. System validates cryptographically
4. Syncs with database when online
5. Prevents duplicate redemptions

## 🔄 Offline Sync Process

### **When Online**
- Validates ticket immediately
- Updates database in real-time
- Logs all redemption attempts

### **When Offline**
- Validates ticket cryptographically
- Stores redemption locally
- Queues for sync when online
- Prevents double-scan on device

### **Sync Recovery**
- Automatically syncs when connectivity returns
- Processes queued redemptions
- Handles conflicts gracefully
- Maintains audit trail

## 🎯 Production Considerations

### **Performance**
- JWT validation is instant (offline)
- Database queries are minimal
- QR codes are optimized for scanning
- PWA caches resources locally

### **Scalability**
- Stateless validation functions
- Database indexes for fast queries
- CDN for static assets
- Horizontal scaling ready

### **Monitoring**
- Comprehensive logging
- Redemption analytics
- Error tracking
- Performance metrics

## 🧪 Testing

### **Local Testing**
```bash
# Start development server
npm run dev

# Test ticket issuance
curl -X POST http://localhost:8888/.netlify/functions/issue-ticket \
  -H "Content-Type: application/json" \
  -d '{"eventName":"Test Event","buyerName":"Test User","buyerEmail":"test@example.com","seatInfo":"A1"}'

# Test validation
curl -X POST http://localhost:8888/.netlify/functions/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{"ticketJWT":"YOUR_JWT","totpCode":"123456"}'
```

### **Offline Testing**
1. Issue a ticket
2. Disconnect from internet
3. Open validator app
4. Scan QR code
5. Verify offline validation works
6. Reconnect internet
7. Verify sync occurs

## 📊 Database Schema

### **Tables**
- `tickets`: Ticket metadata and status
- `redemptions`: Redemption logs
- `transfers`: Transfer history
- `validators`: Validator device tracking

### **Key Features**
- Row Level Security (RLS)
- Automatic timestamps
- Comprehensive indexes
- Audit trail functions

## 🔧 Configuration

### **TOTP Settings**
- Step: 30 seconds (configurable)
- Window: 1 (tolerance)
- Algorithm: SHA1
- Digits: 6

### **JWT Settings**
- Algorithm: RS256
- Expiration: 1 year
- Issuer: dep-platform
- Audience: dep-validator

## 🚨 Troubleshooting

### **Common Issues**

**QR Code Not Scanning**
- Ensure good lighting
- Hold steady for 2-3 seconds
- Try manual entry instead

**TOTP Code Invalid**
- Check device time sync
- Try backup PIN
- Wait for next 30-second window

**Offline Sync Failing**
- Check internet connection
- Verify Supabase credentials
- Check browser console for errors

**Validation Errors**
- Verify JWT signature
- Check ticket expiration
- Ensure TOTP is current

## 📈 Analytics & Monitoring

### **Key Metrics**
- Total tickets issued
- Redemption rate
- Offline vs online validations
- Transfer frequency
- Error rates

### **Logging**
- All redemption attempts
- Transfer operations
- Error conditions
- Performance metrics

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Biometric authentication
- [ ] NFC support
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Custom branding per event
- [ ] Integration with payment systems
- [ ] Real-time notifications

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation

---

**Built with ❤️ for secure, offline-capable event ticketing**