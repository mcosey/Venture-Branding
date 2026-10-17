create function vb_private.watch_reason_reference(a text,b text) returns text language plpgsql immutable set search_path='' as $$
declare x text:=vb_private.watch_normalize(a); y text:=vb_private.watch_normalize(b); p integer[]; q integer[]; i integer; j integer;
begin
 if a ~ '[^ -~]' or b ~ '[^ -~]' then return null; end if;
 if x='' or y='' then return null; end if;
 if x=y then return 'Same name after ignoring spaces, punctuation and letter case'; end if;
 if length(x)>80 or length(y)>80 or least(length(x),length(y))<5 or abs(length(x)-length(y))>2 then return null; end if;
 p:=array(select generate_series(0,length(y)));
 for i in 1..length(x) loop
  q:=array[i];
  for j in 1..length(y) loop
   q:=array_append(q,least(q[j]+1,p[j+1]+1,p[j]+case when substr(x,i,1)=substr(y,j,1) then 0 else 1 end));
  end loop;
  p:=q;
 end loop;
 if p[length(y)+1]<=2 then return 'Name differs by '||p[length(y)+1]||' letter insertions, removals or substitutions'; end if;
 return null;
end $$;
