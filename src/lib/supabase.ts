import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Debug logging removed after verification.

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Create a new submission with client, year, and optional preset class of business
 */
export interface CreateSubmissionArgs {
  client: string;
  year: number;
  lob_class?: string | null;
  userId?: string | null;
}

export async function createSubmission(args: CreateSubmissionArgs): Promise<string> {
  const { client, year, lob_class, userId } = args;
  
  // Determine line_of_business - default to 'property' (lowercase to match DB constraint)
  // DB constraint: check (line_of_business in ('property','casualty'))
  let lineOfBusiness = 'property';
  if (lob_class) {
    // Normalize to lowercase to match database constraint
    const normalized = lob_class.toLowerCase();
    if (normalized.includes('casualty') || normalized.includes('liability')) {
      lineOfBusiness = 'casualty';
    }
    // Otherwise keep 'property' as default
  }
  
  console.log('[CREATE] Creating submission:', { client, year, lob_class, lineOfBusiness, userId });
  
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      user_id: userId ?? null,  // Temporary: still using user_id until migration runs
      line_of_business: lineOfBusiness,  // Must be lowercase: 'property' or 'casualty'
      status: 'in_progress',
      meta: { client, year },
      lob_class: lob_class ?? null,  // Can be any value (e.g., 'Property', 'Marine & Aviation')
    })
    .select('id, user_id, status, created_at, lob_class')
    .single();
  
  console.log('[CREATE] Submission created:', { data, error });
  
  if (error) {
    console.error('[CREATE] Error creating submission:', error);
    throw error;
  }
  return data.id as string;
}
