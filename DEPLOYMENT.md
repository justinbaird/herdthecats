# Deployment Guide for Netlify

## Quick Deploy via Netlify Dashboard

### Step 1: Push to GitHub (or GitLab/Bitbucket)

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Connect to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your `herdthecats` repository

### Step 3: Configure Build Settings

Netlify should auto-detect Next.js, but verify these settings:

- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** 18 (or 20)

### Step 4: Add Environment Variables

**IMPORTANT SECURITY NOTE:**
- `NEXT_PUBLIC_*` variables are safe to expose (they're used in the browser)
- `SUPABASE_SERVICE_ROLE_KEY` is SECRET - never commit this to Git or share it publicly
- Netlify automatically encrypts all environment variables at rest

In Netlify Dashboard → Site settings → Environment variables, add:

1. Click "Add a variable"
2. Add each variable (Netlify will encrypt them automatically):

   **Variable 1:**
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://onawdmmargogryrfmqgu.supabase.co`
   
   **Variable 2:**
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uYXdkbW1hcmdvZ3J5cmZtcWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NzM0MTEsImV4cCI6MjA3NzU0OTQxMX0.YzrwETJMboBmMsbuzI7DGYCajXaD2PNbNwgycEPPU4c`
   
   **Variable 3 (SECRET):**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uYXdkbW1hcmdvZ3J5cmZtcWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk3MzQxMSwiZXhwIjoyMDc3NTQ5NDExfQ.2i8yxbB1lYeLY0HWlONZ8wv6vpW-DKkpN9Wb-MW6s5U`
   - ⚠️ This key has admin privileges - keep it secret!

3. Click "Save" after adding each variable

### Step 5: Deploy

1. Click **"Deploy site"**
2. Wait for the build to complete
3. Your site will be live at `https://your-site-name.netlify.app`

---

## Deploy via Netlify CLI

If you prefer using the command line:

```bash
# Login to Netlify
netlify login

# Initialize the site (if first time)
netlify init

# Deploy to production
netlify deploy --prod
```

---

## Post-Deployment Checklist

- [ ] Verify the site is accessible
- [ ] Test signup/login functionality
- [ ] Test profile creation
- [ ] Test gig posting
- [ ] Verify environment variables are set correctly
- [ ] Check Netlify build logs for any errors

---

## Custom Domain (Optional)

1. In Netlify Dashboard → Domain settings
2. Click **"Add custom domain"**
3. Follow the DNS configuration instructions

---

## Troubleshooting

### Build Fails
- Check build logs in Netlify Dashboard
- Verify all environment variables are set
- Ensure Node.js version matches (18+)

### API Routes Not Working
- Verify `@netlify/plugin-nextjs` is installed
- Check that environment variables are set correctly

### Authentication Issues
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Verify RLS policies are set correctly

