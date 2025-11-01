# Resend Email Setup Guide

This guide will walk you through setting up Resend to send calendar invitation emails when musicians are accepted for gigs.

## Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Sign Up" (or "Get Started")
3. Create an account (free tier includes 3,000 emails/month and 100 emails/day)

## Step 2: Verify Your Domain

To send emails from `gigs@herdthecats.app`, you need to verify the domain:

1. In your Resend dashboard, go to **Domains** (left sidebar)
2. Click **Add Domain**
3. Enter: `herdthecats.app`
4. Click **Add Domain**

Resend will provide DNS records you need to add to your domain:

### DNS Records to Add

You'll need to add these records in your domain registrar (where you bought `herdthecats.app`):

1. **TXT Record for Domain Verification:**
   - Name: `@` (or root domain)
   - Value: (provided by Resend, looks like `resend-verification=...`)

2. **DKIM Records** (for email authentication):
   - Name: (provided by Resend, e.g., `resend._domainkey`)
   - Value: (provided by Resend, a long string)

3. **SPF Record** (if you don't have one):
   - Name: `@`
   - Value: `v=spf1 include:resend.com ~all`

4. **DMARC Record** (optional but recommended):
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@herdthecats.app`

### Adding DNS Records

The exact steps depend on your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), but generally:

1. Log into your domain registrar
2. Go to DNS settings / DNS management
3. Add each record provided by Resend
4. Wait 5-60 minutes for DNS propagation

5. In Resend, click **Verify Domain** once all records are added

## Step 3: Get Your API Key

1. In Resend dashboard, go to **API Keys** (left sidebar)
2. Click **Create API Key**
3. Give it a name (e.g., "Herd the Cats Production")
4. Select permissions: **Sending access**
5. Click **Create**
6. **Copy the API key immediately** - you won't be able to see it again!

## Step 4: Set Environment Variables

### For Local Development (.env.local)

1. In your project root, open `.env.local` (or create it if it doesn't exist)
2. Add these lines:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=gigs@herdthecats.app
```

3. Replace `re_your_api_key_here` with your actual API key from Step 3

### For Netlify Production

1. Go to your Netlify dashboard: [app.netlify.com](https://app.netlify.com)
2. Select your site (herdthecats)
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add each variable:

   **Variable 1:**
   - Key: `RESEND_API_KEY`
   - Value: `re_your_api_key_here` (your actual API key)
   - Scope: All deploys (or Production)

   **Variable 2:**
   - Key: `RESEND_FROM_EMAIL`
   - Value: `gigs@herdthecats.app`
   - Scope: All deploys (or Production)

6. Click **Save** for each variable

## Step 5: Test the Setup

### Test Locally

1. Make sure your `.env.local` has the Resend variables
2. Restart your dev server:
   ```bash
   npm run dev
   ```
3. Accept a gig application - check the browser console and terminal for any errors

### Test in Production

1. After adding environment variables in Netlify, trigger a new deploy
2. Accept a gig application on the live site
3. Check if the musician receives the email

## Troubleshooting

### Emails Not Sending

1. **Check API Key:**
   - Verify `RESEND_API_KEY` is set correctly in environment variables
   - Make sure there are no extra spaces or quotes

2. **Check Domain Verification:**
   - In Resend dashboard → Domains, verify the domain shows as "Verified"
   - If not verified, check DNS records are correctly added

3. **Check Resend Dashboard:**
   - Go to **Logs** in Resend dashboard
   - Check for any error messages about failed sends

4. **Check Application Logs:**
   - In Netlify, check deploy logs and function logs
   - Look for error messages about email sending

### Common Errors

- **"Domain not verified"**: Complete Step 2 (domain verification)
- **"Invalid API key"**: Check that your API key is correct in environment variables
- **"Rate limit exceeded"**: Free tier has limits (100 emails/day). Upgrade if needed.

## Alternative: Use Resend Test Domain (Quick Testing)

If you want to test quickly without verifying a domain:

1. In Resend dashboard → Domains
2. Use the test domain (e.g., `onboarding@resend.dev`)
3. Set `RESEND_FROM_EMAIL=onboarding@resend.dev` in your environment variables
4. **Note**: Test domains can only send to verified email addresses in your Resend account

## Next Steps

Once setup is complete:
- Calendar invitation emails will automatically send when gig posters accept applications
- Musicians will receive a nicely formatted email with the gig details
- The .ics calendar file will be attached for easy calendar integration

## Support

- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Resend Support: Available in your Resend dashboard

