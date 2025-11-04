# Reinsurance Certificate Upload Feature

## Overview
The Reinsurance Certificate Upload feature allows users to securely upload, view, and manage reinsurance certificate documents (PDF, DOC, DOCX) directly within the Retrocession Hub wizard interface.

## Features

### ✅ Implemented
- **Secure File Upload**: Upload PDF, DOC, and DOCX files up to 10MB
- **Drag-and-Drop Support**: Intuitive file selection with drag-and-drop or file browser
- **Autosave Integration**: Automatic persistence of file metadata to Supabase
- **User-Specific Storage**: Files stored in user-specific folders with RLS enforcement
- **Replace/Delete Actions**: Users can update or remove uploaded certificates
- **Download Functionality**: Download previously uploaded certificates
- **Read-Only Mode**: View-only access for submitted submissions
- **Progress Indicators**: Visual feedback during upload process
- **Error Handling**: Clear error messages for validation and upload failures

## Architecture

### Database Schema
**Table**: `reinsurance_certificates`
```sql
- id (bigint, PK, generated always as identity)
- submission_id (uuid, FK → submissions.id)
- user_id (uuid, FK → auth.users.id)
- file_name (text)
- file_url (text)
- file_size (bigint, nullable)
- content_type (text, nullable)
- uploaded_at (timestamptz)
- updated_at (timestamptz)
```

### Supabase Storage
**Bucket**: `reinsurance_certificates` (private)

**Folder Structure**:
```
reinsurance_certificates/
  └── {user_id}/
      └── {submission_id}/
          └── certificate.{ext}
```

### Row-Level Security (RLS)
All policies enforce user isolation:
- Users can only view, insert, update, and delete their own certificates
- Storage policies use `auth.uid()` to verify folder ownership

## File Structure

### Core Files
```
src/
├── lib/
│   ├── uploadCertificate.ts          # Upload/download/delete logic
│   └── supabase.ts                    # Supabase client
├── pages/
│   └── wizard/
│       └── steps/
│           └── StepReinsuranceCertificate.tsx  # Main component
├── config/
│   └── lobConfig.ts                   # Tab configuration
├── types/
│   └── supabase.ts                    # TypeScript types
└── __tests__/
    ├── ReinsuranceCertificate.test.tsx        # Component tests
    └── ReinsuranceCertificateTabOrder.test.ts # Tab order tests

supabase/
└── migrations/
    └── 20251104_001_reinsurance_certificates_bucket.sql  # DB schema + policies
```

## API Reference

### `uploadCertificate(file, submissionId, userId)`
Uploads a file to Supabase Storage and saves metadata.

**Parameters**:
- `file`: File object (PDF, DOC, DOCX only)
- `submissionId`: UUID of the submission
- `userId`: UUID of the authenticated user

**Returns**: `UploadCertificateResult`
```typescript
{
  success: boolean;
  fileUrl?: string;
  certificateId?: number;
  error?: string;
}
```

**Validation**:
- File type must be: `application/pdf`, `application/msword`, or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- File size must be ≤ 10MB
- User must be authenticated

### `getCertificate(submissionId, userId)`
Fetches certificate metadata for a submission.

**Returns**: `CertificateMetadata | null`

### `deleteCertificate(submissionId, userId)`
Deletes certificate from storage and database.

**Returns**: `boolean` (success status)

### `downloadCertificate(submissionId, userId)`
Downloads certificate file as a Blob.

**Returns**: `Blob | null`

## Testing

### Unit Tests
Run component tests:
```bash
npm run test src/__tests__/ReinsuranceCertificate.test.tsx
```

**Coverage**:
- ✅ File type validation (PDF, DOC, DOCX)
- ✅ Invalid file type rejection
- ✅ Upload progress display
- ✅ Success/error message handling
- ✅ Existing certificate display
- ✅ Download/replace/delete actions
- ✅ Autosave integration

### Tab Order Tests
Run tab positioning tests:
```bash
npm run test src/__tests__/ReinsuranceCertificateTabOrder.test.ts
```

**Coverage**:
- ✅ Tab appears before Submit in property tabs
- ✅ Tab appears before Submit in casualty tabs
- ✅ Correct label ("Reinsurance Certificate")
- ✅ Correct component mapping

### Integration Testing
1. Start the dev server: `npm run dev`
2. Log in and create a submission
3. Navigate to "Reinsurance Certificate" tab
4. Test upload, download, replace, and delete workflows
5. Verify RLS by attempting to access another user's files (should fail)

## Security Considerations

### Authentication
- All operations require valid Supabase session
- `auth.uid()` used to verify user identity

### Storage Policies
```sql
-- Users can only upload to their own folder
auth.uid()::text = (storage.foldername(name))[1]

-- Users can only read files from their own folder
auth.uid()::text = (storage.foldername(name))[1]

-- Users can only delete files from their own folder
auth.uid()::text = (storage.foldername(name))[1]
```

### Database RLS
```sql
-- All policies enforce: auth.uid() = user_id
```

### File Validation
- **Client-side**: File type checked via MIME type
- **Server-side**: Supabase enforces bucket policies
- **Size limit**: 10MB enforced in code

## Usage

### For Developers
1. The tab is automatically included in both Property and Casualty wizards
2. No additional configuration needed
3. Component follows existing autosave patterns

### For Users
1. Navigate to "Reinsurance Certificate" tab
2. Drag-and-drop or browse for your certificate file
3. Wait for upload confirmation
4. File is automatically saved with the submission
5. Use Download/Replace/Delete buttons as needed

## Migration

### Applying the Migration
```bash
# Option 1: Supabase CLI
supabase db push

# Option 2: SQL Editor in Supabase Dashboard
# Copy and execute: supabase/migrations/20251104_001_reinsurance_certificates_bucket.sql
```

### Migration Includes
- ✅ `reinsurance_certificates` table creation
- ✅ RLS policy setup
- ✅ Storage bucket creation
- ✅ Storage policy setup
- ✅ Indexes for performance

## Future Enhancements
- [ ] Multiple file upload support
- [ ] File preview (PDF viewer)
- [ ] Version history tracking
- [ ] Email notifications on upload
- [ ] Admin audit logs
- [ ] Bulk download for admins

## Troubleshooting

### Upload Fails with "Invalid file type"
**Solution**: Ensure file is PDF, DOC, or DOCX. Check MIME type.

### Upload Fails with "File size exceeds 10MB"
**Solution**: Compress or split the file before uploading.

### "User not authenticated" Error
**Solution**: Refresh session or log in again.

### Files Not Showing for User
**Solution**: Check RLS policies are applied correctly in Supabase.

### Storage Policy Errors
**Solution**: Verify bucket exists and policies are active:
```sql
SELECT * FROM storage.buckets WHERE id = 'reinsurance_certificates';
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
```

## Support
For issues or questions:
1. Check the test files for expected behavior
2. Review Supabase logs for storage/RLS errors
3. Verify migration was applied successfully
4. Check browser console for client-side errors
