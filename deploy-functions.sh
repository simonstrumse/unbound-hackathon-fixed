#!/bin/bash

# Deploy Edge Functions to Supabase

echo "Deploying Edge Functions to Supabase..."

# Check if logged in
npx supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Not logged in to Supabase. Please run: npx supabase login"
    exit 1
fi

# Deploy generate-opening-scene function
echo ""
echo "1. Deploying generate-opening-scene function..."
npx supabase functions deploy generate-opening-scene

if [ $? -eq 0 ]; then
    echo "✓ Successfully deployed generate-opening-scene function!"
else
    echo "✗ Failed to deploy generate-opening-scene function."
    exit 1
fi

# Deploy continue-conversation function
echo ""
echo "2. Deploying continue-conversation function..."
npx supabase functions deploy continue-conversation

if [ $? -eq 0 ]; then
    echo "✓ Successfully deployed continue-conversation function!"
else
    echo "✗ Failed to deploy continue-conversation function."
    exit 1
fi

# Deploy generate-story-summary function if it exists
if [ -d "supabase/functions/generate-story-summary" ]; then
    echo ""
    echo "3. Deploying generate-story-summary function..."
    npx supabase functions deploy generate-story-summary
    
    if [ $? -eq 0 ]; then
        echo "✓ Successfully deployed generate-story-summary function!"
    else
        echo "✗ Failed to deploy generate-story-summary function."
    fi
fi

echo ""
echo "All functions deployed successfully!"
echo ""
echo "Important reminders:"
echo "1. Make sure the OPENAI_API_KEY secret is set in your Supabase project:"
echo "   npx supabase secrets set OPENAI_API_KEY=<your-api-key>"
echo ""
echo "2. Your functions are available at:"
echo "   https://<project-ref>.supabase.co/functions/v1/generate-opening-scene"
echo "   https://<project-ref>.supabase.co/functions/v1/continue-conversation"
echo "   https://<project-ref>.supabase.co/functions/v1/generate-story-summary"