import { Data, ViewName } from "../types";
import { dateKey } from "../utils/dates";
export interface WorkspaceQuery {
  view: ViewName;
  filter: string;
  text: string;
  kind: string;
  date: string;
  limit: number;
}
export const defaultQuery: WorkspaceQuery = {
  view: "Today",
  filter: "All tasks",
  text: "",
  kind: "All",
  date: "",
  limit: 100,
};
export function filterSnapshot(data: Data, q: WorkspaceQuery): Data {
  const today = dateKey();
  const active = data.tasks.filter((t) => t.status === "active");
  const counts = {
    today: active.filter((t) => t.dueDate === today).length,
    overdue: active.filter((t) => t.dueDate && t.dueDate < today).length,
    lists: Object.fromEntries(
      data.lists.map((l) => [
        l.id,
        active.filter((t) => t.listId === l.id).length,
      ]),
    ),
  };
  let tasks = data.tasks;
  let notes = [...data.notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
  const match = (text: string) =>
    text.toLocaleLowerCase().includes(q.text.toLocaleLowerCase());
  if (q.view === "Today") {
    const groups = [
      active.filter((t) => t.dueDate && t.dueDate < today),
      active.filter((t) => t.dueDate === today),
      active
        .filter((t) => t.dueDate > today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      tasks.filter((t) => t.status === "completed" && t.dueDate === today),
    ];
    return {
      ...data,
      tasks: groups.flatMap((group) => group.slice(0, q.limit)),
      notes: notes.slice(0, 3),
      counts,
      hasMore: groups.some((group) => group.length > q.limit),
    };
  }
  if (q.view === "Tasks")
    tasks =
      q.filter === "Completed"
        ? tasks
            .filter((t) => t.status === "completed")
            .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        : q.filter === "Today"
          ? active.filter((t) => t.dueDate === today)
          : q.filter === "Upcoming"
            ? active
                .filter((t) => t.dueDate > today)
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            : q.filter === "Inbox"
              ? active.filter((t) => !t.listId)
              : q.filter === "All tasks"
                ? active
                : active.filter((t) => t.listId === q.filter);
  if (q.view === "Search") {
    tasks = tasks.filter(
      (t) =>
        (q.kind === "Completed"
          ? t.status === "completed"
          : t.status === "active") &&
        (!q.date || t.dueDate === q.date) &&
        match(
          q.kind === "Tags"
            ? t.tags.join(" ")
            : [
                t.title,
                t.description,
                ...t.tags,
                data.lists.find((l) => l.id === t.listId)?.name || "",
              ].join(" "),
        ),
    );
    notes = notes.filter((n) =>
      match(
        q.kind === "Tags"
          ? n.tags.join(" ")
          : [
              n.title,
              n.content,
              ...n.tags,
              data.lists.find((l) => l.id === n.listId)?.name || "",
            ].join(" "),
      ),
    );
  }
  return {
    ...data,
    tasks: tasks.slice(0, q.limit),
    notes: notes.slice(0, q.view === "Tasks" ? 3 : q.limit),
    counts,
    hasMore:
      (q.view !== "Notes" && tasks.length > q.limit) ||
      (q.view !== "Tasks" && notes.length > q.limit),
  };
}
