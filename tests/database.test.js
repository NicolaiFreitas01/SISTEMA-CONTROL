import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
import { it } from "vitest";
it("migração, transação, projeção relacional, concorrência e RLS", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    fs.readFileSync(
      new URL(
        "../supabase/migrations/202610200001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const u1 = "11111111-1111-4111-8111-111111111111",
    u2 = "22222222-2222-4222-8222-222222222222";
  await db.query("insert into auth.users values($1),($2)", [u1, u2]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [u1]);
  await db.exec("set role authenticated");
  let data = {
    settings: { price: 97, shipping: 29, cost: 29 },
    orders: [],
    entries: [],
    adsets: [],
    creatives: [],
    traffic: [],
    leads: [],
    goals: [],
    history: [],
  };
  const save = async (d, r) =>
    db.query("select public.save_workspace($1::jsonb,$2) as revision", [
      JSON.stringify(d),
      r,
    ]);
  assert.equal((await save(data, 0)).rows[0].revision, 1);
  await assert.rejects(() => save(data, 0), /outra sessão/);
  console.log(
    "PASS: migração executa; RPC autenticada; concorrência otimista.",
  );
  const oid = "33333333-3333-4333-8333-333333333333";
  data.orders.push({
    id: oid,
    name: "Teste SQL",
    quantity: 1,
    price: 97,
    shipping: 29,
    cost: 29,
    date: "2026-10-20",
    adsetId: "",
    creativeId: "",
  });
  data.entries.push({
    id: "44444444-4444-4444-8444-444444444444",
    orderId: oid,
    kind: "shipping",
    amount: 29,
    date: "2026-10-20",
  });
  assert.equal((await save(data, 1)).rows[0].revision, 2);
  assert.equal(
    (await db.query("select count(*)::int as n from financial_entries")).rows[0]
      .n,
    1,
  );
  await assert.rejects(
    () =>
      save(
        {
          ...data,
          entries: [
            ...data.entries,
            { ...data.entries[0], id: "55555555-5555-4555-8555-555555555555" },
          ],
        },
        2,
      ),
    /duplicado/,
  );
  await assert.rejects(() => save({ ...data, entries: [] }, 2), /não podem/);
  await assert.rejects(
    () =>
      save(
        {
          ...data,
          entries: [
            ...data.entries,
            {
              id: "66666666-6666-4666-8666-666666666666",
              orderId: oid,
              kind: "refund",
              amount: 30,
              date: "2026-10-20",
            },
          ],
        },
        2,
      ),
    /Reembolso/,
  );
  console.log(
    "PASS: tabelas relacionais, duplicação bloqueada, histórico imutável e reembolso validado.",
  );
  await assert.rejects(
    () => db.query("update workspaces set revision=99"),
    /permission denied/,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [u2]);
  assert.equal(
    (await db.query("select count(*)::int as n from workspaces")).rows[0].n,
    0,
  );
  assert.equal(
    (await db.query("select count(*)::int as n from financial_entries")).rows[0]
      .n,
    0,
  );
  assert.equal(
    (await db.query("select count(*)::int as n from workspace_audit")).rows[0]
      .n,
    0,
  );
  await db.exec("reset role");
  await db.exec("set role anon");
  await assert.rejects(
    () => db.query("select * from workspaces"),
    /permission denied/,
  );
  await assert.rejects(() => save(data, 0), /permission denied/);
  console.log(
    "PASS: RLS isola duas contas; gravação direta e acesso anônimo bloqueados.",
  );
  await db.close();
}, 30000);
