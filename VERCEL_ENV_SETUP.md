# Vercel Environment Variables Setup

Your project has been deployed to Vercel! 

**Production URL**: https://unbound-hackathon-fixed.vercel.app

## Setting Up Environment Variables

To add the environment variables to your Vercel project:

1. **Open Vercel Dashboard**: 
   Visit https://vercel.com/simonstrumses-projects/unbound-hackathon-fixed/settings/environment-variables

2. **Add the following environment variables**:

   ### VITE_SUPABASE_URL
   - **Value**: `https://fzugdofbafllsfpwuawl.supabase.co`
   - **Target**: Select all (Production, Preview, Development)

   ### VITE_SUPABASE_ANON_KEY
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dWdkb2ZiYWZsbHNmcHd1YXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzIxMDUsImV4cCI6MjA0NzYwODEwNX0.sA1AkQGnIaICjQ3BqBRvQm8xflNSaYDnV33pYU7PgyA`
   - **Target**: Select all (Production, Preview, Development)

   ### OPENAI_API_KEY
   - **Value**: `[Your OpenAI API Key]`
   - **Target**: Select all (Production, Preview, Development)

3. **Redeploy**: After adding all environment variables, you'll need to redeploy the project for the changes to take effect.

## Alternative: Using Vercel CLI

If you prefer using the CLI, you can use these commands:

```bash
# Add environment variables
echo "https://fzugdofbafllsfpwuawl.supabase.co" | vercel env add VITE_SUPABASE_URL production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dWdkb2ZiYWZsbHNmcHd1YXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzIxMDUsImV4cCI6MjA0NzYwODEwNX0.sA1AkQGnIaICjQ3BqBRvQm8xflNSaYDnV33pYU7PgyA" | vercel env add VITE_SUPABASE_ANON_KEY production
echo "[Your OpenAI API Key]" | vercel env add OPENAI_API_KEY production

# Then redeploy
vercel --prod
```

## Project URLs

- **Production**: https://unbound-hackathon-fixed.vercel.app
- **Latest Preview**: https://unbound-hackathon-fixed-3pkldfmkl-simonstrumses-projects.vercel.app
- **Dashboard**: https://vercel.com/simonstrumses-projects/unbound-hackathon-fixed