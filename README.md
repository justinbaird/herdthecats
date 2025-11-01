# Herd the Cats

A web application for musicians to create networks, post gigs, and connect with other musicians. Built with Next.js, Supabase, and deployed on Netlify.

## Features

- **Musician Profiles**: Create profiles with name, email, and instruments played
- **Network Management**: Build your network of musicians you want to play with
- **Gig Posting**: Post gigs with details (time, location, required instruments)
- **Gig Claiming**: First-come-first-served system for claiming gig slots
- **Admin Panel**: Manage users, reset passwords, send invitations
- **Instrument Tags**: Standardized instrument list to avoid duplicates

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Hosting**: Netlify
- **Deployment**: Netlify Functions

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Netlify account

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd herdthecats
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_admin_functions.sql`
3. Get your project URL and anon key from Settings > API
4. Get your service role key from Settings > API (keep this secret!)

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Set Up Admin User

To create an admin user, you'll need to update the user's metadata in Supabase:

1. Go to Supabase Dashboard > Authentication > Users
2. Find your user or create one
3. Click on the user
4. Under "User Metadata", add:
   ```json
   {
     "role": "admin"
   }
   ```

Alternatively, you can use the Supabase SQL editor:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('role', 'admin')
WHERE email = 'your-admin-email@example.com';
```

### 5. Configure Email (Optional)

Supabase has built-in email templates for:
- Email confirmation
- Password reset
- Magic links

Configure these in Supabase Dashboard > Authentication > Email Templates.

For gig notifications, you can:
- Set up Supabase Edge Functions for custom email sending
- Use webhooks to trigger external email services
- Configure Supabase Realtime to listen for new gigs

### 6. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

## Deployment to Netlify

### Option 1: Deploy via Netlify Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://netlify.com) and click "New site from Git"
3. Connect your repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variables in Site settings > Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for admin functions)
6. Deploy!

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## Database Schema

### Tables

- **musicians**: Stores musician profiles (name, email, instruments)
- **networks**: Stores musician network relationships
- **gigs**: Stores gig information (title, location, datetime, required instruments)
- **gig_applications**: Stores applications for gig slots

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- Users can read their own data
- Users can create/update their own data
- Admins have full access

## Available Instruments

The following instruments are available as tags:
- Drums
- Bass Guitar
- Double Bass
- Piano
- Electric Piano
- Electric Guitar
- Acoustic Guitar
- Baritone Sax
- Tenor Sax
- Alto Sax
- Soprano Sax
- Harmonica
- Flute
- Trumpet
- Trombone
- Vocals

## Project Structure

```
herdthecats/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin panel
│   ├── dashboard/         # User dashboard
│   ├── gigs/              # Gig management
│   ├── login/             # Login page
│   ├── network/           # Network management
│   ├── profile/           # Profile management
│   └── signup/            # Signup page
├── components/            # React components
├── lib/                   # Utility functions
│   └── supabase/         # Supabase client setup
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
└── public/               # Static assets
```

## Features in Detail

### Network System
- Each musician can build their own network
- Search for musicians by email
- Add/remove musicians from your network

### Gig System
- Post gigs with required instruments
- Network members are notified (email setup required)
- First-come-first-served claiming system
- Gig posters can manually accept applications

### Admin Features
- View all users
- Reset user passwords (requires service role key)
- Send invitations (requires service role key)
- Delete users (requires service role key)

## Email Notifications

Currently, email notifications are set up to work with Supabase's built-in email system. For custom gig notifications:

1. Set up a Supabase Edge Function
2. Create a webhook in Supabase Dashboard
3. Use a service like Resend or SendGrid

Example Edge Function structure would listen for new gigs and send emails to network members.

## Troubleshooting

### RLS Policy Errors
If you get permission errors, check:
1. User is authenticated
2. RLS policies are correctly set up
3. User has the necessary permissions

### Admin Functions Not Working
Make sure:
1. User has `role: 'admin'` in metadata
2. `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables
3. Service role key has admin permissions

### Email Not Sending
1. Check Supabase email settings
2. Verify SMTP configuration in Supabase
3. Check email templates are configured
4. For custom emails, set up Edge Functions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
