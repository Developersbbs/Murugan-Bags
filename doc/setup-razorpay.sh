#!/bin/bash

# Razorpay Setup Script for SBBS E-commerce
# This script helps you configure Razorpay credentials for your application

echo "🔧 SBBS E-commerce - Razorpay Setup"
echo "===================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "📝 .env file already exists"
fi

# Check if Razorpay credentials are already set
if grep -q "RAZORPAY_KEY_ID=your_razorpay_key_id_here" .env; then
    echo ""
    echo "🔑 Razorpay credentials not configured yet."
    echo ""
    echo "To set up Razorpay:"
    echo "1. Go to https://dashboard.razorpay.com/"
    echo "2. Sign up or log in to your account"
    echo "3. Go to Settings → API Keys"
    echo "4. Generate API Key ID and Secret"
    echo "5. Copy the values below:"
    echo ""

    # Prompt for Razorpay credentials
    read -p "Enter your Razorpay Key ID: " razorpay_key_id
    read -p "Enter your Razorpay Key Secret: " razorpay_key_secret

    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/RAZORPAY_KEY_ID=.*/RAZORPAY_KEY_ID=$razorpay_key_id/" .env
        sed -i '' "s/RAZORPAY_KEY_SECRET=.*/RAZORPAY_KEY_SECRET=$razorpay_key_secret/" .env
    else
        # Linux
        sed -i "s/RAZORPAY_KEY_ID=.*/RAZORPAY_KEY_ID=$razorpay_key_id/" .env
        sed -i "s/RAZORPAY_KEY_SECRET=.*/RAZORPAY_KEY_SECRET=$razorpay_key_secret/" .env
    fi

    echo ""
    echo "✅ Razorpay credentials configured successfully!"
    echo ""
    echo "🔄 Please restart your backend server for changes to take effect:"
    echo "   cd backend && npm run dev"
    echo ""
    echo "🧪 Test the integration:"
    echo "   - Start the frontend: cd my-project && npm run dev"
    echo "   - Go to checkout page and select 'Razorpay' payment method"
else
    echo "✅ Razorpay credentials are already configured!"
fi

echo ""
echo "📚 For more information, see RAZORPAY_SETUP_GUIDE.md"
echo ""
echo "🚀 Happy coding!"
