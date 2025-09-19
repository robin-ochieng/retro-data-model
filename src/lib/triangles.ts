import { supabase } from './supabase';
import type { Tables } from '../types/supabase';

export type TriangleMeasure = 'written_premium' | 'number_of_losses' | 'paid_losses' | 'loss_reserves' | 'incurred_losses' | 'wi_lr_pct';

export type TriangleRow = Pick<Tables<'property_aggregate_triangle_values'>, 'measure' | 'uw_year' | 'development_months' | 'value'>;

export async function getPropertyTriangle(submissionId: string) {
  const { data, error } = await supabase
    .from('property_aggregate_triangle_values')
    .select('*')
    .eq('submission_id', submissionId)
    .order('measure', { ascending: true })
    .order('uw_year', { ascending: true })
    .order('development_months', { ascending: true });
  if (error) throw error;
  return data as Tables<'property_aggregate_triangle_values'>[];
}

export async function upsertPropertyTriangleCell(args: {
  submissionId: string;
  measure: TriangleMeasure;
  uwYear: number;
  developmentMonths: number;
  value: number | null;
}) {
  const { submissionId, measure, uwYear, developmentMonths, value } = args;
  const { error } = await supabase.rpc('upsert_property_aggregate_triangle_cell', {
    p_submission_id: submissionId,
    p_measure: measure,
    p_uw_year: uwYear,
    p_development_months: developmentMonths,
    p_value: value,
  });
  if (error) throw error;
}

export async function replacePropertyTriangle(args: {
  submissionId: string;
  rows: TriangleRow[];
  deleteMissing?: boolean;
}) {
  const { submissionId, rows, deleteMissing } = args;
  const { data, error } = await supabase.rpc('replace_property_aggregate_triangle', {
    p_submission_id: submissionId,
    p_rows: rows,
    p_delete_missing: deleteMissing ?? false,
  });
  if (error) throw error;
  return data as number;
}
