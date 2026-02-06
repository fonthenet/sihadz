#!/bin/bash

# DZDoc iOS Development Script
# This script sets up the iOS app for development with live reload

echo "🚀 Starting DZDoc iOS Development Mode"
echo ""

# Check if .next directory exists
if [ ! -d ".next" ]; then
  echo "⚠️  .next directory not found. Running build first..."
  npm run build
fi

# Sync Capacitor
echo "📱 Syncing Capacitor with iOS..."
npx cap sync ios

# Get local IP address
IP=$(ifconfig | grep "inet " | grep -Fv 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. In another terminal, run: npm run dev"
echo "2. Open Xcode: npx cap open ios"
echo "3. In capacitor.config.ts, uncomment the server.url line and set it to: http://$IP:3000"
echo "4. Run the app in Xcode simulator or device"
echo ""
echo "💡 Your app will now live-reload when you make changes!"
echo ""
