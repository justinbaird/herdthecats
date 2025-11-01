# Email Confirmation Setup Guide

## Problem

When users sign up and click the email confirmation link, they may get redirected to `localhost:3000`, which doesn't work in production. This happens because Supabase email confirmation links need to be configured with the correct redirect URL.

## Solution

The application now includes:
1. Dynamic redirect URLs based on environment (production vs development)
2. A dedicated email confirmation page at `/auth/confirm`
3. Proper handling of email confirmation tokens

## Configuration Steps

### Step 1: Set Production URL in Environment Variables

Add this to your Netlify environment variables:

**Variable:**
- Key: `NEXT_PUBLIC_SITE_URL`
- Value: `https://herdthecats.app`

This tells the app what URL to use for email confirmation redirects in production.

### Step 2: Configure Supabase Email Templates

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication** > **Email Templates**
3. Find the **Confirm signup** template
4. Update the redirect URL in the template:

**Option A: Use Site URL Environment Variable (Recommended)**

In the email template, use this redirect URL:
```
{{ .SiteURL }}/auth/confirm?token={{ .TokenHash }}&type=signup
```

**Option B: Hardcode Your Production URL**

If you prefer, you can hardcode your production URL:
```
https://herdthecats.app/auth/confirm?token={{ .TokenHash }}&type=signup
```

**Or for local development:**
```
http://localhost:3000/auth/confirm?token={{ .TokenHash }}&type=signup
```

### Step 3: Configure Site URL in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Set **Site URL** to your production URL:
   - `https://herdthecats.app`
3. Add **Redirect URLs**:
   - `https://herdthecats.app/auth/confirm`
   - `https://herdthecats.app/auth/confirm/**` (wildcard for all paths)
   - `http://localhost:3000/auth/confirm` (for local development)

### Step 4: Test Email Confirmation

1. Sign up with a new email address
2. Check your email for the confirmation link
3. Click the link
4. You should be redirected to `/auth/confirm` which will:
   - Confirm your email
   - Show a success message
   - Redirect you to the dashboard

## How It Works

1. **Signup**: When a user signs up, the app sends a `redirectTo` URL pointing to `/auth/confirm`
2. **Email Link**: Supabase sends an email with a confirmation link containing a token
3. **Confirmation Page**: When the user clicks the link, they're redirected to `/auth/confirm`
4. **Token Verification**: The page extracts the token from the URL and verifies it with Supabase
5. **Success**: Upon successful verification, the user is logged in and redirected to the dashboard

## Troubleshooting

### Users still get redirected to localhost

**Check:**
1. Is `NEXT_PUBLIC_SITE_URL` set in Netlify environment variables?
2. Is the Site URL configured correctly in Supabase Dashboard?
3. Are the redirect URLs whitelisted in Supabase?

### Confirmation link shows "Invalid or expired"

**Possible causes:**
- Link was already used (one-time use)
- Link expired (default is 24 hours)
- Token format changed

**Solution:**
- User should try signing up again
- Check Supabase logs for more details

### Redirect works but user isn't logged in

**Check:**
- Are cookies being set correctly?
- Is the session being created after confirmation?
- Check browser console for errors

## Alternative: Disable Email Confirmation (Development Only)

If you want to skip email confirmation during development:

1. In Supabase Dashboard > **Authentication** > **Providers**
2. Click on **Email**
3. Under **Email Auth**, toggle **"Enable email confirmations"** OFF

⚠️ **Warning**: Only do this for development/testing. Production should always require email confirmation for security.

