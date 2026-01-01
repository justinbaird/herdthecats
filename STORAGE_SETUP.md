# Supabase Storage Setup

To enable media uploads, you need to create a Supabase Storage bucket.

## Steps

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name the bucket: `gig-media`
5. Make it **Public** (so uploaded media can be viewed)
6. Click **Create bucket**

## Storage Policies

The bucket should allow:
- **Authenticated users** to upload files
- **Public** read access for viewing media

You can set up policies in the Storage section under Policies for the `gig-media` bucket.

