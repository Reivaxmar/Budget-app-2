import { drizzle } from 'drizzle-orm/better-sqlite3'
// Use require for better-sqlite3 due to TypeScript esModuleInterop issues
const Database = require('better-sqlite3').default || require('better-sqlite3')
import {
  customers,
  estimates,
  chapters,
  lineItems,
  templates,
  userProfiles,
  standardTexts,
} from './schema'

// Create a SQLite database connection
// In a Tauri app, we should use the app data directory for persistence
// For now, we'll use a file in the current directory for development
let sqliteFilePath
if (process.env.NODE_ENV === 'test') {
  // Use in-memory database for testing
  sqliteFilePath = ':memory:'
} else {
  sqliteFilePath = process.env.TAURI_PLATFORM === 'windows'
    ? `%APPDATA%\\Budget-app-2\\budget.db`
    : `${process.env.HOME}/.local/share/Budget-app-2/budget.db`
}
const sqlite = new Database(sqliteFilePath)

// Initialize Drizzle ORM with the SQLite database
export const db = drizzle(sqlite)

// Export the table schemas for use in repositories
export {
  customers,
  estimates,
  chapters,
  lineItems,
  templates,
  userProfiles,
  standardTexts,
}
