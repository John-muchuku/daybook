import { WorkspaceQuery, filterSnapshot } from "./query";
import { Data, Task, Note, Project } from "../types";
const key = "daybook-v1";
function read(): Data {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : { tasks: [], notes: [], lists: [] };
}
export async function initialize() {
  const fresh = !localStorage.getItem(key);
  if (fresh)
    localStorage.setItem(
      key,
      JSON.stringify({ tasks: [], notes: [], lists: [] }),
    );
  return fresh;
}
export async function readData(query?: WorkspaceQuery): Promise<Data> {
  return query ? filterSnapshot(read(), query) : read();
}
function upsert(
  kind: "tasks" | "notes" | "lists",
  item: Task | Note | Project,
) {
  const data = read();
  const rows = data[kind] as (Task | Note | Project)[];
  const index = rows.findIndex((x) => x.id === item.id);
  if (index < 0) rows.push(item);
  else rows[index] = item;
  localStorage.setItem(key, JSON.stringify(data));
}
export async function saveTask(t: Task) {
  upsert("tasks", t);
}
export async function saveNote(n: Note) {
  upsert("notes", n);
}
export async function saveList(l: Project) {
  upsert("lists", l);
}
export async function remove(kind: "tasks" | "notes" | "lists", id: string) {
  const data = read();
  (data[kind] as (Task | Note | Project)[]) = data[kind].filter(
    (x) => x.id !== id,
  );
  localStorage.setItem(key, JSON.stringify(data));
}
export async function setting(
  k: string,
  value?: string,
): Promise<string | null> {
  if (value !== undefined) localStorage.setItem(`daybook-${k}`, value);
  return localStorage.getItem(`daybook-${k}`);
}

export async function getTask(id: string) {
  return read().tasks.find((t) => t.id === id);
}
export async function itemsInList(id: string) {
  const d = read();
  return {
    tasks: d.tasks.filter((t) => t.listId === id),
    notes: d.notes.filter((n) => n.listId === id),
  };
}
