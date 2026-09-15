import { WorkspaceQuery } from "./query";
import { dateKey } from "../utils/dates";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import { Data, Task, Note, Project } from "../types";
let db: SQLiteDatabase;
export async function initialize(): Promise<boolean> {
  db = await openDatabaseAsync("daybook.db");
  await db.execAsync(
    `PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);`,
  );
  const version = await db.getFirstAsync<{ version: number }>(
    "SELECT MAX(version) AS version FROM migrations",
  );
  if (!version?.version) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
 CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL, dueDate TEXT, listId TEXT, updatedAt TEXT, payload TEXT NOT NULL);
 CREATE INDEX task_date_status ON tasks(status,dueDate); CREATE INDEX task_list ON tasks(listId);
 CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT, content TEXT, pinned INTEGER, listId TEXT, updatedAt TEXT, payload TEXT NOT NULL);
 CREATE INDEX note_updated ON notes(pinned,updatedAt);
 CREATE TABLE lists (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
 CREATE TABLE settings (id TEXT PRIMARY KEY, value TEXT NOT NULL);
 INSERT INTO migrations VALUES (1);`);
    });
    return true;
  }
  return false;
}
export async function readData(query?: WorkspaceQuery): Promise<Data> {
  if (query) return readWorkspace(query);
  const [tasks, notes, lists] = await Promise.all(
    ["tasks", "notes", "lists"].map((table) =>
      db.getAllAsync<{ payload: string }>(`SELECT payload FROM ${table}`),
    ),
  );
  return {
    tasks: tasks.map((x) => JSON.parse(x.payload)),
    notes: notes.map((x) => JSON.parse(x.payload)),
    lists: lists.map((x) => JSON.parse(x.payload)),
  };
}
export async function saveTask(t: Task) {
  await db.runAsync(
    "INSERT OR REPLACE INTO tasks VALUES (?,?,?,?,?,?,?)",
    t.id,
    t.title,
    t.status,
    t.dueDate,
    t.listId,
    t.updatedAt,
    JSON.stringify(t),
  );
}
export async function saveNote(n: Note) {
  await db.runAsync(
    "INSERT OR REPLACE INTO notes VALUES (?,?,?,?,?,?,?)",
    n.id,
    n.title,
    n.content,
    Number(n.pinned),
    n.listId,
    n.updatedAt,
    JSON.stringify(n),
  );
}
export async function saveList(l: Project) {
  await db.runAsync(
    "INSERT OR REPLACE INTO lists VALUES (?,?)",
    l.id,
    JSON.stringify(l),
  );
}
export async function remove(kind: "tasks" | "notes" | "lists", id: string) {
  await db.runAsync(`DELETE FROM ${kind} WHERE id = ?`, id);
}
export async function setting(
  key: string,
  value?: string,
): Promise<string | null> {
  if (value !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings VALUES (?,?)",
      key,
      value,
    );
    return value;
  }
  return (
    (
      await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE id=?",
        key,
      )
    )?.value ?? null
  );
}

export async function getTask(id: string) {
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM tasks WHERE id=?",
    id,
  );
  return row ? (JSON.parse(row.payload) as Task) : undefined;
}
export async function itemsInList(id: string) {
  const [tasks, notes] = await Promise.all([
    db.getAllAsync<{ payload: string }>(
      "SELECT payload FROM tasks WHERE listId=?",
      id,
    ),
    db.getAllAsync<{ payload: string }>(
      "SELECT payload FROM notes WHERE listId=?",
      id,
    ),
  ]);
  return {
    tasks: tasks.map((t) => JSON.parse(t.payload) as Task),
    notes: notes.map((n) => JSON.parse(n.payload) as Note),
  };
}
async function readWorkspace(q: WorkspaceQuery): Promise<Data> {
  const today = dateKey();
  const lists = (
    await db.getAllAsync<{ payload: string }>("SELECT payload FROM lists")
  ).map((row) => JSON.parse(row.payload) as Project);
  const groups = await db.getAllAsync<{
    listId: string;
    today: number;
    overdue: number;
    total: number;
  }>(
    "SELECT listId, SUM(dueDate=?) AS today, SUM(dueDate<>'' AND dueDate<?) AS overdue, COUNT(*) AS total FROM tasks WHERE status='active' GROUP BY listId",
    today,
    today,
  );
  const counts = {
    today: groups.reduce((n, g) => n + g.today, 0),
    overdue: groups.reduce((n, g) => n + g.overdue, 0),
    lists: Object.fromEntries(groups.map((g) => [g.listId, g.total])),
  };
  let taskWhere = "t.status='active'",
    noteWhere = "1=1",
    taskOrder = "t.rowid",
    taskArgs: (string | number)[] = [],
    noteArgs: (string | number)[] = [];
  if (q.view === "Tasks") {
    if (q.filter === "Completed") {
      taskWhere = "t.status='completed'";
      taskOrder = "json_extract(t.payload,'$.completedAt') DESC";
    } else if (q.filter === "Today") {
      taskWhere += " AND t.dueDate=?";
      taskArgs.push(today);
    } else if (q.filter === "Upcoming") {
      taskWhere += " AND t.dueDate>?";
      taskArgs.push(today);
      taskOrder = "t.dueDate";
    } else if (q.filter === "Inbox") taskWhere += " AND t.listId=''";
    else if (q.filter !== "All tasks") {
      taskWhere += " AND t.listId=?";
      taskArgs.push(q.filter);
    }
  }
  if (q.view === "Search") {
    taskWhere =
      q.kind === "Completed" ? "t.status='completed'" : "t.status='active'";
    const taskText =
      q.kind === "Tags"
        ? "json_extract(t.payload,'$.tags')"
        : "t.title || ' ' || json_extract(t.payload,'$.description') || ' ' || json_extract(t.payload,'$.tags') || ' ' || COALESCE((SELECT json_extract(l.payload,'$.name') FROM lists l WHERE l.id=t.listId),'')";
    const noteText =
      q.kind === "Tags"
        ? "json_extract(n.payload,'$.tags')"
        : "n.title || ' ' || n.content || ' ' || json_extract(n.payload,'$.tags') || ' ' || COALESCE((SELECT json_extract(l.payload,'$.name') FROM lists l WHERE l.id=n.listId),'')";
    taskWhere += ` AND instr(lower(${taskText}),lower(?))>0`;
    taskArgs.push(q.text);
    noteWhere = `instr(lower(${noteText}),lower(?))>0`;
    noteArgs.push(q.text);
    if (q.date) {
      taskWhere += " AND t.dueDate=?";
      taskArgs.push(q.date);
    }
  }
  let taskGroups: { payload: string }[][];
  if (q.view === "Today")
    taskGroups = await Promise.all([
      db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM tasks WHERE status='active' AND dueDate<>'' AND dueDate<? ORDER BY dueDate LIMIT ?",
        today,
        q.limit + 1,
      ),
      db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM tasks WHERE status='active' AND dueDate=? ORDER BY rowid LIMIT ?",
        today,
        q.limit + 1,
      ),
      db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM tasks WHERE status='active' AND dueDate>? ORDER BY dueDate LIMIT ?",
        today,
        q.limit + 1,
      ),
      db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM tasks WHERE status='completed' AND dueDate=? ORDER BY updatedAt DESC LIMIT ?",
        today,
        q.limit + 1,
      ),
    ]);
  else
    taskGroups = [
      await db.getAllAsync<{ payload: string }>(
        `SELECT t.payload FROM tasks t WHERE ${taskWhere} ORDER BY ${taskOrder} LIMIT ?`,
        ...taskArgs,
        q.limit + 1,
      ),
    ];
  const noteLimit = ["Today", "Tasks"].includes(q.view) ? 3 : q.limit;
  const noteRows = await db.getAllAsync<{ payload: string }>(
    `SELECT n.payload FROM notes n WHERE ${noteWhere} ORDER BY n.pinned DESC,n.updatedAt DESC LIMIT ?`,
    ...noteArgs,
    noteLimit + 1,
  );
  return {
    tasks: taskGroups.flatMap((group) =>
      group.slice(0, q.limit).map((row) => JSON.parse(row.payload)),
    ),
    notes: noteRows.slice(0, noteLimit).map((row) => JSON.parse(row.payload)),
    lists,
    counts,
    hasMore:
      (q.view !== "Notes" &&
        taskGroups.some((group) => group.length > q.limit)) ||
      (["Notes", "Search"].includes(q.view) && noteRows.length > noteLimit),
  };
}
