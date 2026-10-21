-- INSERT ... RETURNING checks the read policy against the new row. can_read_document()
-- looks the row up again and cannot see it inside the same statement, so authors could
-- not get back the document they had just created. The author check now reads the row itself.

drop policy if exists "read visible documents" on public.documents;

create policy "read visible documents" on public.documents
  for select to authenticated
  using (author_id = public.current_member_id() or public.can_read_document(id));
