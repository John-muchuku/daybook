import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useColorScheme } from "react-native";
import * as repo from "../db/repository";
import { defaultQuery, WorkspaceQuery } from "../db/query";
import { demoData } from "../db/seed";
import { Data, Task, Note, Project, uid } from "../types";
import { nextOccurrence, dateKey } from "../utils/dates";
import { cancelReminder, updateReminder } from "../services/reminders";
const light = {
  bg: "#FFFFFF",
  sidebar: "#F8F9FB",
  text: "#282C34",
  muted: "#707683",
  line: "#ECEDEF",
  accent: "#DD704D",
  soft: "#FBEEE8",
  card: "#FAFAFB",
  input: "#F6F7F9",
  cream: "#FBF6E9",
  lavender: "#F2EFF9",
  green: "#F0F5EF",
};
const dark = {
  bg: "#1C1E23",
  sidebar: "#17191D",
  text: "#F0EFEA",
  muted: "#9B9EA7",
  line: "#34363D",
  accent: "#ED9574",
  soft: "#3D2C26",
  card: "#24272D",
  input: "#2A2D34",
  cream: "#363226",
  lavender: "#302C3B",
  green: "#29362D",
};
type Mode = "Light" | "Dark" | "System";
function useStore() {
  const [data, setData] = useState<Data>({ tasks: [], notes: [], lists: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [mode, setModeState] = useState<Mode>("System");
  const [toast, setToast] = useState("");
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const system = useColorScheme();
  const completing = useRef(new Set<string>());
  const scope = useRef<WorkspaceQuery>({ ...defaultQuery });
  const generation = useRef(0);
  const refresh = async () => {
    const request = ++generation.current;
    const snapshot = await repo.readData(scope.current);
    if (request === generation.current) setData(snapshot);
  };
  const setScope = async (query: Omit<WorkspaceQuery, "limit">) => {
    scope.current = { ...query, limit: 100 };
    try {
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const loadMore = async () => {
    scope.current = { ...scope.current, limit: scope.current.limit + 100 };
    await refresh();
  };
  useEffect(() => {
    (async () => {
      const fresh = await repo.initialize();
      if (
        fresh &&
        (process.env.EXPO_PUBLIC_DEMO === "1" ||
          (__DEV__ && process.env.EXPO_PUBLIC_DEMO !== "0"))
      ) {
        const demo = demoData();
        for (const l of demo.lists) await repo.saveList(l);
        for (const t of demo.tasks) await repo.saveTask(t);
        for (const n of demo.notes) await repo.saveNote(n);
      }
      const saved = await repo.setting("theme");
      if (saved) setModeState(saved as Mode);
      await refresh();
      setReady(true);
    })().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const saveTask = async (t: Task) => {
    const updated = { ...t, updatedAt: new Date().toISOString() };
    await updateReminder(updated);
    await repo.saveTask(updated);
    await refresh();
  };
  const saveNote = async (n: Note) => {
    await repo.saveNote({ ...n, updatedAt: new Date().toISOString() });
    await refresh();
  };
  const saveList = async (l: Project) => {
    const old = data.lists.find((item) => item.id === l.id);
    if (old && old.sortOrder !== l.sortOrder) {
      const ordered = data.lists
        .filter((item) => item.id !== l.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      ordered.splice(Math.max(0, Math.min(l.sortOrder, ordered.length)), 0, l);
      for (let i = 0; i < ordered.length; i++)
        await repo.saveList({ ...ordered[i], sortOrder: i });
    } else await repo.saveList(l);
    await refresh();
  };
  const toggleTask = async (t: Task) => {
    if (completing.current.has(t.id)) return;
    completing.current.add(t.id);
    try {
      const stamp = new Date().toISOString();
      if (t.status === "active") {
        await cancelReminder(t.id);
        const nextId = t.nextOccurrenceId || uid();
        await repo.saveTask({
          ...t,
          status: "completed",
          completedAt: stamp,
          updatedAt: stamp,
          nextOccurrenceId: t.recurrence !== "None" ? nextId : undefined,
        });
        if (t.recurrence !== "None" && !t.nextOccurrenceId) {
          const next = {
            ...t,
            id: nextId,
            nextOccurrenceId: undefined,
            recurrenceDay:
              t.recurrenceDay ||
              new Date(
                (t.dueDate || dateKey()) +
                  "T12:00:00",
              ).getDate(),
            dueDate: nextOccurrence(t),
            subtasks: t.subtasks.map((s) => ({ ...s, completed: false })),
            createdAt: stamp,
            updatedAt: stamp,
          };
          await repo.saveTask(next);
          try {
            await updateReminder(next);
          } catch (e) {
            setError((e as Error).message);
          }
        }
        setToast("Task completed. A little less on your mind.");
      } else {
        const restored = {
          ...t,
          status: "active" as const,
          completedAt: "",
          updatedAt: stamp,
        };
        await repo.saveTask(restored);
        try {
          await updateReminder(restored);
        } catch (e) {
          setError((e as Error).message);
        }
        setToast("Task restored");
      }
      await refresh();
    } finally {
      completing.current.delete(t.id);
    }
  };
  const deleteItem = async (kind: "tasks" | "notes" | "lists", id: string) => {
    if (kind === "tasks") {
      await cancelReminder(id);
      setDeletedTask(data.tasks.find((t) => t.id === id) || null);
    }
    await repo.remove(kind, id);
    await refresh();
  };
  const undoDelete = async () => {
    if (deletedTask) {
      await repo.saveTask(deletedTask);
      try {
        await updateReminder(deletedTask);
      } catch (e) {
        setError((e as Error).message);
      }
      setDeletedTask(null);
      await refresh();
      setToast("Task restored");
    }
  };
  const deleteList = async (id: string, deleteTasks = false) => {
    const items = await repo.itemsInList(id);
    for (const task of items.tasks) {
      if (deleteTasks) {
        await cancelReminder(task.id);
        await repo.remove("tasks", task.id);
      } else await repo.saveTask({ ...task, listId: "" });
    }
    for (const note of items.notes)
      await repo.saveNote({ ...note, listId: "" });
    await repo.remove("lists", id);
    await refresh();
  };
  const setMode = async (value: Mode) => {
    await repo.setting("theme", value);
    setModeState(value);
  };
  return {
    data,
    setScope,
    loadMore,
    ready,
    error,
    setError,
    mode,
    setMode,
    colors:
      mode === "Dark" || (mode === "System" && system === "dark")
        ? dark
        : light,
    saveTask,
    saveNote,
    saveList,
    toggleTask,
    deleteItem,
    deleteList,
    toast,
    setToast,
    deletedTask,
    undoDelete,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function DaybookProvider({ children }: { children: React.ReactNode }) {
  const value = useStore();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDaybook() {
  return useContext(Context)!;
}
