import { supabase } from './supabase';
import type { Tables } from '../types/supabase';

export type CrestaSection = 'sum_insured' | 'personal' | 'commercial' | 'industrial' | 'engineering';

export async function getCresta(submissionId: string) {
  const { data, error } = await supabase
    .from('property_cresta_zone_values')
    .select('*')
    .eq('submission_id', submissionId)
    .order('section', { ascending: true })
    .order('zone', { ascending: true })
    .order('category', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data as Tables<'property_cresta_zone_values'>[];
}

export async function upsertCrestaCell(args: {
  submissionId: string;
  section: CrestaSection;
  zone: number; // 0..19, 0 = Unallocated
  category: string | null; // null for sum_insured
  zoneDescription: string;
  gross: number;
  net: number;
}) {
  const { submissionId, section, zone, category, zoneDescription, gross, net } = args;
  const { error } = await supabase.rpc('upsert_property_cresta_zone_value', {
    p_submission_id: submissionId,
    p_section: section,
    p_zone: zone,
    p_category: category,
    p_zone_description: zoneDescription,
    p_gross: gross,
    p_net: net,
  });
  if (error) throw error;
}

export async function replaceCrestaSection(args: {
  submissionId: string;
  section: CrestaSection;
  rows: Array<{ zone: number; zone_description: string; category: string | null; gross: number; net: number }>;
  deleteMissing?: boolean;
}) {
  const { submissionId, section, rows, deleteMissing } = args;
  const { data, error } = await supabase.rpc('replace_property_cresta_zone_section', {
    p_submission_id: submissionId,
    p_section: section,
    p_rows: rows,
    p_delete_missing: deleteMissing ?? false,
  });
  if (error) throw error;
  return data as number;
}
