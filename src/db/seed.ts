import { Data, newTask, newNote } from "../types";
import { offsetDate } from "../utils/dates";
export function demoData(): Data {
  const createdAt = new Date().toISOString();
  const lists = [
    ["work", "Work", "briefcase", "#9FADD0"],
    ["personal", "Personal", "person", "#B6A2C9"],
    ["shopping", "Shopping", "bag-handle", "#A5B99C"],
    ["ideas", "Ideas", "bulb", "#DCB56D"],
    ["finance", "Finance", "wallet", "#CF9990"],
  ].map(([id, name, icon, color], sortOrder) => ({
    id,
    name,
    icon,
    color,
    sortOrder,
    archived: false,
    createdAt,
  }));
  const tasks = [
    {
      title: "Submit expense claim",
      listId: "finance",
      dueDate: offsetDate(-1),
      priority: "Medium" as const,
      tags: ["finance"],
    },
    {
      title: "Prepare monthly report",
      listId: "work",
      dueDate: offsetDate(0),
      dueTime: "10:00",
      priority: "High" as const,
      subtasks: [
        { id: "s1", title: "Collect payroll data", completed: true },
        { id: "s2", title: "Review headcount", completed: true },
        { id: "s3", title: "Calculate people cost", completed: false },
        { id: "s4", title: "Prepare slides", completed: false },
        { id: "s5", title: "Send report", completed: false },
      ],
    },
    {
      title: "Call supplier",
      listId: "work",
      dueDate: offsetDate(0),
      dueTime: "14:00",
      tags: ["followup"],
    },
    {
      title: "Review website wireframes",
      listId: "work",
      dueDate: offsetDate(0),
    },
    {
      title: "Buy groceries",
      listId: "shopping",
      dueDate: offsetDate(0),
      subtasks: [
        { id: "s6", title: "Milk & eggs", completed: false },
        { id: "s7", title: "Fresh vegetables", completed: false },
        { id: "s8", title: "Coffee beans", completed: false },
      ],
    },
    {
      title: "Read 10 pages",
      listId: "personal",
      dueDate: offsetDate(0),
      recurrence: "Daily" as const,
    },
    {
      title: "Morning walk",
      listId: "personal",
      dueDate: offsetDate(0),
      status: "completed" as const,
      completedAt: createdAt,
    },
    {
      title: "Team catch-up",
      listId: "work",
      dueDate: offsetDate(1),
      dueTime: "09:30",
    },
    {
      title: "Book vehicle service",
      listId: "personal",
      dueDate: offsetDate(2),
    },
    {
      title: "Review monthly budget",
      listId: "finance",
      dueDate: offsetDate(3),
      priority: "Low" as const,
    },
    { title: "Find a new podcast", listId: "" },
  ].map((t) => ({ ...newTask(), ...t }));
  const notes = [
    {
      title: "Monday team sync",
      content:
        "A few things to keep in mind.\n\n• Keep the onboarding simple\n• Share the first designs by Friday\n• Make space for feedback",
      tags: ["meeting"],
      listId: "work",
      pinned: true,
      color: "cream",
    },
    {
      title: "Little ideas, big possibilities",
      content:
        "A space for the things that could be.\n\nA weekend without a screen.\nA small side project.\nA better morning routine.",
      tags: ["idea"],
      listId: "ideas",
      pinned: true,
      color: "lavender",
    },
    {
      title: "The weekly shop",
      content:
        "- [ ] Oat milk\n- [ ] Sourdough bread\n- [x] Coffee beans\n- [ ] Fresh fruit",
      listId: "shopping",
      color: "green",
    },
  ].map((n) => ({ ...newNote(), ...n }));
  return { tasks, notes, lists };
}
