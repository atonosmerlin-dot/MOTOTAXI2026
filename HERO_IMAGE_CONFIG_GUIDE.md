# MotoPoint Hero Image Configuration - Implementation Guide

## Overview
Successfully implemented a hero image configuration system for the MotoPoint homepage that allows administrators to upload and manage the hero image displayed on the landing page.

## Completed Components

### 1. **Database Setup**
- **File:** `supabase/migrations/20260103_add_site_config.sql`
- **Purpose:** Creates the `site_config` table to store application configuration
- **Key Features:**
  - Stores key-value pairs (hero_image_url is the primary key)
  - RLS policies for admin updates and public reads
  - Default value: placeholder image URL

- **File:** `supabase/migrations/20260103_create_site_config_storage.sql`
- **Purpose:** Creates the Supabase Storage bucket for image uploads
- **Key Features:**
  - Public bucket named 'site-config'
  - RLS policies for upload, read, update, and delete operations
  - Supports authenticated users uploading files

### 2. **Homepage (Index.tsx)**
- **Location:** `src/pages/Index.tsx`
- **Features:**
  - Fetches `hero_image_url` from `site_config` table on component mount
  - Displays hero image with error fallback
  - Responsive grid layout with text content on left, image on right
  - Two main CTA buttons:
    - "Escanear QR Code" (Scan QR) → navigates to `/scan`
    - "Sou Motorista" (I'm a Driver) → navigates to `/driver/login`
  - Dark theme with yellow accent color (#fbbf24)

### 3. **Admin Panel Settings Tab**
- **Location:** `src/pages/motopoint/admin/AdminDashboard.tsx`
- **Changes Made:**
  1. **Added new state variables:**
     - `activeTab`: now includes 'settings' option
     - `heroImageUrl`: stores the image URL
     - `heroImageFile`: stores uploaded file
     - `heroImagePreview`: shows preview of selected image
     - `savingHeroImage`: loading state during save

  2. **New Tab:** "Configurações" (Settings)
     - Displays current hero image
     - "Editar" button to open configuration modal

  3. **Hero Image Modal:**
     - Two input methods:
       - **URL Input:** Direct text input for image URLs
       - **File Upload:** Drag-and-drop or click-to-select interface
     - File validation:
       - Accepted formats: JPEG, PNG, GIF
       - Max file size: 5MB
     - Preview image before saving
     - Save and Cancel buttons

  4. **New Functions:**
     - `handleHeroImageFileChange()`: Validates and processes uploaded files
     - `handleSaveHeroImage()`: Saves image to Supabase and updates site_config
     - Auto-loads current hero image URL on component mount

### 4. **Icons Added**
- **New Lucide Icons:**
  - `Settings` - for the settings tab
  - `Edit2` - for edit button
  - `Upload` - for file upload area

## User Workflow

### For Admin Users:
1. Navigate to Admin Dashboard
2. Click the "Configurações" (Settings) tab
3. Click "Editar" button on the Hero Image section
4. Choose one of two methods:
   - **URL Method:** Paste an image URL (JPEG, PNG, or GIF)
   - **File Upload:** Click/drag to upload from computer
5. Preview the image
6. Click "Salvar" to save changes
7. Image is saved to Supabase Storage (if file uploaded) or stored directly as URL
8. Homepage automatically displays the new image

### For Visitors:
1. Landing page fetches hero image from database
2. Hero image displays with the text content
3. Can click CTA buttons to access client or driver features

## Technical Implementation Details

### Image Upload Flow:
```
File Selected → Validation (type/size) → Preview displayed 
→ User clicks Save → Upload to Supabase Storage (if file) 
→ Get public URL → Update site_config table 
→ Modal closes → Success toast
```

### Image Display Flow:
```
Index.tsx mounts → Fetch hero_image_url from site_config 
→ Set heroImage state → Render <img> tag 
→ If error → Show fallback UI
```

### Supported Image Formats:
- **JPEG** (image/jpeg)
- **PNG** (image/png)  
- **GIF** (image/gif)
- Maximum file size: 5MB

## Database Schema

### `public.site_config` Table:
```sql
id          UUID PRIMARY KEY
key         TEXT UNIQUE NOT NULL
value       TEXT
updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### `storage.buckets` - 'site-config':
```
Public bucket for storing hero images
RLS policies allow:
- Public: SELECT
- Authenticated: INSERT, UPDATE, DELETE
```

## Error Handling

### Frontend:
- Invalid file type → Toast: "Apenas JPEG, PNG e GIF são aceitos"
- File too large → Toast: "Arquivo deve ser menor que 5MB"
- Save failure → Toast with error message
- Missing URL/File → Button disabled, validation message

### Backend:
- Supabase Storage upload errors caught and displayed
- Database update errors caught and displayed
- Try-catch blocks with console logging for debugging

## Styling & UI

### Settings Tab Panel:
- Card layout with rounded corners (rounded-2xl)
- Border and shadow for depth
- Image preview full width
- Blue primary button for edit action

### Hero Image Modal:
- Centered modal with semi-transparent backdrop
- Rounded card with border
- Form with proper spacing and typography
- Drag-and-drop file input with hover effects
- Separator between URL and file upload sections
- Action buttons (Cancel, Save) with proper disabled states

### Responsive Design:
- Settings tab content responsive on all screen sizes
- Modal responsive with padding on mobile
- Image preview scales with container

## Deployment Notes

### Prerequisites:
1. Supabase project must have RLS enabled
2. Storage bucket 'site-config' must be created
3. Migrations must be applied to database

### Environment Variables:
- Uses existing `VITE_SUPABASE_FUNCTIONS_URL` (already configured)
- Uses existing Supabase client configuration

### Build Steps:
```bash
npm run build
# Deploy to Cloudflare Pages or preferred hosting
```

## Testing Checklist

- [ ] Admin can navigate to Settings tab
- [ ] Hero Image modal opens when clicking Edit
- [ ] URL input accepts image URLs
- [ ] File input accepts JPEG, PNG, GIF files
- [ ] File size validation works (>5MB rejected)
- [ ] Image preview displays before saving
- [ ] Save button works with URL input
- [ ] Save button works with file upload
- [ ] site_config table is updated with new image URL
- [ ] Homepage displays the new hero image
- [ ] Image error fallback works if URL is invalid
- [ ] Multiple saves work without issues
- [ ] Modal closes after successful save
- [ ] Toast notifications display for success/errors

## Future Enhancements

1. **Image Cropping:** Add ability to crop images before upload
2. **Multiple Hero Images:** Support carousel of hero images
3. **Schedule:** Schedule hero image changes for specific dates/times
4. **Analytics:** Track hero image performance metrics
5. **Image Optimization:** Auto-compress images on upload
6. **CDN:** Integrate with CDN for faster image delivery
7. **Admin Approval:** Add workflow for image change approvals
8. **Version History:** Track previous hero images and allow rollback

## Files Modified/Created

### Created:
- `supabase/migrations/20260103_add_site_config.sql` - Site config table
- `supabase/migrations/20260103_create_site_config_storage.sql` - Storage setup

### Modified:
- `src/pages/Index.tsx` - Homepage with hero image fetching
- `src/pages/motopoint/admin/AdminDashboard.tsx` - Settings tab and hero image modal

### No Changes Required:
- Database connection already working
- Supabase client already configured
- Authentication system already in place
- RLS policies properly configured

## Troubleshooting

### Hero image not displaying:
1. Check browser console for errors
2. Verify image URL is accessible
3. Check CORS settings if using external image hosting
4. Ensure site_config table has the correct hero_image_url entry

### Upload fails with "Method Not Allowed":
1. Verify storage bucket 'site-config' exists
2. Check RLS policies on storage.objects table
3. Ensure user is authenticated (admin)

### Modal won't close:
1. Check console for JavaScript errors
2. Verify handleSaveHeroImage is completing
3. Ensure savingHeroImage state is set to false

### Image preview not showing:
1. Verify file was selected properly
2. Check file size (must be < 5MB)
3. Check file type (must be JPEG, PNG, or GIF)
