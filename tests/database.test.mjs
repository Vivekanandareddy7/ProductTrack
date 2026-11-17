import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const A = "00000000-0000-0000-0000-000000000001",
  B = "00000000-0000-0000-0000-000000000002";
const P = "10000000-0000-0000-0000-000000000001",
  Q = "10000000-0000-0000-0000-000000000002";

test("migration, private ownership, shared checks, rule crossings and retry leases", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to authenticated;
      insert into auth.users values('${A}'),('${B}');
      create table public.products(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), url text not null, name text, current_price numeric, currency text, image_url text, updated_at timestamp, created_at timestamptz default now(), unique(user_id,url));
      create table public.price_history(id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id), price numeric not null, currency text, checked_at timestamp not null default now());
      insert into public.products(id,user_id,url,name,current_price,currency,updated_at) values
        ('${P}','${A}','https://www.amazon.in/name/dp/B09Y2MYL5C?tag=affiliate','Headphones',100,'INR',now() - interval '2 hours'),
        ('${Q}','${B}','https://amazon.in/dp/B09Y2MYL5C','Headphones',100,'INR',now() - interval '2 hours');
      insert into public.price_history(product_id,price,currency,checked_at) values('${P}',120,'INR',now()-interval '2 days'),('${P}',100,'INR',now()-interval '2 hours'),('${Q}',100,'INR',now()-interval '2 hours');
    `);
    await db.exec(
      await readFile(
        new URL("../migrations/001_shared_tracking.sql", import.meta.url),
        "utf8",
      ),
    );
    const scalar = async (query) => (await db.query(query)).rows[0];
    assert.equal(
      (await scalar("select count(*)::int n from catalog_products")).n,
      1,
      "one shared catalog record",
    );
    assert.equal(
      (await scalar("select count(*)::int n from products")).n,
      2,
      "user watchlists preserved",
    );
    assert.equal(
      Number(
        (await scalar(`select baseline_price from products where id='${P}'`))
          .baseline_price,
      ),
      120,
      "personal baseline preserved",
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${A}';`);
    assert.equal((await scalar("select count(*)::int n from products")).n, 1);
    assert.equal(
      (await scalar("select count(*)::int n from catalog_products")).n,
      1,
      "watchlist member can see shared product",
    );
    assert.ok(
      (await scalar("select count(*)::int n from catalog_price_history")).n > 0,
      "member can read shared history",
    );
    assert.equal(
      (
        await db.query(
          `update products set target_price=50 where id='${Q}' returning id`,
        )
      ).rows.length,
      0,
      "cannot modify another watchlist",
    );
    await assert.rejects(
      db.exec("update products set current_price=1"),
      "browser cannot forge shared price",
    );
    await assert.rejects(
      db.exec(
        `select claim_catalog_check((select catalog_id from products limit 1))`,
      ),
      "user cannot run service RPC",
    );
    await db.exec(
      `update products set target_price=90,alert_enabled=true where id='${P}'; reset role;`,
    );
    await db.exec(`set role anon;`);
    await assert.rejects(
      db.query("select * from products"),
      "anonymous cannot read watchlists",
    );
    await db.exec("reset role;");
    const { id } = await scalar("select id from catalog_products");
    async function check(price) {
      await db.exec(
        `update catalog_products set checked_at=now()-interval '2 hours',next_check_at=null where id='${id}'`,
      );
      await db.exec("set role service_role");
      const { token } = await scalar(
        `select claim_catalog_check('${id}') token`,
      );
      assert.ok(token);
      assert.equal(
        (await scalar(`select claim_catalog_check('${id}') token`)).token,
        null,
        "concurrent claim blocked",
      );
      const changed = (
        await db.query("select complete_catalog_check($1,$2,$3,$4,$5,$6) n", [
          id,
          token,
          "Headphones",
          price,
          "INR",
          null,
        ])
      ).rows[0].n;
      await db.exec("reset role");
      return changed;
    }
    assert.equal(await check(90), 1);
    assert.equal(
      (await scalar("select count(*)::int n from alert_events")).n,
      1,
      "one target crossing creates one event",
    );
    assert.equal(
      (
        await scalar(
          "select count(*)::int n from products where current_price=90",
        )
      ).n,
      2,
      "shared price fans out",
    );
    assert.equal(await check(90), 0);
    assert.equal(
      (await scalar("select count(*)::int n from alert_events")).n,
      1,
      "unchanged repeated checks do not spam",
    );
    await check(95);
    await check(89);
    assert.equal(
      (await scalar("select count(*)::int n from alert_events")).n,
      2,
      "leaving range rearms rule",
    );
    const event = (
      await scalar("select id from alert_events order by created_at limit 1")
    ).id;
    await db.exec("set role service_role");
    const lease = (await scalar(`select claim_alert('${event}') token`)).token;
    assert.ok(lease);
    assert.equal(
      (await scalar(`select claim_alert('${event}') token`)).token,
      null,
      "delivery is leased",
    );
    await db.exec(
      `update alert_events set status='sent',lease_until=null,lease_token=null where id='${event}'; reset role;`,
    );
    assert.equal(
      (await scalar(`select claim_alert('${event}') token`)).token,
      null,
      "sent events never resend",
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${B}';`);
    assert.equal(
      (await scalar("select count(*)::int n from alert_events")).n,
      0,
      "other user cannot see alert history",
    );
    await db.exec(
      `reset role; update products set paused=true where id='${P}';`,
    );
    await check(80);
    assert.equal(
      (await scalar("select count(*)::int n from alert_events")).n,
      2,
      "paused watchlists do not create alerts",
    );
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub='${A}'; delete from products where id='${P}'; reset role;`,
    );
    assert.equal(
      (await scalar("select count(*)::int n from alert_events")).n,
      0,
      "private alert history cascades on remove",
    );
    assert.equal(
      (await scalar("select count(*)::int n from catalog_products")).n,
      1,
      "other watcher retains shared catalog",
    );
  } finally {
    await db.close();
  }
});
