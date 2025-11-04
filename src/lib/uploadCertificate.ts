import { supabase } from './supabase';

export interface UploadCertificateResult {
  success: boolean;
  fileUrl?: string;
  certificateId?: number;
  error?: string;
}

export interface CertificateMetadata {
  id: number;
  submission_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_at: string;
  updated_at: string;
}

/**
 * Uploads a reinsurance certificate file to Supabase Storage
 * and saves metadata to the database.
 * 
 * @param file - The file to upload (PDF, DOC, DOCX)
 * @param submissionId - The submission UUID
 * @param userId - The authenticated user's UUID
 * @returns Upload result with file URL and certificate ID
 */
export async function uploadCertificate(
  file: File,
  submissionId: string,
  userId: string
): Promise<UploadCertificateResult> {
  try {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.',
      };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 10MB limit.',
      };
    }

    // Generate file path: user_id/submission_id/certificate.{ext}
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${submissionId}/certificate.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reinsurance_certificates')
      .upload(filePath, file, {
        upsert: true, // Replace existing file
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[uploadCertificate] Storage upload error:', uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    // Get public URL (even though bucket is private, we need the path)
    const { data: urlData } = supabase.storage
      .from('reinsurance_certificates')
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // Check if record already exists for this submission
    const { data: existing, error: selectError } = await supabase
      .from('reinsurance_certificates')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[uploadCertificate] Database select error:', selectError);
      return {
        success: false,
        error: selectError.message,
      };
    }

    let certificateId: number;

    if (existing) {
      // Update existing record
      const { data: updateData, error: updateError } = await supabase
        .from('reinsurance_certificates')
        .update({
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          content_type: file.type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[uploadCertificate] Database update error:', updateError);
        return {
          success: false,
          error: updateError.message,
        };
      }

      certificateId = updateData.id;
    } else {
      // Insert new record
      const { data: insertData, error: insertError } = await supabase
        .from('reinsurance_certificates')
        .insert({
          submission_id: submissionId,
          user_id: userId,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          content_type: file.type,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[uploadCertificate] Database insert error:', insertError);
        return {
          success: false,
          error: insertError.message,
        };
      }

      certificateId = insertData.id;
    }

    return {
      success: true,
      fileUrl,
      certificateId,
    };
  } catch (error) {
    console.error('[uploadCertificate] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Fetches the certificate metadata for a given submission
 * 
 * @param submissionId - The submission UUID
 * @param userId - The authenticated user's UUID
 * @returns Certificate metadata or null if not found
 */
export async function getCertificate(
  submissionId: string,
  userId: string
): Promise<CertificateMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('reinsurance_certificates')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[getCertificate] Database error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getCertificate] Unexpected error:', error);
    return null;
  }
}

/**
 * Deletes a certificate file and its metadata
 * 
 * @param submissionId - The submission UUID
 * @param userId - The authenticated user's UUID
 * @returns Success boolean
 */
export async function deleteCertificate(
  submissionId: string,
  userId: string
): Promise<boolean> {
  try {
    // Get the file path from database first
    const certificate = await getCertificate(submissionId, userId);
    if (!certificate) {
      return false;
    }

    // Extract file path from URL
    const urlParts = certificate.file_url.split('/');
    const filePath = urlParts.slice(-3).join('/'); // user_id/submission_id/certificate.ext

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('reinsurance_certificates')
      .remove([filePath]);

    if (storageError) {
      console.error('[deleteCertificate] Storage deletion error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('reinsurance_certificates')
      .delete()
      .eq('submission_id', submissionId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('[deleteCertificate] Database deletion error:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[deleteCertificate] Unexpected error:', error);
    return false;
  }
}

/**
 * Downloads a certificate file from Supabase Storage
 * 
 * @param submissionId - The submission UUID
 * @param userId - The authenticated user's UUID
 * @returns Blob data or null if not found
 */
export async function downloadCertificate(
  submissionId: string,
  userId: string
): Promise<Blob | null> {
  try {
    const certificate = await getCertificate(submissionId, userId);
    if (!certificate) {
      return null;
    }

    // Extract file path from URL
    const urlParts = certificate.file_url.split('/');
    const filePath = urlParts.slice(-3).join('/');

    const { data, error } = await supabase.storage
      .from('reinsurance_certificates')
      .download(filePath);

    if (error) {
      console.error('[downloadCertificate] Storage download error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[downloadCertificate] Unexpected error:', error);
    return null;
  }
}
