import { supabase } from './supabase';
// Cast to any to access newly added tables not yet in generated Supabase types
const sb: any = supabase;

export interface EpiGwpSplitRow {
  id?: string; // uuid primary key (may be undefined before first save)
  submission_id: string;
  section: string;
  premium: number;
  position?: number | null;
}

// Helper to compute differential sets for GWP split rows by id (or synthetic key if id missing)
export function diffGwpRows(existing: EpiGwpSplitRow[], incoming: EpiGwpSplitRow[]) {
  const key = (r: EpiGwpSplitRow, idx: number) => r.id || `__new_${idx}_${r.section}_${r.position}`;
  const existingMap = new Map(existing.map((r, i) => [key(r, i), r]));
  const incomingMap = new Map(incoming.map((r, i) => [key(r, i), r]));
  const toDelete: EpiGwpSplitRow[] = [];
  for (const [k, ex] of existingMap.entries()) {
    if (!incomingMap.has(k) && ex.id) toDelete.push(ex);
  }
  return { toDelete };
}

export async function getEpiGwpSplit(submissionId: string): Promise<EpiGwpSplitRow[]> {
  const { data, error } = await sb
    .from('epi_gwp_split')
    .select('id, submission_id, section, premium, position')
    .eq('submission_id', submissionId)
    .order('position', { ascending: true, nullsFirst: true })
    .order('created_at');
  if (error) throw error;
  return data as EpiGwpSplitRow[];
}
// Replace entire set with support for duplicate sections using primary key id
export async function replaceEpiGwpSplit(
  submissionId: string,
  rows: { id?: string; section: string; premium: number; position?: number }[]
) {
  // Fetch existing IDs
  const existing = await getEpiGwpSplit(submissionId);
  const existingIds = new Set(existing.filter(r => r.id).map(r => r.id as string));
  // Normalize incoming (assign position deterministically; server default generates id if missing)
  const normalized = rows.map((r, idx) => ({
    id: r.id, // keep if provided
    submission_id: submissionId,
    section: r.section?.trim() || '',
    premium: Number(r.premium) || 0,
    position: typeof r.position === 'number' ? r.position : idx,
  }));
  const incomingIds = new Set(normalized.filter(r => r.id).map(r => r.id as string));

  if (normalized.length > 0) {
    const { error } = await sb.from('epi_gwp_split').upsert(normalized, { onConflict: 'id' });
    if (error) throw error;
  }
  const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
  if (toDelete.length > 0) {
    const { error: delErr } = await sb.from('epi_gwp_split').delete().in('id', toDelete);
    if (delErr) throw delErr;
  }
  return normalized;
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
