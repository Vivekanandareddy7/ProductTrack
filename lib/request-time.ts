import "server-only";
/** One server snapshot keeps relative timestamps consistent across hydration. */
export async function getRequestTime() {
  return Date.now();
}
