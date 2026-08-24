// A minimal in-memory fake of the subset of the supabase-js client this app
// uses (`.from(table)` CRUD chains + `.auth.getUser()`), so repository
// clients can be unit-tested without a real Supabase project/network call.
// Not a general-purpose Postgrest mock — only the chains actually used in
// src/db/*.ts are implemented.

type Row = Record<string, unknown>

function randomId(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

class FakeQueryBuilder {
  private filters: Array<[string, unknown]> = []
  private orderBy: string | null = null
  private pendingInsert: Row[] | null = null
  private pendingUpdate: Row | null = null
  private pendingUpsert: Row | null = null
  private pendingDelete = false
  private wantsSingle = false
  private wantsMaybeSingle = false

  constructor(
    private table: Row[],
    private userId: string
  ) {}

  // supabase-js's `.insert()` accepts either a single row or an array (bulk
  // insert) — dataBackupService's import uses the array form, with explicit
  // `id`s to preserve cross-entity references, so both must be handled
  // and an explicit id must never be clobbered by a generated one.
  insert(rowOrRows: Row | Row[]) {
    this.pendingInsert = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
    return this
  }

  update(row: Row) {
    this.pendingUpdate = row
    return this
  }

  // Single-row-per-user tables (company_profile, app_settings) upsert
  // keyed by `user_id`, mirroring their real Postgres primary key.
  upsert(row: Row) {
    this.pendingUpsert = row
    return this
  }

  delete() {
    this.pendingDelete = true
    return this
  }

  select(_columns?: string) {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }

  order(column: string) {
    this.orderBy = column
    return this
  }

  single() {
    this.wantsSingle = true
    return this
  }

  maybeSingle() {
    this.wantsMaybeSingle = true
    return this
  }

  private matches(row: Row): boolean {
    return this.filters.every(([col, val]) => row[col] === val)
  }

  private run(): { data: unknown; error: { message: string } | null } {
    if (this.pendingInsert) {
      const rows = this.pendingInsert.map((row) => ({
        id: randomId(),
        user_id: this.userId,
        ...row,
      }))
      this.table.push(...rows)
      return { data: rows.length === 1 ? rows[0] : rows, error: null }
    }

    if (this.pendingUpdate) {
      const index = this.table.findIndex((row) => this.matches(row))
      if (index < 0) return { data: null, error: { message: 'Row not found' } }
      this.table[index] = { ...this.table[index], ...this.pendingUpdate }
      return { data: this.table[index], error: null }
    }

    if (this.pendingUpsert) {
      const index = this.table.findIndex((row) => row.user_id === this.pendingUpsert!.user_id)
      if (index >= 0) {
        this.table[index] = { ...this.table[index], ...this.pendingUpsert }
        return { data: this.table[index], error: null }
      }
      this.table.push(this.pendingUpsert)
      return { data: this.pendingUpsert, error: null }
    }

    if (this.pendingDelete) {
      for (let i = this.table.length - 1; i >= 0; i -= 1) {
        if (this.matches(this.table[i])) this.table.splice(i, 1)
      }
      return { data: null, error: null }
    }

    let rows = this.table.filter((row) => this.matches(row))
    if (this.orderBy) {
      rows = [...rows].sort(
        (a, b) => ((a[this.orderBy!] as number) ?? 0) - ((b[this.orderBy!] as number) ?? 0)
      )
    }
    if (this.wantsSingle) {
      return rows.length > 0
        ? { data: rows[0], error: null }
        : { data: null, error: { message: 'No rows found' } }
    }
    if (this.wantsMaybeSingle) {
      return { data: rows[0] ?? null, error: null }
    }
    return { data: rows, error: null }
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

export function createFakeSupabaseClient(userId = 'test-user-id') {
  const tables = new Map<string, Row[]>()
  const tableFor = (name: string): Row[] => {
    if (!tables.has(name)) tables.set(name, [])
    return tables.get(name)!
  }

  return {
    from(table: string) {
      return new FakeQueryBuilder(tableFor(table), userId)
    },
    auth: {
      getUser: async () => ({ data: { user: { id: userId, email: 'test@example.com' } } }),
      // Always "succeeds" — good enough for testing flows that
      // re-authenticate before a destructive action (see importAllData)
      // without modelling real password checks.
      signInWithPassword: async () => ({ data: {}, error: null }),
    },
    // Test-only escape hatches to seed/inspect table state directly and to
    // clear all tables between tests (this client persists for the whole
    // mocked module's lifetime, so `beforeEach` needs a way to reset it).
    __tables: tables,
    __reset: () => tables.clear(),
  }
}
