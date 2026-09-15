/**
 * Local-notification adapter for expo-notifications 57.x.
 *
 * Its root barrel also imports DevicePushTokenAutoRegistration.fx, which registers
 * a remote-push token listener at module evaluation and throws in Android Expo Go.
 * Use only the local API modules so reminders remain available in Expo Go.
 * These package-internal paths are isolated here and checked by a dependency-graph
 * regression test; recheck them when upgrading expo-notifications.
 */
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export {
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
  clearLastNotificationResponse,
} from "expo-notifications/build/NotificationsEmitter";
export { requestPermissionsAsync } from "expo-notifications/build/NotificationPermissions";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
export { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
export type { NotificationResponse } from "expo-notifications/build/Notifications.types";
