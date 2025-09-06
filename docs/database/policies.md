# Row Level Security (RLS) and Policies

RLS is enabled on core tables and uses an owner-based model.

## RLS Enabled Tables

- submissions
- sheet_blobs
- epi_summary
- treaty_stats_prop
- risk_profile_bands
- large_loss_list
- cat_loss_list
- large_loss_triangle_values
- top_risks

## Submissions (owner-only)

```sql
CREATE POLICY submissions_owner_select ON public.submissions 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY submissions_owner_ins ON public.submissions 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY submissions_owner_upd ON public.submissions 
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY submissions_owner_del ON public.submissions 
  FOR DELETE USING (user_id = auth.uid());
```

## Child Tables (via parent ownership)

Each child table uses a single FOR ALL policy tied back to the parent `submissions` table:

```sql
CREATE POLICY sheet_blobs_owner_all ON public.sheet_blobs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = sheet_blobs.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = sheet_blobs.submission_id AND s.user_id = auth.uid()));

CREATE POLICY epi_summary_owner_all ON public.epi_summary FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = epi_summary.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = epi_summary.submission_id AND s.user_id = auth.uid()));

CREATE POLICY treaty_stats_prop_owner_all ON public.treaty_stats_prop FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = treaty_stats_prop.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = treaty_stats_prop.submission_id AND s.user_id = auth.uid()));

CREATE POLICY risk_profile_bands_owner_all ON public.risk_profile_bands FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_bands.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_bands.submission_id AND s.user_id = auth.uid()));

CREATE POLICY large_loss_list_owner_all ON public.large_loss_list FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_list.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_list.submission_id AND s.user_id = auth.uid()));

CREATE POLICY cat_loss_list_owner_all ON public.cat_loss_list FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = cat_loss_list.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = cat_loss_list.submission_id AND s.user_id = auth.uid()));

CREATE POLICY large_loss_triangle_values_owner_all ON public.large_loss_triangle_values FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_triangle_values.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_triangle_values.submission_id AND s.user_id = auth.uid()));

CREATE POLICY top_risks_owner_all ON public.top_risks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = top_risks.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = top_risks.submission_id AND s.user_id = auth.uid()));
```

## Notes

- RLS must be enabled per table (see migration).
- Policies use `auth.uid()` for per-user isolation via the parent submission.
