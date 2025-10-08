import { supabase } from './supabase';

/**
 * Mirror Class of Business and Line of Business from sheet_blobs to the submissions table.
 * This allows the home cards to display COB/LOB without querying sheet_blobs.
 * 
 * Only updates in_progress submissions to prevent modifications to submitted records.
 */
export async function mirrorCobLobToSubmission(
  submissionId: string,
  classOfBusiness: string | null,
  lineOfBusiness: string | null
): Promise<boolean> {
  // Ignore empty submission IDs
  if (!submissionId) return false;

  try {
    // Only update in_progress submissions (RLS will also enforce this)
    const { error } = await supabase
      .from('submissions')
      .update({ 
        lob_class: classOfBusiness, 
        lob_line: lineOfBusiness 
      })
      .eq('id', submissionId)
      .eq('status', 'in_progress');

    if (error) {
      console.warn('[mirrorCobLob] Failed to mirror COB/LOB to submissions:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[mirrorCobLob] Exception mirroring COB/LOB:', err);
    return false;
  }
}
