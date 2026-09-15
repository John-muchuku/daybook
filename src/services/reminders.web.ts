import { Task } from "../types";
export async function updateReminder(task: Task) {
  if (task.reminder && task.status === "active")
    throw new Error(
      "Device reminders are available in the iOS and Android app. Open Daybook on your phone to schedule one.",
    );
}
export async function cancelReminder(_id: string) {}
export function listenForReminder(_open: (id: string) => void) {
  return () => {};
}
