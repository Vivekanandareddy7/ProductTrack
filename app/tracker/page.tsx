import { getRequestTime } from "@/lib/request-time";
import TrackerContent from "@/components/tracker-content";
import { getWatchlist } from "@/lib/watchlist";
export const metadata = {
  title: "Your watchlist",
  robots: { index: false, follow: false },
};
export default async function Tracker() {
  const { user, products, events, collections, purchases, error } =
    await getWatchlist();
  return (
    <TrackerContent
      products={products}
      collections={collections}
      purchases={purchases}
      user={user}
      events={events}
      error={error}
      now={await getRequestTime()}
    />
  );
}
