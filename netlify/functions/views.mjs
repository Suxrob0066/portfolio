// Page view counter for the portfolio.
// Each visit is stored as its own blob key (no read-modify-write, so no lost
// updates when two people open the site at the same time). The total is the
// number of keys under "v/".
import { getStore } from "@netlify/blobs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

async function countViews(store) {
  let total = 0;
  for await (const page of store.list({ prefix: "v/", paginate: true })) {
    total += page.blobs.length;
  }
  return total;
}

export default async (req, context) => {
  const store = getStore({ name: "portfolio-views", consistency: "strong" });

  try {
    if (req.method === "POST") {
      const key = `v/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await store.set(key, context.geo?.country?.code ?? "", { onlyIfNew: true });
    }
    return json({ views: await countViews(store) });
  } catch (err) {
    console.error("views error", err);
    return json({ views: null }, 500);
  }
};

export const config = {
  path: "/api/views",
  method: ["GET", "POST"],
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 20 },
};
