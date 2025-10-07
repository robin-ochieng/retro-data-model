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
  
  // Use a default LOB if none provided (we'll make it editable in wizard)
  const lineOfBusiness = lob_class || 'Property';
  
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      user_id: userId ?? null,
      line_of_business: lineOfBusiness,
      status: 'in_progress',
      meta: { client, year },
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id as string;
}
