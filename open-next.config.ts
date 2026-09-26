import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Phase 1 ships no caching or KV/R2 bindings yet. Incremental cache and
// other overrides (see the OpenNext Cloudflare docs) get added in the phase
// that needs them, not preemptively.
export default defineCloudflareConfig({});
