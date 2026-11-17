"use client";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/format";
import type { PricePoint } from "@/utils/types";
export default function PriceHistoryChart({
  history,
  currency,
  target,
}: {
  history: PricePoint[];
  currency: string;
  target?: number | null;
}) {
  const [range, setRange] = useState(0);
  const data = useMemo(() => {
    const valid = history
      .filter(
        (h) =>
          Number.isFinite(Number(h.price)) &&
          Number.isFinite(Date.parse(h.checked_at)),
      )
      .sort((a, b) => a.checked_at.localeCompare(b.checked_at));
    const last = valid.length ? Date.parse(valid.at(-1)!.checked_at) : 0;
    return valid
      .filter(
        (h) => !range || Date.parse(h.checked_at) >= last - range * 86400000,
      )
      .map((h) => ({ time: Date.parse(h.checked_at), price: Number(h.price) }));
  }, [history, range]);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {data.length} observations ·{" "}
          {range ? `last ${range} days of recorded data` : "all recorded data"}
        </p>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {[7, 30, 90, 0].map((days) => (
            <button
              key={days}
              onClick={() => setRange(days)}
              aria-pressed={range === days}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${range === days ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
            >
              {days ? `${days}D` : "All"}
            </button>
          ))}
        </div>
      </div>
      {data.length < 2 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Collecting price history. The chart appears after two successful
          checks.
        </div>
      ) : (
        <div
          className="h-72 w-full"
          role="img"
          aria-label={`Recorded ${currency} prices over time${target ? `, target ${target}` : ""}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 12, bottom: 5, left: 5 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#edf0f5" />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })
                }
                minTickGap={35}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={70}
                domain={[
                  (min: number) => Math.min(min, target || min) * 0.95,
                  (max: number) => Math.max(max, target || max) * 1.05,
                ]}
                tickFormatter={(v) => formatPrice(currency, v)}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(v) =>
                  new Date(Number(v)).toLocaleString("en-IN")
                }
                formatter={(v) => [formatPrice(currency, Number(v)), "Price"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              {target != null && (
                <ReferenceLine
                  y={target}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{
                    value: "Your target",
                    position: "insideTopRight",
                    fill: "#059669",
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="stepAfter"
                dataKey="price"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="#eef2ff"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
