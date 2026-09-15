import { Task } from "../types";
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
export function prettyDate(value: string) {
  if (!value) return "";
  if (value === dateKey()) return "Today";
  if (value === offsetDate(1)) return "Tomorrow";
  if (value === offsetDate(-1)) return "Yesterday";
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
export function timeLabel(value: string) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export function nextOccurrence(task: Task): string {
  const d = new Date((task.dueDate || dateKey()) + "T12:00:00");
  const originalDay = task.recurrenceDay || d.getDate();
  switch (task.recurrence) {
    case "Daily":
      d.setDate(d.getDate() + 1);
      break;
    case "Weekdays":
      do {
        d.setDate(d.getDate() + 1);
      } while ([0, 6].includes(d.getDay()));
      break;
    case "Weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "Custom":
      d.setDate(d.getDate() + 7 * Math.max(1, task.interval));
      break;
    case "Monthly":
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      d.setDate(
        Math.min(
          originalDay,
          new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
        ),
      );
      break;
    case "Yearly":
      d.setDate(1);
      d.setFullYear(d.getFullYear() + 1);
      d.setDate(
        Math.min(
          originalDay,
          new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
        ),
      );
      break;
  }
  return dateKey(d);
}
export function validDate(value: string) {
  return (
    !value ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      dateKey(new Date(value + "T12:00:00")) === value)
  );
}
