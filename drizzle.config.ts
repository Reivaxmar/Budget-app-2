import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite', // 'postgresql' | 'mysql' | 'sqlite'
  // We'll use a SQLite database file in the src/db directory for development
  // In a Tauri app, we might want to use the app data directory, but we'll handle that in the db layer
  dbCredentials: {
    // Plain file path — drizzle-kit's sqlite dialect uses this directly as a
    // path (via better-sqlite3), not as a URL. A `sqlite:` scheme prefix
    // here previously caused drizzle-kit to create a literal file named
    // `sqlite:dev.db`, which broke `git checkout` on Windows (`:` is not a
    // valid filename character there).
    url: 'dev.db',
  },
})
