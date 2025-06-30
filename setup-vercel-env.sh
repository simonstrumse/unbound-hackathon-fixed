#!/bin/bash

# This script sets up environment variables for Vercel deployment

echo "Setting up Vercel environment variables..."

# Set environment variables for both preview and production
vercel env add VITE_SUPABASE_URL preview production
vercel env add VITE_SUPABASE_ANON_KEY preview production  
vercel env add OPENAI_API_KEY preview production

echo "Environment variables setup complete!"
echo "Please enter the values when prompted by Vercel CLI"