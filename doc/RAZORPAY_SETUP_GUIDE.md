# Razorpay Payment Gateway Integration

This guide explains how to set up and use the Razorpay payment gateway integration in the SBBS E-commerce application.

## Overview

The application now supports two payment methods:
1. **Cash on Delivery (COD)** - Pay when order is delivered
2. **Razorpay** - Secure online payment with multiple options

## Quick Setup (Recommended)

### Automated Setup Script

Run the automated setup script to configure Razorpay:

```bash
# Make sure you're in the project root
cd /path/to/your/project

# Run the setup script
./setup-razorpay.sh
```

The script will:
- Create/update your `.env` file
- Prompt for Razorpay credentials
- Configure the environment variables
- Provide next steps

## Backend Setup

### 1. Install Dependencies

The backend already includes the Razorpay SDK. If you need to reinstall:

```bash
cd backend
npm install
```

### 2. Environment Configuration

Add your Razorpay credentials to the backend `.env` file:

```env
# Razorpay Payment Gateway Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

### 3. Get Razorpay Credentials

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Generate API Key ID and Secret
4. Add them to your `.env` file or use the setup script

## Frontend Setup

### 1. Install Dependencies

The frontend already includes the Razorpay SDK. If you need to reinstall:

```bash
cd my-project
npm install
```

### 2. Available Payment Methods

The checkout page now shows:
- **Cash on Delivery** (default)
- **Razorpay** (new secure online payment)
- Credit Card & PayPal (disabled, coming soon)

## How It Works

### Payment Flow

1. **User selects Razorpay** during checkout
2. **Order is created** with `payment_pending` status
3. **Razorpay modal opens** with payment options
4. **User completes payment** via UPI, cards, net banking, etc.
5. **Payment is verified** on the backend
6. **Order status updates** to `processing`
7. **User is redirected** to order confirmation

### Order Status Flow

```
Cash on Delivery: pending → processing → shipped → delivered
Razorpay Payment: payment_pending → processing → shipped → delivered
```

## API Endpoints

### Payment Routes (`/api/payments/`)

- `GET /api/payments/test` - Test payment routes
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify-payment` - Verify payment signature
- `POST /api/payments/payment-failed` - Handle payment failure
- `GET /api/payments/config` - Get Razorpay configuration

### Order Routes (`/api/orders/`)

- `POST /api/orders/place-order` - Place COD order
- `GET /api/orders/customer/:customerId` - Get customer orders

## Database Changes

### Order Model Updates

Added fields for Razorpay payment tracking:

```javascript
{
  // ... existing fields
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,
  payment_status: ["pending", "completed", "failed", "refunded"],
  // ... existing fields
}
```

## Testing

### Test Razorpay Integration

1. Start the backend server:
```bash
cd backend && npm run dev
```

2. Start the frontend:
```bash
cd my-project && npm run dev
```

3. Go to checkout page and select 'Razorpay' payment method

### Test with Razorpay Test Credentials

Use these for testing:
- **Test Card**: 4111 1111 1111 1111
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **OTP**: 123456 (for UPI)

## Troubleshooting

### Common Issues

#### 1. **404 Error: "Request failed with status code 404"**

**Symptoms**: Getting 404 error when trying to make Razorpay payment.

**Causes & Solutions**:

**a) Backend server not running**
```bash
# Check if backend is running
curl http://localhost:5000/api/test

# If not running, start it
cd backend && npm run dev
```

**b) Missing Razorpay credentials**
- Run the setup script: `./setup-razorpay.sh`
- Or manually add to `.env`:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret
```
- Restart backend server after adding credentials

**c) Server startup error**
- Check backend console for Razorpay initialization errors
- Look for messages like "⚠️ Razorpay credentials not found"
- Fix credentials and restart server

#### 2. **"Payment gateway not configured"**

**Solution**: 
- Razorpay credentials are missing or invalid
- Run `./setup-razorpay.sh` to configure
- Check that credentials are correct in `.env`

#### 3. **"Razorpay modal not loading"**

**Causes**:
- Internet connection issues
- Razorpay script failed to load
- Browser blocking popups

**Solutions**:
- Check internet connection
- Allow popups for your domain
- Try in incognito mode
- Check browser console for script loading errors

#### 4. **Payment verification failed**

**Symptoms**: Payment succeeds but verification fails.

**Causes**:
- Invalid Razorpay secret key
- Network issues during verification
- Webhook signature mismatch

**Solutions**:
- Verify `RAZORPAY_KEY_SECRET` is correct
- Check network connectivity
- Contact Razorpay support if signature issues persist

### Debug Steps

1. **Check backend server**:
```bash
curl http://localhost:5000/api/payments/test
```

2. **Check Razorpay configuration**:
```bash
curl http://localhost:5000/api/payments/config
```

3. **Check server logs** for initialization messages:
```
✅ Razorpay initialized successfully
⚠️ Razorpay credentials not found
❌ Failed to initialize Razorpay
```

4. **Browser debugging**:
- Open browser developer tools
- Check Network tab for failed requests
- Check Console for JavaScript errors

### Still Having Issues?

1. **Verify environment variables**:
```bash
# In backend directory
node -e "console.log('Key ID:', process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set')"
```

2. **Test API endpoints directly**:
```bash
# Test payments config
curl -X GET http://localhost:5000/api/payments/config

# Test with auth token (replace TOKEN with actual JWT)
curl -X GET http://localhost:5000/api/payments/test \
  -H "Authorization: Bearer TOKEN"
```

3. **Check server startup logs** for any Razorpay-related errors

## Security Features

1. **Signature Verification**: All payments are verified using Razorpay signatures
2. **Order Validation**: Orders are validated before payment processing
3. **Authentication**: Only authenticated users can make payments
4. **Error Handling**: Comprehensive error handling for failed payments

## Production Deployment

### Pre-deployment Checklist

- [ ] Add production Razorpay credentials
- [ ] Update CORS origins for production domain
- [ ] Test with real payment methods
- [ ] Set up webhook endpoints for payment confirmations
- [ ] Enable Razorpay production mode

### Environment Variables for Production

```env
NODE_ENV=production
RAZORPAY_KEY_ID=rzp_live_your_production_key
RAZORPAY_KEY_SECRET=your_production_secret
```

## Support

For Razorpay-specific issues:
- [Razorpay Documentation](https://docs.razorpay.com/)
- [Razorpay Support](https://razorpay.com/support/)

For application-specific issues:
- Check server logs for detailed error messages
- Verify database connectivity
- Ensure all environment variables are set correctly
