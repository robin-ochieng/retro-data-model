import { supabase } from './supabase';
// Cast to any to access newly added tables not yet in generated Supabase types
const sb: any = supabase;

export interface EpiGwpSplitRow {
  submission_id: string;
  section: string;
  premium: number;
}

export async function getEpiGwpSplit(submissionId: string): Promise<EpiGwpSplitRow[]> {
  const { data, error } = await sb.from('epi_gwp_split').select('*').eq('submission_id', submissionId).order('section');
  if (error) throw error;
  return data as EpiGwpSplitRow[];
}

export async function upsertEpiGwpSplit(submissionId: string, rows: { section: string; premium: number }[]) {
  if (rows.length === 0) return { count: 0 };
  const payload = rows.map(r => ({ submission_id: submissionId, section: r.section, premium: r.premium }));
  const { error } = await sb.from('epi_gwp_split').upsert(payload, { onConflict: 'submission_id,section' });
  if (error) throw error;
  return { count: rows.length };
}

export async function replaceEpiGwpSplit(submissionId: string, rows: { section: string; premium: number }[]) {
  const existing = await getEpiGwpSplit(submissionId);
  const existingSections = new Set(existing.map(r => r.section));
  const incomingSections = new Set(rows.map(r => r.section));
  await upsertEpiGwpSplit(submissionId, rows);
  // Delete missing
  for (const s of existingSections) {
    if (!incomingSections.has(s)) {
  await sb.from('epi_gwp_split').delete().eq('submission_id', submissionId).eq('section', s);
    }
  }
}

export interface EpiSummaryMeta {
  submission_id: string;
  additional_comments: string;
  treaty_type: string | null;
}

export async function getEpiSummaryMeta(submissionId: string): Promise<EpiSummaryMeta | null> {
  const { data, error } = await sb.from('epi_summary_meta').select('*').eq('submission_id', submissionId).maybeSingle();
  if (error) throw error;
  return data as EpiSummaryMeta | null;
}

export async function upsertEpiSummaryMeta(submissionId: string, meta: Partial<Omit<EpiSummaryMeta, 'submission_id'>>) {
  const { error } = await sb.from('epi_summary_meta').upsert([{ submission_id: submissionId, ...meta }]);
  if (error) throw error;
}
