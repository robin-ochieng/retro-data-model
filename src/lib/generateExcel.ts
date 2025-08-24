/**
 * Placeholder integration for Excel generation.
 * Later this will call a Supabase Edge Function that triggers an n8n webhook,
 * fills the appropriate template from the `templates/` bucket, and returns a signed URL
 * to the generated file in the private `generated/` bucket.
 */
export async function generateExcel(submissionId: string): Promise<{ ok: boolean; url?: string }> {
  // TODO: call an Edge Function, e.g.,
  // const { data, error } = await supabase.functions.invoke('generate-excel', { body: { submissionId } });
  // return { ok: !error, url: data?.url };
  // For now, stub:
  // eslint-disable-next-line no-console
  console.log('[generateExcel:stub]', { submissionId });
  return { ok: true };
}
