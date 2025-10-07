# 🎫 TicketMaster Pro - Professional Event Ticketing Platform

A modern, BookMyShow-style event ticketing platform with offline validation capabilities, built with React, Netlify Functions, and cryptographic security.

## ✨ Features

### 🎯 **Core Platform Features**
- **Event Discovery**: Browse events by category, location, and date
- **Event Details**: Comprehensive event information with schedules
- **Booking Flow**: Multi-step booking process with payment integration
- **Digital Tickets**: Beautiful, mobile-optimized ticket display
- **Offline Validation**: Works without internet connection

### 🔐 **Security & Validation**
- **Cryptographic Signing**: RSA-256 JWT signatures for ticket authenticity
- **TOTP Codes**: Time-based rotating codes that change every 30 seconds
- **Backup PINs**: 4-digit PINs as fallback authentication
- **Offline Validation**: Validates tickets even without internet
- **Double-Scan Prevention**: Prevents duplicate redemptions

### 📱 **User Experience**
- **Mobile-First Design**: Responsive design that works on all devices
- **PWA Ready**: Can be installed as a mobile app
- **Offline Capable**: Works without internet connection
- **Real-time Updates**: Live TOTP code updates
- **Professional UI**: Clean, modern interface inspired by BookMyShow

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create a `.env` file or set in Netlify:
```env
# RSA Keys (generate with: openssl genrsa -out private.pem 2048)
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----"

# JWT Configuration
JWT_ISSUER="ticketmaster-pro"
JWT_AUDIENCE="ticket-validator"

# TOTP Configuration
TOTP_STEP=30
TOTP_WINDOW=1
```

### 3. Generate RSA Keys
```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem

# Copy the contents to your environment variables
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## 🏗️ Architecture

### **Frontend (React)**
- **Home**: Event discovery and featured events
- **Events**: Browse and filter events
- **EventDetail**: Detailed event information
- **Booking**: Multi-step booking process
- **Ticket**: Digital ticket display with TOTP
- **Validator**: QR code scanner and validation

### **Backend (Netlify Functions)**
- **issue-ticket.js**: Creates signed JWT tickets
- **validate-ticket.js**: Validates tickets with hybrid approach
- **get-public-key.js**: Provides public key for validation

### **Security Model**
1. **Ticket Creation**: Platform signs JWT with private key
2. **Offline Validation**: Validator verifies with public key
3. **TOTP Verification**: Time-based code validation
4. **Online Sync**: Syncs redemption status when online

## 📱 Pages & Features

### **Home Page**
- Hero section with search functionality
- Featured events carousel
- Category browsing
- Call-to-action sections

### **Events Page**
- Event grid/list view toggle
- Advanced filtering and search
- Category-based filtering
- Sorting options

### **Event Detail Page**
- Comprehensive event information
- Event schedule
- Booking CTA
- Social sharing options

### **Booking Flow**
- Contact information collection
- Payment method selection
- Order review and confirmation
- Multi-step progress indicator

### **Digital Ticket**
- Beautiful ticket design
- Live TOTP code generation
- QR code for validation
- Offline functionality
- Download and share options

### **Validator App**
- QR code scanning
- Manual code entry
- Offline/online status
- Validation results
- Pending sync management

## 🔧 Technical Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Netlify Functions (Node.js 18)
- **Security**: JWT (RS256), TOTP (otplib), bcrypt
- **QR Codes**: html5-qrcode, qrcode.react
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🎨 Design System

### **Colors**
- Primary: Blue (#3b82f6)
- Secondary: Gray (#64748b)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Error: Red (#ef4444)

### **Components**
- Buttons: Primary, Secondary, Outline, Ghost
- Cards: Event cards, ticket cards
- Forms: Input fields, selectors
- Navigation: Header, footer, breadcrumbs

## 🔐 Security Features

### **Ticket Security**
- **RSA-256 Signing**: Only platform can create valid tickets
- **TOTP Codes**: Rotating codes prevent replay attacks
- **Backup PINs**: Fallback authentication method
- **Expiration**: Time-based ticket validity

### **Validation Security**
- **Offline First**: Works without internet
- **Cryptographic Verification**: JWT signature validation
- **Double-Scan Prevention**: Local duplicate detection
- **Online Sync**: Syncs when connectivity returns

## 📊 Usage Examples

### **Issue a Ticket**
```javascript
const response = await fetch('/.netlify/functions/issue-ticket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventName: 'Tech Conference 2024',
    buyerName: 'John Doe',
    buyerEmail: 'john@example.com',
    seatInfo: 'VIP-001',
    category: 'VIP'
  })
})
```

### **Validate a Ticket**
```javascript
const response = await fetch('/.netlify/functions/validate-ticket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ticketJWT: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    totpCode: '123456'
  })
})
```

## 🚀 Deployment

### **Netlify Deployment**
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Set functions directory: `netlify/functions`
5. Add environment variables in Netlify dashboard
6. Deploy!

### **Environment Variables**
```env
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_ISSUER="ticketmaster-pro"
JWT_AUDIENCE="ticket-validator"
TOTP_STEP=30
TOTP_WINDOW=1
```

## 🧪 Testing

### **Local Testing**
```bash
# Start development server
npm run dev

# Test ticket issuance
curl -X POST http://localhost:3000/.netlify/functions/issue-ticket \
  -H "Content-Type: application/json" \
  -d '{"eventName":"Test Event","buyerName":"Test User","buyerEmail":"test@example.com","seatInfo":"A1"}'
```

### **Offline Testing**
1. Issue a ticket
2. Disconnect from internet
3. Open validator app
4. Scan QR code
5. Verify offline validation works

## 📈 Performance

- **Build Size**: ~634KB (gzipped: ~189KB)
- **Load Time**: < 2 seconds
- **Offline Support**: Full PWA capabilities
- **Mobile Optimized**: Responsive design

## 🔮 Future Enhancements

- [ ] Event management dashboard
- [ ] Payment integration (Stripe, PayPal)
- [ ] Real-time analytics
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Advanced reporting
- [ ] Social features
- [ ] API documentation

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
- Check the documentation
- Review the troubleshooting guide

---

**Built with ❤️ for professional event ticketing**

*TicketMaster Pro - Where every event matters*