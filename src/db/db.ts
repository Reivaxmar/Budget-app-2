import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
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
const sqlite = new Database('dev.db')

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
