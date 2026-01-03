# Hero Image Configuration System - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────┐      ┌──────────────────────────┐    │
│  │   HOMEPAGE (Index.tsx)   │      │  ADMIN PANEL             │    │
│  ├──────────────────────────┤      │  (AdminDashboard.tsx)    │    │
│  │ - Fetch hero image URL   │      ├──────────────────────────┤    │
│  │ - Display image in hero  │      │ Settings Tab:            │    │
│  │ - Error fallback UI      │      │ ├─ Show current image    │    │
│  │ - Auto-update on change  │      │ ├─ Edit button           │    │
│  │                          │      │ └─ Open modal            │    │
│  │ Triggered by:            │      │                          │    │
│  │ → Page visit             │      │ Modal Components:        │    │
│  │ → Any admin update       │      │ ├─ URL input field       │    │
│  └──────────────────────────┘      │ ├─ File upload area      │    │
│           △                         │ ├─ Image preview         │    │
│           │                         │ └─ Save/Cancel buttons   │    │
│           │ Display                 │                          │    │
│           │ Image                   │ Event Handlers:          │    │
│           │                         │ ├─ File change (validate)│    │
│           │                         │ ├─ Save (upload/update)  │    │
│           │                         │ └─ Load current (on init)│    │
│           │                         └──────────────────────────┘    │
│           │                                    │                     │
└───────────┼────────────────────────────────────┼─────────────────────┘
            │                                    │
            │ Fetch                              │ Update
            │                                    │
┌───────────┼────────────────────────────────────▼─────────────────────┐
│           │              APPLICATION LOGIC LAYER                      │
│           │                                                           │
│  ┌────────▼──────────────────────────────────────────────────────┐  │
│  │              Supabase Client Integration                      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ Functions:                                                    │  │
│  │ • supabase.from('site_config').select()  [READ]             │  │
│  │ • supabase.from('site_config').upsert()  [WRITE/UPDATE]     │  │
│  │ • supabase.storage.from('site-config')   [FILE OPERATIONS]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Error Handling:                                                      │
│  • Try-catch blocks with user-friendly messages                      │
│  • Toast notifications for success/failure                           │
│  • Image error fallback UI                                           │
│                                                                       │
└───────────┬────────────────────────────────────┬─────────────────────┘
            │                                    │
            │                                    │ Upload
            │                                    │ Files
            │                                    │
            │                                    ▼
┌───────────┼────────────────────────────────────┬─────────────────────┐
│           │         SUPABASE BACKEND LAYER     │                     │
│           │                                    │                     │
│  ┌────────▼────────────────┐  ┌───────────────▼────────────────────┐│
│  │ PostgreSQL Database     │  │  Storage Bucket                    ││
│  ├────────────────────────┤  ├────────────────────────────────────┤│
│  │ Table: site_config     │  │ Bucket: site-config                ││
│  │ ├─ id (UUID)           │  │ Type: Public                       ││
│  │ ├─ key (TEXT, UNIQUE)  │  │ RLS Policies: Enabled              ││
│  │ ├─ value (TEXT)        │  │ Policies:                          ││
│  │ └─ updated_at          │  │ ├─ Public read                     ││
│  │                        │  │ ├─ Authenticated upload            ││
│  │ Data:                  │  │ └─ Delete by authenticated users   ││
│  │ └─ hero_image_url: URL │  │                                    ││
│  │                        │  │ Files:                             ││
│  │ RLS Policies:          │  │ └─ hero-{timestamp}.{ext}          ││
│  │ ├─ Admin: UPDATE       │  │    (e.g., hero-1704891234.jpg)     ││
│  │ └─ Public: SELECT      │  │                                    ││
│  └────────────────────────┘  └────────────────────────────────────┘│
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Flow 1: Display Hero Image on Homepage
```
User visits homepage
        ↓
Index.tsx component mounts
        ↓
useEffect triggered
        ↓
Fetch from site_config table
        {
          SELECT value
          FROM site_config
          WHERE key = 'hero_image_url'
        }
        ↓
Supabase returns hero_image_url
        ↓
Image displayed in hero section
        ↓
On image error → Show fallback UI
```

### Flow 2: Admin Updates Hero Image via URL
```
Admin navigates to Settings tab
        ↓
Clicks "Editar" button
        ↓
Modal opens with current image URL
        ↓
Admin pastes new image URL
        ↓
Preview updates immediately
        ↓
Admin clicks "Salvar"
        ↓
handleSaveHeroImage() triggered
        ↓
UPDATE site_config table
        {
          UPSERT INTO site_config
          (key, value) = ('hero_image_url', new_url)
        }
        ↓
Modal closes
        ↓
Success toast displayed
        ↓
Visitors see new image on page refresh
```

### Flow 3: Admin Uploads Image File
```
Admin navigates to Settings tab
        ↓
Clicks "Editar" button
        ↓
Modal opens
        ↓
Admin selects file from computer
        ↓
handleHeroImageFileChange() triggered
        ↓
File validation:
├─ Type check (JPEG/PNG/GIF)
└─ Size check (<5MB)
        ↓
FileReader generates preview
        ↓
Preview displayed in modal
        ↓
Admin clicks "Salvar"
        ↓
handleSaveHeroImage() triggered
        ↓
File uploaded to storage bucket:
{
  supabase.storage.from('site-config')
  .upload('hero-{timestamp}.{ext}', file)
}
        ↓
Get public URL:
{
  supabase.storage.from('site-config')
  .getPublicUrl('hero-{timestamp}.{ext}')
}
        ↓
UPDATE site_config table with new URL
        {
          UPSERT INTO site_config
          (key, value) = ('hero_image_url', public_url)
        }
        ↓
Modal closes
        ↓
Success toast displayed
        ↓
Visitors see new image on page refresh
```

## Component Relationship Diagram

```
┌─────────────────────────────────────────────────────┐
│              React Router                           │
│  ┌──────────────┐              ┌──────────────────┐│
│  │ /            │              │ /admin           ││
│  │ Index.tsx    │              │ AdminDashboard   ││
│  │              │              │   .tsx           ││
│  │ Displays:    │              │                  ││
│  │ • Hero image │              │ Contains:        ││
│  │ • CTA buttons│              │ • Tabs system    ││
│  │              │              │ • Settings tab   ││
│  │ Fetches:     │              │ • Hero modal     ││
│  │ • site_config│              │ • Handlers       ││
│  │   table      │              │                  ││
│  └──────────────┘              └──────────────────┘│
│         △                              △            │
│         │                              │            │
│         └──────────────────────────────┘            │
│              Supabase Client                        │
└─────────────────────────────────────────────────────┘
         │
         │ Query / Update / Upload
         │
┌─────────┴──────────────────────────────────────────┐
│          Supabase Services                         │
│  ┌──────────────────────────────────────────────┐  │
│  │ PostgreSQL Database (site_config table)      │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Object Storage (site-config bucket)          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## State Management Flow

### AdminDashboard Component State
```
┌─────────────────────────────────────────────────┐
│        Hero Image State Variables                │
├─────────────────────────────────────────────────┤
│                                                 │
│ showHeroImageModal: boolean                    │
│ ├─ Controls modal visibility                   │
│ └─ Toggles with setShowHeroImageModal()        │
│                                                 │
│ heroImageUrl: string                           │
│ ├─ Stores image URL (from input or DB)        │
│ ├─ Updated in modal form input                 │
│ └─ Sent to Supabase on save                   │
│                                                 │
│ heroImageFile: File | null                     │
│ ├─ Stores selected file object                 │
│ ├─ Set by handleHeroImageFileChange()         │
│ └─ Used for file upload                       │
│                                                 │
│ heroImagePreview: string                       │
│ ├─ Data URL for image preview                 │
│ ├─ Generated by FileReader                     │
│ └─ Displayed in modal                         │
│                                                 │
│ savingHeroImage: boolean                       │
│ ├─ Loading state during save                   │
│ ├─ Disables buttons during save               │
│ └─ Shows "Salvando..." text                    │
│                                                 │
└─────────────────────────────────────────────────┘

useEffect Hook:
├─ Runs on component mount
├─ Loads current hero_image_url from DB
└─ Sets heroImageUrl and heroImagePreview states
```

## User Permission Model

```
┌─────────────────────────────────────┐
│    User Authentication & Roles      │
├─────────────────────────────────────┤
│                                     │
│ Public User:                        │
│ ├─ View homepage               ✓    │
│ ├─ View hero image             ✓    │
│ ├─ Access admin settings       ✗    │
│ └─ Upload images               ✗    │
│                                     │
│ Client User:                        │
│ ├─ View homepage               ✓    │
│ ├─ View hero image             ✓    │
│ ├─ Access admin settings       ✗    │
│ └─ Upload images               ✗    │
│                                     │
│ Driver User:                        │
│ ├─ View homepage               ✓    │
│ ├─ View hero image             ✓    │
│ ├─ Access admin settings       ✗    │
│ └─ Upload images               ✗    │
│                                     │
│ Admin User:                         │
│ ├─ View homepage               ✓    │
│ ├─ View hero image             ✓    │
│ ├─ Access admin settings       ✓    │
│ └─ Upload images               ✓    │
│                                     │
└─────────────────────────────────────┘

RLS Policy Enforcement:
├─ site_config table
│  ├─ Admin UPDATE           ✓ (via RLS policy)
│  └─ Public SELECT          ✓ (via RLS policy)
│
└─ site-config storage bucket
   ├─ Admin UPLOAD           ✓ (via RLS policy)
   ├─ Public READ            ✓ (bucket is public)
   └─ Admin DELETE           ✓ (via RLS policy)
```

---

**Architecture Version:** 1.0
**Status:** Complete and documented
