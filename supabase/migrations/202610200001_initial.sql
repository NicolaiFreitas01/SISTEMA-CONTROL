-- Execute no SQL Editor do seu projeto Supabase. Sem chaves de serviço no cliente.
create table if not exists public.workspaces (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
create policy "Only owner reads workspace" on public.workspaces for select to authenticated using ((select auth.uid()) = owner_id);
-- Apenas RPC pode gravar: validação, concorrência e auditoria no servidor.
revoke all on public.workspaces from anon, authenticated;
grant select on public.workspaces to authenticated;
create table if not exists public.workspace_audit (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null,
 saved_at timestamptz not null default now(),
 data jsonb not null
);
alter table public.workspace_audit enable row level security;
create policy "Only owner reads audit" on public.workspace_audit for select to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.workspace_audit from anon, authenticated;
grant select on public.workspace_audit to authenticated;
-- Projeções relacionais do agregado transacional. As FKs são compostas por dono
-- para impedir referências entre contas mesmo com IDs conhecidos.
create table public.adsets (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, name text not null, budget numeric not null check(budget>=0), active boolean not null,
 primary key(owner_id,id)
);
create table public.creatives (
 owner_id uuid not null, id uuid not null, adset_id uuid not null,
 data jsonb not null, primary key(owner_id,id),
 foreign key(owner_id,adset_id) references public.adsets(owner_id,id)
);
create table public.orders (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, adset_id uuid, creative_id uuid, data jsonb not null,
 primary key(owner_id,id),
 foreign key(owner_id,adset_id) references public.adsets(owner_id,id),
 foreign key(owner_id,creative_id) references public.creatives(owner_id,id)
);
create table public.financial_entries (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, order_id uuid, kind text not null, amount numeric not null check(amount>0),
 occurred_on date not null, data jsonb not null, primary key(owner_id,id),
 foreign key(owner_id,order_id) references public.orders(owner_id,id)
);
create unique index single_order_event on public.financial_entries(owner_id,order_id,kind)
 where kind in ('shipping','shipment','product');
create table public.traffic (
 owner_id uuid not null, id uuid not null, adset_id uuid not null, creative_id uuid,
 occurred_on date not null, spend numeric not null check(spend>=0),data jsonb not null,
 primary key(owner_id,id),
 foreign key(owner_id,adset_id) references public.adsets(owner_id,id),
 foreign key(owner_id,creative_id) references public.creatives(owner_id,id)
);
create unique index unique_traffic_day on public.traffic(owner_id,occurred_on,adset_id,coalesce(creative_id,'00000000-0000-0000-0000-000000000000'::uuid));
do $$ declare tab text; begin
 foreach tab in array array['adsets','creatives','orders','financial_entries','traffic'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=owner_id)',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
 end loop;
end $$;

create or replace function public.save_workspace(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); current_revision bigint; item jsonb; key text;
begin
 if uid is null then raise exception 'Login necessário'; end if;
 if jsonb_typeof(payload) <> 'object' then raise exception 'Dados inválidos'; end if;
 foreach key in array array['orders','entries','adsets','creatives','traffic','leads','goals','history'] loop
  if jsonb_typeof(payload->key) is distinct from 'array' then raise exception 'Coleção inválida: %',key; end if;
 end loop;
 if jsonb_typeof(payload->'settings') is distinct from 'object' then raise exception 'Configurações inválidas'; end if;
 -- Serializa todas as alterações do usuário, inclusive a primeira gravação.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where owner_id=uid for update;
 if coalesce(current_revision,0)<>expected_revision then raise exception 'Dados alterados em outra sessão. Recarregue antes de salvar.'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'entries') e where e->>'amount' is null or e->>'kind' is null or (e->>'amount')::numeric<=0 or round((e->>'amount')::numeric,2)<>(e->>'amount')::numeric or e->>'kind' not in ('shipping','product','shipment','ads','income','expense','refund')) then raise exception 'Lançamento financeiro inválido'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'traffic') t where (t->>'spend')::numeric<0 or (t->>'clicks')::numeric<0 or (t->>'impressions')::numeric<0 or (t->>'conversations')::numeric<0) then raise exception 'Métricas negativas'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'entries') e where e->>'kind' in ('shipping','product','shipment') group by e->>'orderId', e->>'kind' having count(*)>1) then raise exception 'Lançamento duplicado'; end if;
 foreach key in array array['orders','entries','adsets','creatives','traffic','leads','goals','history'] loop
  if exists(select 1 from jsonb_array_elements(payload->key) e group by e->>'id' having count(*)>1) then raise exception 'IDs duplicados'; end if;
 end loop;
 for item in select value from jsonb_array_elements(payload->'orders') loop
  if coalesce(length(trim(item->>'name')),0)=0 or (item->>'quantity')::integer<1 or (item->>'price')::numeric<0 or (item->>'shipping')::numeric<0 or (item->>'cost')::numeric<0 then raise exception 'Pedido inválido'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(payload->'entries') e where e->>'orderId' is not null and not exists(select 1 from jsonb_array_elements(payload->'orders') o where o->>'id'=e->>'orderId')) then raise exception 'Pedido do lançamento inexistente'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'entries') e where e->>'kind'='product' and not exists(select 1 from jsonb_array_elements(payload->'entries') s where s->>'orderId'=e->>'orderId' and s->>'kind'='shipment')) then raise exception 'Pagamento na entrega sem despacho'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'entries') e where e->>'orderId' is not null group by e->>'orderId' having sum(case when e->>'kind'='refund' then (e->>'amount')::numeric else 0 end)>sum(case when e->>'kind' in ('shipping','product') then (e->>'amount')::numeric else 0 end)) then raise exception 'Reembolso superior ao recebido'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'entries') e join jsonb_array_elements(payload->'orders') o on o->>'id'=e->>'orderId'
 where (e->>'kind'='shipping' and (e->>'amount')::numeric<>(o->>'shipping')::numeric)
 or (e->>'kind'='product' and (e->>'amount')::numeric<>round((o->>'price')::numeric*(o->>'quantity')::numeric,2))
 or (e->>'kind'='shipment' and (e->>'amount')::numeric<>round((o->>'cost')::numeric*(o->>'quantity')::numeric,2))) then raise exception 'Valor financeiro incompatível com pedido'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'creatives') c where not exists(select 1 from jsonb_array_elements(payload->'adsets') a where a->>'id'=c->>'adsetId')) then raise exception 'Conjunto do criativo inexistente'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'orders') o where coalesce(o->>'creativeId','')<>'' and not exists(select 1 from jsonb_array_elements(payload->'creatives') c where c->>'id'=o->>'creativeId' and c->>'adsetId'=o->>'adsetId')) then raise exception 'Criativo não pertence ao conjunto'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'traffic') t1 join jsonb_array_elements(payload->'traffic') t2 on t1->>'id'<>t2->>'id' and t1->>'date'=t2->>'date' and t1->>'adsetId'=t2->>'adsetId' where coalesce(t1->>'creativeId','')='' or coalesce(t2->>'creativeId','')='') then raise exception 'Não combine gasto total e detalhado na mesma data'; end if;
 if exists(select 1 from public.workspaces w, jsonb_array_elements(w.data->'orders') old join jsonb_array_elements(payload->'orders') new on old->>'id'=new->>'id' where w.owner_id=uid and exists(select 1 from jsonb_array_elements(w.data->'entries') e where e->>'orderId'=old->>'id') and (old->'quantity',old->'price',old->'shipping',old->'cost',old->'adsetId',old->'creativeId') is distinct from (new->'quantity',new->'price',new->'shipping',new->'cost',new->'adsetId',new->'creativeId')) then raise exception 'Valores e atribuição de pedido com lançamento são imutáveis'; end if;
 -- Histórico financeiro imutável. Correções devem ser registradas por estorno.
 if current_revision is not null and exists(select 1 from public.workspaces w, jsonb_array_elements(w.data->'entries') old where w.owner_id=uid and not exists(select 1 from jsonb_array_elements(payload->'entries') new where new=old)) then raise exception 'Lançamentos existentes não podem ser removidos ou alterados'; end if;
 insert into public.workspaces(owner_id,data,revision) values(uid,payload,coalesce(current_revision,0)+1) on conflict(owner_id) do update set data=excluded.data,revision=excluded.revision,updated_at=now();
 -- Sincronização relacional na mesma transação da revisão e auditoria.
 insert into public.adsets(owner_id,id,name,budget,active)
 select uid,(a->>'id')::uuid,a->>'name',(a->>'budget')::numeric,(a->>'active')::boolean from jsonb_array_elements(payload->'adsets') a
 on conflict(owner_id,id) do update set name=excluded.name,budget=excluded.budget,active=excluded.active;
 insert into public.creatives(owner_id,id,adset_id,data)
 select uid,(c->>'id')::uuid,(c->>'adsetId')::uuid,c from jsonb_array_elements(payload->'creatives') c
 on conflict(owner_id,id) do update set adset_id=excluded.adset_id,data=excluded.data;
 insert into public.orders(owner_id,id,adset_id,creative_id,data)
 select uid,(o->>'id')::uuid,nullif(o->>'adsetId','')::uuid,nullif(o->>'creativeId','')::uuid,o from jsonb_array_elements(payload->'orders') o
 on conflict(owner_id,id) do update set adset_id=excluded.adset_id,creative_id=excluded.creative_id,data=excluded.data;
 insert into public.financial_entries(owner_id,id,order_id,kind,amount,occurred_on,data)
 select uid,(e->>'id')::uuid,nullif(e->>'orderId','')::uuid,e->>'kind',(e->>'amount')::numeric,(e->>'date')::date,e from jsonb_array_elements(payload->'entries') e on conflict(owner_id,id) do nothing;
 insert into public.traffic(owner_id,id,adset_id,creative_id,occurred_on,spend,data)
 select uid,(t->>'id')::uuid,(t->>'adsetId')::uuid,nullif(t->>'creativeId','')::uuid,(t->>'date')::date,(t->>'spend')::numeric,t from jsonb_array_elements(payload->'traffic') t
 on conflict(owner_id,id) do update set adset_id=excluded.adset_id,creative_id=excluded.creative_id,occurred_on=excluded.occurred_on,spend=excluded.spend,data=excluded.data;
 delete from public.traffic where owner_id=uid and id not in(select (t->>'id')::uuid from jsonb_array_elements(payload->'traffic') t);
 delete from public.orders where owner_id=uid and id not in(select (o->>'id')::uuid from jsonb_array_elements(payload->'orders') o);
 delete from public.creatives where owner_id=uid and id not in(select (c->>'id')::uuid from jsonb_array_elements(payload->'creatives') c);
 delete from public.adsets where owner_id=uid and id not in(select (a->>'id')::uuid from jsonb_array_elements(payload->'adsets') a);
 insert into public.workspace_audit(owner_id,revision,data) values(uid,coalesce(current_revision,0)+1,payload);
 return coalesce(current_revision,0)+1;
end $$;
revoke all on function public.save_workspace(jsonb,bigint) from public;
grant execute on function public.save_workspace(jsonb,bigint) to authenticated;
