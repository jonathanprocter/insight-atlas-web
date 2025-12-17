import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, books, insights, libraryItems, contentBlocks, Book, Insight, LibraryItem, ContentBlock, InsertBook, InsertInsight, InsertLibraryItem, InsertContentBlock } from "../drizzle/schema";
import { ENV } from './_core/env';

// Safe JSON parse helper
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON: ${json.substring(0, 100)}...`, error);
    return fallback;
  }
}

// Export for use in other modules
export { safeJsonParse };

let _db: ReturnType<typeof drizzle> | null = null;
let _dbPromise: Promise<ReturnType<typeof drizzle> | null> | null = null;

export async function getDb() {
  // Return existing connection
  if (_db) return _db;
  
  // Create new connection with promise-based locking to prevent race conditions
  if (!_dbPromise && process.env.DATABASE_URL) {
    _dbPromise = (async () => {
      try {
        _db = drizzle(process.env.DATABASE_URL!);
        return _db;
      } catch (error) {
        console.warn("[Database] Failed to connect:", error);
        _dbPromise = null; // Reset for retry
        return null;
      }
    })();
  }
  
  return _dbPromise;
}

// User queries
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Book queries
export async function createBook(book: InsertBook): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(books).values(book);
  if (!result[0]?.insertId) {
    throw new Error("Failed to create book: no insert ID returned");
  }
  return result[0].insertId;
}

export async function getBookById(id: number): Promise<Book | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return result[0];
}

export async function getBooksByUserId(userId: number): Promise<Book[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.userId, userId)).orderBy(desc(books.createdAt));
}

export async function updateBook(id: number, data: Partial<InsertBook>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(books).set(data).where(eq(books.id, id));
}

export async function deleteBook(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(books).where(eq(books.id, id));
}

// Insight queries
export async function createInsight(insight: InsertInsight): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(insights).values(insight);
  if (!result[0]?.insertId) {
    throw new Error("Failed to create insight: no insert ID returned");
  }
  return result[0].insertId;
}

export async function getInsightById(id: number): Promise<Insight | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(insights).where(eq(insights.id, id)).limit(1);
  return result[0];
}

export async function getInsightsByBookId(bookId: number): Promise<Insight[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(insights).where(eq(insights.bookId, bookId)).orderBy(desc(insights.createdAt));
}

export async function getInsightsByUserId(userId: number): Promise<Insight[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(insights).where(eq(insights.userId, userId)).orderBy(desc(insights.createdAt));
}

export async function updateInsight(id: number, data: Partial<InsertInsight>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(insights).set(data).where(eq(insights.id, id));
}

export async function deleteInsight(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(insights).where(eq(insights.id, id));
}

// Library item queries
export async function createLibraryItem(item: InsertLibraryItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(libraryItems).values(item);
  if (!result[0]?.insertId) {
    throw new Error("Failed to create library item: no insert ID returned");
  }
  return result[0].insertId;
}

export async function getLibraryItemsByUserId(userId: number): Promise<LibraryItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(libraryItems).where(eq(libraryItems.userId, userId)).orderBy(desc(libraryItems.lastAccessedAt));
}

export async function getLibraryItemWithDetails(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const items = await db.select().from(libraryItems).where(eq(libraryItems.userId, userId)).orderBy(desc(libraryItems.lastAccessedAt));
  
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const book = await getBookById(item.bookId);
    const insight = item.insightId ? await getInsightById(item.insightId) : undefined;
    return { ...item, book, insight };
  }));
  
  return enrichedItems;
}

export async function updateLibraryItem(id: number, data: Partial<InsertLibraryItem>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(libraryItems).set(data).where(eq(libraryItems.id, id));
}

export async function toggleFavorite(id: number, isFavorite: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(libraryItems).set({ isFavorite }).where(eq(libraryItems.id, id));
}

export async function deleteLibraryItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(libraryItems).where(eq(libraryItems.id, id));
}

export async function searchLibrary(userId: number, query: string): Promise<LibraryItem[]> {
  const db = await getDb();
  if (!db) return [];
  
  const items = await getLibraryItemWithDetails(userId);
  const lowerQuery = query.toLowerCase();
  
  return items.filter(item => 
    item.book?.title.toLowerCase().includes(lowerQuery) ||
    item.book?.author?.toLowerCase().includes(lowerQuery)
  );
}

// Content block queries
export async function createContentBlock(block: InsertContentBlock): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentBlocks).values(block);
  if (!result[0]?.insertId) {
    throw new Error("Failed to create content block: no insert ID returned");
  }
  return result[0].insertId;
}

export async function getContentBlocksByInsightId(insightId: number): Promise<ContentBlock[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentBlocks).where(eq(contentBlocks.insightId, insightId)).orderBy(contentBlocks.orderIndex);
}

export async function deleteContentBlocksByInsightId(insightId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(contentBlocks).where(eq(contentBlocks.insightId, insightId));
}

export async function getLibraryItemById(id: number): Promise<LibraryItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(libraryItems).where(eq(libraryItems.id, id)).limit(1);
  return result[0];
}

export async function getInsightWithContentBlocks(insightId: number) {
  const insight = await getInsightById(insightId);
  if (!insight) return undefined;
  
  const blocks = await getContentBlocksByInsightId(insightId);
  
  return {
    ...insight,
    keyThemes: insight.keyThemes ? JSON.parse(insight.keyThemes) : [],
    contentBlocks: blocks,
  };
}
