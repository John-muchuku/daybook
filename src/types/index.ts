export type Priority = "None" | "Low" | "Medium" | "High";
export type Recurrence =
  "None" | "Daily" | "Weekdays" | "Weekly" | "Monthly" | "Yearly" | "Custom";
export interface Task {
  nextOccurrenceId?: string;
  recurrenceDay?: number;
  id: string;
  title: string;
  description: string;
  status: "active" | "completed";
  priority: Priority;
  dueDate: string;
  dueTime: string;
  reminder: string;
  recurrence: Recurrence;
  interval: number;
  listId: string;
  tags: string[];
  subtasks: { id: string; title: string; completed: boolean }[];
  createdAt: string;
  updatedAt: string;
  completedAt: string;
}
export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  listId: string;
  taskId: string;
  tags: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}
export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
}
export interface Data {
  hasMore?: boolean;
  counts?: { today: number; overdue: number; lists: Record<string, number> };
  tasks: Task[];
  notes: Note[];
  lists: Project[];
}
export type ViewName = "Today" | "Tasks" | "Notes" | "Search";
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const newTask = (): Task => ({
  id: uid(),
  title: "",
  description: "",
  status: "active",
  priority: "None",
  dueDate: "",
  dueTime: "",
  reminder: "",
  recurrence: "None",
  interval: 1,
  listId: "",
  tags: [],
  subtasks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: "",
});
export const newNote = (): Note => ({
  id: uid(),
  title: "",
  content: "",
  pinned: false,
  listId: "",
  taskId: "",
  tags: [],
  color: "cream",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
