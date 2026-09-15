import { Platform } from "react-native";
import * as Notifications from "./local-notifications";
import type { Task } from "../types";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function updateReminder(task: Task) {
  if (!task.reminder || !task.dueDate || task.status === "completed") {
    await cancelReminder(task.id);
    return;
  }
  const minutes = Number(task.reminder);
  if (!Number.isFinite(minutes) || minutes < 0)
    throw new Error("Choose a valid reminder offset.");
  const date = new Date(`${task.dueDate}T${task.dueTime || "09:00"}:00`);
  date.setMinutes(date.getMinutes() - minutes);
  if (Number.isNaN(date.getTime()) || date <= new Date())
    throw new Error("Choose a reminder time in the future.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("tasks", {
      name: "Task reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Enable notifications in device settings to schedule a reminder.",
    );
  await Notifications.cancelScheduledNotificationAsync(task.id);
  await Notifications.scheduleNotificationAsync({
    identifier: task.id,
    content: {
      title: task.title,
      body: task.description || "A little reminder from Daybook.",
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: "tasks",
    },
  });
}
export async function cancelReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}
export function listenForReminder(open: (id: string) => void) {
  const handle = (r: Notifications.NotificationResponse) => {
    const id = r.notification.request.content.data?.taskId;
    if (typeof id === "string") open(id);
  };
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    handle(last);
    Notifications.clearLastNotificationResponse();
  }
  return () => sub.remove();
}
