import { PaperPosition } from "@/types";

/**
 * KV storage. Production: Upstash/Vercel KV via REST. Local dev: globalThis map.
 * Generic kvGetJson/kvSetJson serve account config, alerts, auto-exit state.
 */

const POSITIONS_KEY = "bbo:paper-positions";

interface KvClient {
  getRaw(key: string): Promise<string | null>;
  setRaw(key: string, value: string): Promise<void>;
}

class UpstashKv implements KvClient {
  constructor(
    private url: string,
    private token: string
  ) {}

  private async cmd(body: unknown[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KV error ${res.status}`);
    const json = (await res.json()) as { result: unknown };
    return json.result;
  }

  async getRaw(key: string): Promise<string | null> {
    return (await this.cmd(["GET", key])) as string | null;
  }
  async setRaw(key: string, value: string): Promise<void> {
    await this.cmd(["SET", key, value]);
  }
}

const globalStore = globalThis as unknown as { __bboKv?: Map<string, string> };

class MemoryKv implements KvClient {
  private map(): Map<string, string> {
    if (!globalStore.__bboKv) globalStore.__bboKv = new Map();
    return globalStore.__bboKv;
  }
  async getRaw(key: string): Promise<string | null> {
    return this.map().get(key) ?? null;
  }
  async setRaw(key: string, value: string): Promise<void> {
    this.map().set(key, value);
  }
}

function client(): KvClient {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) return new UpstashKv(url, token);
  return new MemoryKv();
}

export async function kvGetJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await client().getRaw(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function kvSetJson<T>(key: string, value: T): Promise<void> {
  await client().setRaw(key, JSON.stringify(value));
}

export async function loadPositions(): Promise<PaperPosition[]> {
  return kvGetJson<PaperPosition[]>(POSITIONS_KEY, []);
}

export async function savePositions(positions: PaperPosition[]): Promise<void> {
  return kvSetJson(POSITIONS_KEY, positions);
}
