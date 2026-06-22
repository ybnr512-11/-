const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(process.cwd(), "data", "community.db");

function getDb() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC);
  `);
  const columns = db.prepare("PRAGMA table_info(chat_messages)").all();
  if (!columns.some((c) => c.name === "image_url")) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN image_url TEXT");
  }
  return db;
}

function createChatMessage(id, nickname, content, imageUrl = null) {
  const db = getDb();
  const createdAt = Date.now();
  db.prepare(
    "INSERT INTO chat_messages (id, nickname, content, image_url, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, nickname, content, imageUrl, createdAt);
  db.close();
  return { id, nickname, content, image_url: imageUrl, created_at: createdAt };
}

module.exports = { createChatMessage };
