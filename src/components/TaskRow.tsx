import React from "react";
import { View, Pressable, PanResponder, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Task } from "../types";
import { useDaybook } from "../hooks/useDaybook";
import { Icon, Label, s } from "./ui";
import { dateKey, prettyDate, timeLabel } from "../utils/dates";
export function TaskRow({
  task,
  onOpen,
  showDate = false,
}: {
  task: Task;
  onOpen: (t: Task) => void;
  showDate?: boolean;
}) {
  const { colors, data, toggleTask, setError } = useDaybook();
  const project = data.lists.find((l) => l.id === task.listId);
  const completed = task.status === "completed";
  const overdue = !!task.dueDate && task.dueDate < dateKey() && !completed;
  const complete = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    toggleTask(task).catch((e) => setError(e.message));
  };
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 25 && Math.abs(g.dy) < 15,
    onPanResponderRelease: (_, g) => {
      if (g.dx > 70) complete();
      else if (g.dx < -70) onOpen(task);
    },
  });
  return (
    <View
      {...pan.panHandlers}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 77,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        gap: 14,
      }}
    >
      <Pressable
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`Complete ${task.title}`}
        onPress={complete}
        style={{ paddingVertical: 18, paddingLeft: 1, paddingRight: 2 }}
      >
        <View
          style={{
            width: 21,
            height: 21,
            borderRadius: 7,
            borderWidth: 1.5,
            borderColor: completed
              ? "#AEBFB0"
              : task.priority === "High"
                ? "#DFA38E"
                : "#CDD0D6",
            backgroundColor: completed
              ? "#AEBFB0"
              : task.priority === "High"
                ? colors.soft
                : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {completed && <Icon name="checkmark" size={15} color="white" />}
        </View>
      </Pressable>
      <Pressable
        onPress={() => onOpen(task)}
        style={{ flex: 1, paddingVertical: 13, gap: 5 }}
      >
        <Label
          size={14}
          weight="500"
          color={completed ? colors.muted : colors.text}
          style={completed ? { textDecorationLine: "line-through" } : undefined}
        >
          {task.title}
        </Label>
        <View style={[s.row, { gap: 10, flexWrap: "wrap" }]}>
          {!!(task.dueTime || (showDate && task.dueDate)) && (
            <View style={[s.row, { gap: 4 }]}>
              <Icon
                name={overdue ? "calendar-outline" : "time-outline"}
                size={12}
                color={overdue ? colors.accent : colors.muted}
              />
              <Label size={11} color={overdue ? colors.accent : colors.muted}>
                {showDate ? prettyDate(task.dueDate) : ""}
                {showDate && task.dueTime ? " · " : ""}
                {timeLabel(task.dueTime)}
              </Label>
            </View>
          )}
          {task.subtasks.length > 0 && (
            <View style={[s.row, { gap: 4 }]}>
              <Icon name="list-outline" size={13} />
              <Label size={11} color={colors.muted}>
                {task.subtasks.filter((t) => t.completed).length}/
                {task.subtasks.length}
              </Label>
            </View>
          )}
          {task.recurrence !== "None" && (
            <Icon name="repeat-outline" size={13} />
          )}
          {task.tags.map((tag) => (
            <Label key={tag} size={11} color={colors.muted}>
              #{tag}
            </Label>
          ))}
        </View>
      </Pressable>
      {project && (
        <View style={[s.row, { gap: 6 }]}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: project.color,
            }}
          />
          <Label size={11} color={colors.muted}>
            {project.name}
          </Label>
        </View>
      )}
      <Pressable
        hitSlop={6}
        accessibilityLabel={`Actions for ${task.title}`}
        onPress={() => onOpen(task)}
        style={{ padding: 9 }}
      >
        <Icon name="ellipsis-horizontal" size={17} />
      </Pressable>
    </View>
  );
}
