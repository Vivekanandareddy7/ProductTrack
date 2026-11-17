"use client";
import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { Area, AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import { useChartStable } from "@/components/charts/chart-context";
import { ChartConfigProvider } from "@/components/charts/chart-config-context";
import { formatPrice } from "@/lib/format";
import type { PricePoint } from "@/utils/types";

function TargetLine({ value }: { value: number }) {
  const { yScale, innerWidth, innerHeight } = useChartStable();
  const y = yScale(value);
  if (y < 0 || y > innerHeight) return null;
  return (
    <g aria-hidden="true">
      <line
        x1={0}
        x2={innerWidth}
        y1={y}
        y2={y}
        stroke="#6b7280"
        strokeOpacity=".4"
        strokeDasharray="3 5"
      />
      <text
        x={innerWidth - 2}
        y={Math.max(12, y - 6)}
        textAnchor="end"
        fill="#737373"
        fontSize="10"
      >
        Target
      </text>
    </g>
  );
}
export default function TrackerPriceChart({
  history,
  currency,
  target,
  compact = false,
  color = "#FA5D19",
}: {
  history: PricePoint[];
  currency: string;
  target?: number | null;
  compact?: boolean;
  color?: string;
}) {
  const reduced = useReducedMotion();
  const data = useMemo(
    () =>
      history
        .filter(
          (h) =>
            Number.isFinite(h.price) &&
            Number.isFinite(Date.parse(h.checked_at)),
        )
        .map((h) => ({ date: new Date(h.checked_at), price: h.price }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [history],
  );
  const yDomain = useMemo<[number, number]>(() => {
    const values = data.map((point) => point.price);
    if (target != null && Number.isFinite(target)) values.push(target);
    if (!values.length) return [0, 100];
    const min = Math.min(...values),
      max = Math.max(...values);
    const padding = Math.max((max - min) * 0.18, max * 0.025, 1);
    return [Math.max(0, min - padding), max + padding];
  }, [data, target]);
  if (data.length < 2)
    return (
      <div
        className={`flex items-center justify-center border-y border-dashed border-neutral-200 text-xs text-neutral-400 ${compact ? "h-28" : "h-64"}`}
      >
        Collecting price history · next successful check adds a point
      </div>
    );
  return (
    <div
      role="img"
      aria-label={`Price history, ${data.length} observations in ${currency}`}
      className="tracker-chart"
    >
      <ChartConfigProvider
        value={
          reduced
            ? {
                tooltipSpring: { stiffness: 1000, damping: 100 },
                tooltipBoxSpring: { stiffness: 1000, damping: 100 },
              }
            : undefined
        }
      >
        <AreaChart
          data={data}
          animationDuration={0}
          yDomainTween={false}
          yDomain={yDomain}
          aspectRatio="auto"
          style={{ height: compact ? 96 : 280, touchAction: "pan-y" }}
          margin={{ top: 15, bottom: 24, left: 4, right: 4 }}
        >
          <Grid
            numTicksRows={3}
            stroke="#e5e5e5"
            strokeOpacity={0.65}
            strokeDasharray="2 5"
            fadeHorizontal
            hideHorizontalEdgeLines
          />
          <Area
            dataKey="price"
            stroke={color}
            fill={color}
            fillOpacity={0.25}
            gradientToOpacity={0}
            strokeWidth={1.8}
            animate={false}
            showHighlight={!reduced}
            fadeEdges={false}
          />
          {!compact && target != null && <TargetLine value={target} />}
          <XAxis numTicks={compact ? 3 : 5} />
          <ChartTooltip
            dotColor={color}
            indicatorColor={color}
            dotSize={3}
            damping={reduced ? 0 : 20}
            showDatePill={!compact}
            rows={(point) => [
              {
                color,
                label: "Recorded price",
                value: formatPrice(currency, Number(point.price)),
              },
            ]}
          />
        </AreaChart>
      </ChartConfigProvider>
    </div>
  );
}
