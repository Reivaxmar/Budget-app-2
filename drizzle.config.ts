import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite', // 'postgresql' | 'mysql' | 'sqlite'
  // We'll use a SQLite database file in the src/db directory for development
  // In a Tauri app, we might want to use the app data directory, but we'll handle that in the db layer
  dbCredentials: {
    url: 'sqlite:dev.db', // This is for the migrations, we'll override the connection in the db layer
  },
})
