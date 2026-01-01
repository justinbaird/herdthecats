import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/media/upload - Upload media file to Supabase Storage
// NOTE: Requires a Supabase Storage bucket named "gig-media" to be created
// with public access enabled for reading. The bucket should allow authenticated uploads.
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const mediaType = formData.get('mediaType') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!mediaType || !['photo', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid media type. Must be "photo" or "video"' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileType = file.type
    const isPhoto = fileType.startsWith('image/')
    const isVideo = fileType.startsWith('video/')

    if (mediaType === 'photo' && !isPhoto) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    if (mediaType === 'video' && !isVideo) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = fileName

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gig-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gig-media')
      .getPublicUrl(filePath)

    return NextResponse.json({
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      media_type: mediaType,
    })
  } catch (error: any) {
    console.error('Error uploading media:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

