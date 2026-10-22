-- Designs whose photos must be deleted under the privacy policy:
--   * in an order that shipped more than 30 days ago, or
--   * older than 7 days and not part of any paid order.
create function designs_due_for_cleanup()
returns table (id uuid, original_path text, preview_path text, print_path text)
language sql stable set search_path = '' as $$
  select d.id, d.original_path, d.preview_path, d.print_path
  from public.designs d
  where d.files_deleted_at is null
    and (
      exists (
        select 1 from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where oi.design_id = d.id
          and o.status = 'shipped'
          and o.shipped_at < now() - interval '30 days'
      )
      or (
        d.created_at < now() - interval '7 days'
        and not exists (
          select 1 from public.order_items oi
          join public.orders o on o.id = oi.order_id
          where oi.design_id = d.id
            and o.status in ('new', 'printing', 'shipped')
        )
      )
    )
  limit 500
$$;

revoke execute on function designs_due_for_cleanup() from public, anon, authenticated;
