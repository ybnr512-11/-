import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.VERCEL
  ? path.join("/tmp", "community.db")
  : path.join(process.cwd(), "data", "community.db");
const uploadsDir = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "public", "uploads");

function ensureDirs() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    ensureDirs();
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function migrateCommentsTable(database: Database.Database) {
  const columns = database.prepare("PRAGMA table_info(comments)").all() as { name: string }[];
  const names = new Set(columns.map((c) => c.name));
  if (!names.has("image_url")) {
    database.exec("ALTER TABLE comments ADD COLUMN image_url TEXT");
  }
  if (!names.has("map_url")) {
    database.exec("ALTER TABLE comments ADD COLUMN map_url TEXT");
  }
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      map_url TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC);
  `);
  migrateCommentsTable(database);
}

export interface Post {
  id: string;
  nickname: string;
  content: string;
  image_url: string | null;
  created_at: number;
  comment_count?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  nickname: string;
  content: string;
  image_url: string | null;
  map_url: string | null;
  created_at: number;
}

export interface ChatMessage {
  id: string;
  nickname: string;
  content: string;
  created_at: number;
}

export function getPosts(limit = 50, offset = 0): Post[] {
  const database = getDb();
  return database
    .prepare(
      `SELECT p.*, COUNT(c.id) as comment_count
       FROM posts p
       LEFT JOIN comments c ON c.post_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Post[];
}

export function getPost(id: string): Post | undefined {
  const database = getDb();
  return database
    .prepare(
      `SELECT p.*, COUNT(c.id) as comment_count
       FROM posts p
       LEFT JOIN comments c ON c.post_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`
    )
    .get(id) as Post | undefined;
}

export function createPost(
  id: string,
  nickname: string,
  content: string,
  imageUrl: string | null
): Post {
  const database = getDb();
  const createdAt = Date.now();
  database
    .prepare(
      "INSERT INTO posts (id, nickname, content, image_url, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, nickname, content, imageUrl, createdAt);
  return { id, nickname, content, image_url: imageUrl, created_at: createdAt, comment_count: 0 };
}

export function getComments(postId: string): Comment[] {
  const database = getDb();
  return database
    .prepare(
      "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC"
    )
    .all(postId) as Comment[];
}

export function createComment(
  id: string,
  postId: string,
  nickname: string,
  content: string,
  imageUrl: string | null = null,
  mapUrl: string | null = null
): Comment {
  const database = getDb();
  const createdAt = Date.now();
  database
    .prepare(
      "INSERT INTO comments (id, post_id, nickname, content, image_url, map_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, postId, nickname, content, imageUrl, mapUrl, createdAt);
  return {
    id,
    post_id: postId,
    nickname,
    content,
    image_url: imageUrl,
    map_url: mapUrl,
    created_at: createdAt,
  };
}

export function getChatMessages(limit = 100): ChatMessage[] {
  const database = getDb();
  const rows = database
    .prepare(
      "SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT ?"
    )
    .all(limit) as ChatMessage[];
  return rows.reverse();
}

export function createChatMessage(
  id: string,
  nickname: string,
  content: string
): ChatMessage {
  const database = getDb();
  const createdAt = Date.now();
  database
    .prepare(
      "INSERT INTO chat_messages (id, nickname, content, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(id, nickname, content, createdAt);
  return { id, nickname, content, created_at: createdAt };
}

export { uploadsDir };
