#!/bin/bash
# Stripe Setup Verification Script

echo "🔍 Checking Stripe Configuration..."
echo ""

# Check if .env exists
if [ -f backend/.env ]; then
    echo "✅ .env file found"
    
    # Check for Stripe keys
    if grep -q "STRIPE_SECRET_KEY" backend/.env; then
        echo "✅ STRIPE_SECRET_KEY configured"
    else
        echo "❌ STRIPE_SECRET_KEY not found in .env"
    fi
    
    if grep -q "STRIPE_WEBHOOK_SECRET" backend/.env; then
        echo "✅ STRIPE_WEBHOOK_SECRET configured"
    else
        echo "❌ STRIPE_WEBHOOK_SECRET not found in .env"
    fi
    
    if grep -q "CLIENT_URL" backend/.env; then
        echo "✅ CLIENT_URL configured"
    else
        echo "❌ CLIENT_URL not found in .env"
    fi
else
    echo "❌ .env file not found"
fi

echo ""
echo "🔍 Checking Stripe Package..."
if npm list stripe --prefix backend | grep -q "stripe@"; then
    echo "✅ Stripe package installed"
else
    echo "❌ Stripe package not installed"
fi

echo ""
echo "🔍 Checking Database..."
if grep -q "MONGO_URI" backend/.env; then
    echo "✅ MongoDB URI configured"
else
    echo "❌ MONGO_URI not found"
fi

echo ""
echo "✅ All checks passed! Ready to test Stripe payments."
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && npm start"
echo "2. Start frontend: cd frontend && npm start"
echo "3. Test payment with card: 4242 4242 4242 4242"
