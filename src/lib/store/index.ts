import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export * from "./types";

const g = globalThis as unknown as { __nammapathStore?: Store };

/** Returns the configured store (Supabase if env vars are set, otherwise the seeded in-memory demo store). */
export function getStore(): Store {
  if (g.__nammapathStore) return g.__nammapathStore;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  g.__nammapathStore = url && key ? new SupabaseStore(url, key, process.env.SUPABASE_PHOTO_BUCKET || "report-photos") : new MemoryStore();
  return g.__nammapathStore;
}

/** Test helper. */
export function setStoreForTests(store: Store | undefined) {
  g.__nammapathStore = store;
}
