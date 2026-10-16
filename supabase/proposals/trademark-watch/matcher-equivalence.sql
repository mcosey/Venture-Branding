-- Compare the optimized matcher to the original full edit-distance rule.
select pg_temp.watch_assert(not exists(select 1 from generate_series(1,1000) n cross join generate_series(1,4) variant
 where (vb_private.watch_reason('EXAMPLE',case variant when 1 then 'EXAMPL'||substr(md5(n::text),1,1) when 2 then 'EXA'||substr(md5(n::text),1,2)||'LE' when 3 then 'E'||substr(md5(n::text),1,4)||'PLE' else substr(md5(n::text),1,8) end) is null)
 is distinct from (vb_private.watch_reason_reference('EXAMPLE',case variant when 1 then 'EXAMPL'||substr(md5(n::text),1,1) when 2 then 'EXA'||substr(md5(n::text),1,2)||'LE' when 3 then 'E'||substr(md5(n::text),1,4)||'PLE' else substr(md5(n::text),1,8) end) is null)), 'optimized matcher agrees with full matrix on 4000 pairs');
