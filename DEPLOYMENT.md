# Deployment Guide - Hybrid Ticket Validation System

## 🚀 Quick Deployment to Netlify

### 1. Prerequisites
- Netlify account
- Supabase account
- RSA keypair generated

### 2. Deploy to Netlify

#### Option A: Deploy from Git
1. Push your code to GitHub/GitLab
2. Connect repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Set functions directory: `netlify/functions`

#### Option B: Deploy via CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### 3. Configure Environment Variables

In Netlify dashboard, go to Site Settings > Environment Variables:

```env
# RSA Keys (replace with your actual keys)
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----"

# JWT Configuration
JWT_ISSUER="dep-platform"
JWT_AUDIENCE="dep-validator"

# TOTP Configuration
TOTP_STEP=30
TOTP_WINDOW=1

# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Netlify Configuration
URL="https://your-app.netlify.app"
```

### 4. Set Up Supabase

1. Create new Supabase project
2. Go to SQL Editor
3. Run the schema from `supabase-schema.sql`
4. Get your project URL and service role key
5. Add to Netlify environment variables

### 5. Test Deployment

1. Visit your Netlify URL
2. Issue a test ticket
3. Open the guest pass
4. Test the validator
5. Verify offline functionality

## 🔧 Production Configuration

### Security Checklist
- [ ] RSA keys are properly formatted with `\n` for newlines
- [ ] Supabase RLS policies are enabled
- [ ] Service role key is secure
- [ ] JWT issuer/audience are set correctly
- [ ] TOTP settings are appropriate for your use case

### Performance Optimization
- [ ] Enable Netlify Edge Functions (if needed)
- [ ] Set up CDN caching
- [ ] Optimize images and assets
- [ ] Monitor function execution times

### Monitoring Setup
- [ ] Enable Netlify Analytics
- [ ] Set up Supabase monitoring
- [ ] Configure error tracking
- [ ] Monitor function logs

## 🧪 Testing in Production

### 1. Basic Functionality Test
```bash
# Test ticket issuance
curl -X POST https://your-app.netlify.app/.netlify/functions/issue-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "Production Test Event",
    "buyerName": "Test User",
    "buyerEmail": "test@example.com",
    "seatInfo": "VIP-001",
    "category": "VIP"
  }'
```

### 2. Offline Validation Test
1. Issue a ticket
2. Disconnect from internet
3. Open validator app
4. Scan QR code
5. Verify offline validation works
6. Reconnect internet
7. Verify sync occurs

### 3. Transfer Test
```bash
# Test ticket transfer
curl -X POST https://your-app.netlify.app/.netlify/functions/transfer-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticketJWT": "YOUR_JWT_HERE",
    "newBuyerName": "New Owner",
    "newBuyerEmail": "newowner@example.com"
  }'
```

## 📊 Monitoring & Analytics

### Netlify Functions Monitoring
- Go to Functions tab in Netlify dashboard
- Monitor execution times and errors
- Set up alerts for failures

### Supabase Monitoring
- Check database performance
- Monitor query execution times
- Set up alerts for high error rates

### Application Monitoring
- Track ticket issuance rates
- Monitor validation success rates
- Analyze offline vs online usage

## 🔄 Maintenance

### Regular Tasks
- Monitor function logs for errors
- Check database performance
- Update dependencies regularly
- Review security settings

### Backup Strategy
- Supabase automatically backs up data
- Export critical data regularly
- Keep RSA keys secure and backed up

### Updates
- Test updates in staging environment
- Deploy during low-traffic periods
- Monitor for issues after deployment

## 🚨 Troubleshooting

### Common Issues

**Functions Not Working**
- Check environment variables
- Verify function syntax
- Check Netlify function logs

**Database Connection Issues**
- Verify Supabase credentials
- Check RLS policies
- Monitor connection limits

**Offline Sync Problems**
- Check service worker registration
- Verify PWA manifest
- Test in different browsers

**Validation Errors**
- Verify RSA key format
- Check JWT configuration
- Test TOTP settings

### Getting Help
- Check Netlify function logs
- Review Supabase logs
- Test locally first
- Check browser console

## 📈 Scaling Considerations

### High Traffic
- Consider Netlify Edge Functions
- Optimize database queries
- Use CDN for static assets
- Monitor function limits

### Multiple Events
- Use event-specific prefixes
- Implement proper data isolation
- Consider separate databases per event
- Monitor resource usage

### Global Deployment
- Use Netlify's global CDN
- Consider regional databases
- Optimize for different time zones
- Test in different regions

## 🔐 Security Best Practices

### Key Management
- Rotate RSA keys regularly
- Use secure key storage
- Never commit keys to git
- Use environment variables

### Database Security
- Enable RLS on all tables
- Use least privilege access
- Monitor database access
- Regular security audits

### Application Security
- Validate all inputs
- Use HTTPS everywhere
- Implement rate limiting
- Regular security updates

---

**Your hybrid ticket validation system is now ready for production! 🎉**