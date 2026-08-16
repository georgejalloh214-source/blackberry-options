import { PaperPosition } from "@/types";

/**
 * Paper trading storage.
 *
 * Production: Vercel KV / Upstash Redis via REST (KV_REST_API_URL +
 * KV_REST_API_TOKEN) — serverless instances are stateless, so in-memory
 * storage would silently lose positions on Vercel.
 *
 * Local dev fallback: a globalThis-pinned map (survives hot reloads in
 * `next dev`, which is all local dev needs).
 */

const KV_KEY = "bbo:paper-positions";

interface KvClient {
  get(): Promise<PaperPosition[]>;
  set(positions: PaperPosition[]): Promise<void>;
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

  async get(): Promise<PaperPosition[]> {
    const raw = (await this.cmd(["GET", KV_KEY])) as string | null;
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PaperPosition[];
    } catch {
      return [];
    }
  }

  async set(positions: PaperPosition[]): Promise<void> {
    await this.cmd(["SET", KV_KEY, JSON.stringify(positions)]);
  }
}

const globalStore = globalThis as unknown as { __bboPositions?: PaperPosition[] };

class MemoryKv implements KvClient {
  async get(): Promise<PaperPosition[]> {
    return globalStore.__bboPositions ?? [];
  }
  async set(positions: PaperPosition[]): Promise<void> {
    globalStore.__bboPositions = positions;
  }
}

function client(): KvClient {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) return new UpstashKv(url, token);
  return new MemoryKv();
}

export async function loadPositions(): Promise<PaperPosition[]> {
  return client().get();
}

export async function savePositions(positions: PaperPosition[]): Promise<void> {
  return client().set(positions);
}
