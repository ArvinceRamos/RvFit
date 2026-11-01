import { vi } from "vitest";

type Reply = { data?: unknown; error?: { code?: string; message: string } | null; count?: number };

/**
 * A stand-in for the Supabase client. Each table call returns a chainable query that resolves to the
 * reply queued for that table (in order), and rpc() resolves to the reply queued for that function.
 * Every call is recorded, so tests can check what was sent.
 */
export function fakeSupabase() {
  const tableReplies = new Map<string, Reply[]>();
  const rpcReplies = new Map<string, Reply[]>();
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const rpcCalls: { name: string; args: unknown }[] = [];

  function next(map: Map<string, Reply[]>, key: string): Reply {
    const queue = map.get(key) ?? [];
    return queue.shift() ?? { data: null, error: null };
  }

  function query(table: string) {
    let reply: Reply | undefined;
    const chain: Record<string, unknown> = {};
    const methods = ["select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "gte", "lte", "lt", "not", "order", "limit", "range", "ilike", "maybeSingle", "single"];
    for (const method of methods) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.then = (resolve: (value: Reply) => unknown, reject: (reason: unknown) => unknown) => {
      reply ??= next(tableReplies, table);
      return Promise.resolve(reply).then(resolve, reject);
    };
    return chain;
  }

  const client = {
    from: vi.fn((table: string) => query(table)),
    rpc: vi.fn(async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return next(rpcReplies, name);
    }),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: "user-1" }, access_token: "token-1" } }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ error: null })),
    },
  };

  return {
    client,
    calls,
    rpcCalls,
    onTable(table: string, ...replies: Reply[]) {
      tableReplies.set(table, [...(tableReplies.get(table) ?? []), ...replies]);
    },
    onRpc(name: string, ...replies: Reply[]) {
      rpcReplies.set(name, [...(rpcReplies.get(name) ?? []), ...replies]);
    },
    signedOut() {
      client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    },
  };
}
