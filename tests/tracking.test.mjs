import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeProductUrl,
  computeStats,
  alertEligible,
  changePercent,
  targetReached,
} from "../lib/tracking.ts";

test("canonical product identity removes affiliate noise and preserves variants/country", () => {
  assert.equal(
    canonicalizeProductUrl(
      "https://www.amazon.in/name/dp/b09y2myl5c/ref=abc?utm_source=mail&th=1#details",
    ),
    "https://amazon.in/dp/B09Y2MYL5C?th=1",
  );
  assert.equal(
    canonicalizeProductUrl(
      "https://amazon.in/gp/product/B09Y2MYL5C?psc=1&th=1",
    ),
    "https://amazon.in/dp/B09Y2MYL5C?psc=1&th=1",
  );
  assert.equal(
    canonicalizeProductUrl(
      "https://www.flipkart.com/phone/p/item?affid=x&pid=PHONE123",
    ),
    "https://flipkart.com/phone/p/item?pid=PHONE123",
  );
  assert.notEqual(
    canonicalizeProductUrl("https://amazon.in/dp/B09Y2MYL5C"),
    canonicalizeProductUrl("https://amazon.com/dp/B09Y2MYL5C"),
  );
  for (const url of [
    "http://amazon.in/dp/B09Y2MYL5C",
    "https://localhost/item",
    "https://amazon.in.evil.com/item",
    "https://127.0.0.1/item",
    "https://user:password@amazon.in/item",
    "https://amazon.in:8080/item",
    "not a URL",
  ])
    assert.throws(() => canonicalizeProductUrl(url));
});
test("statistics retain personal baseline and reject invalid observations", () => {
  const stats = computeStats(
    [
      { price: 100, checked_at: "2026-10-01" },
      { price: 50, checked_at: "2026-10-03" },
      { price: 80, checked_at: "2026-10-02" },
      { price: NaN, checked_at: "2026-10-04" },
    ],
    120,
  );
  assert.equal(stats.first_price, 120);
  assert.equal(stats.lowest_price, 50);
  assert.equal(stats.highest_price, 100);
  assert.equal(stats.median_price, 80);
  assert.equal(stats.observation_count, 3);
  assert.equal(computeStats([]).median_price, null);
  assert.equal(
    computeStats([
      { price: 100, checked_at: "a" },
      { price: 80, checked_at: "b" },
    ]).median_price,
    90,
  );
});
test("target and percentage rules include boundary and use original baseline", () => {
  assert.equal(alertEligible(90, 100, 90, null), true);
  assert.equal(alertEligible(91, 100, 90, null), false);
  assert.equal(alertEligible(90, 100, null, 10), true);
  assert.equal(alertEligible(89, 100, 80, 10), true);
  assert.equal(alertEligible(90, 100, null, null), false);
  assert.equal(changePercent({ current_price: 80, first_price: 100 }), -20);
  assert.equal(
    targetReached({
      current_price: 80,
      target_price: 90,
      alert_enabled: true,
      paused: true,
    }),
    false,
  );
});
