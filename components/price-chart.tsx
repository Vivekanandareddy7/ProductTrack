"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import { getPriceHistory } from "@/app/actions";
import { Loader2 } from "lucide-react";

export default function PriceChart({ productId }: { productId: string }) {
  const [data, setData] = useState<{ date: Date; price: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      const history = await getPriceHistory(productId);

      if (!Array.isArray(history)) {
        console.log("PriceChart: Not an array, setting empty");
        setData([]);
        setLoading(false);
        return;
      }

      const chartData = history
        .map(
          (item: {
            checked_at?: string;
            created_at?: string;
            price: number;
          }) => ({
            date: new Date(item.checked_at || item.created_at || ""),
            price: parseFloat(String(item.price)),
          }),
        )
        .filter((point) => !Number.isNaN(point.date.getTime()));

      chartData.sort((a, b) => a.date.getTime() - b.date.getTime());

      setData(chartData);

      setLoading(false);
    }

    loadData();
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 w-full">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading chart...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 w-full">
        No price history yet. Check back after the first daily update!
      </div>
    );
  }

  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold mb-4 text-gray-700">
        Price History
      </h4>
      <AreaChart data={data} aspectRatio="2 / 1">
        <Grid />
        <XAxis />
        <Area
          dataKey="price"
          stroke="#FA5D19"
          fill="#FA5D19"
          fillOpacity={0.25}
        />
        <ChartTooltip dotColor="#FA5D19" indicatorColor="#FA5D19" />
      </AreaChart>
    </div>
  );
}
