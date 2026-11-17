import { getRequestTime } from "@/lib/request-time";
import TrackerContent from "@/components/tracker-content";
import { createDemoWatchlist } from "@/lib/demo";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Interactive demo",
  description:
    "Explore a sample ProductTrack watchlist, price trends and target alerts.",
};
export default async function DemoPage() {
  const now = await getRequestTime();
  const { products, events, collections, purchases } = createDemoWatchlist(now);
  return (
    <TrackerContent
      products={products}
      collections={collections}
      purchases={purchases}
      events={events}
      user={null}
      demo
      now={now}
    />
  );
}
