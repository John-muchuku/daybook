import React, { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { useDaybook } from "../hooks/useDaybook";
import { Task, Note, Project, Priority, Recurrence, uid } from "../types";
import { Button, Field, Icon, IconButton, Label, s } from "../components/ui";
import { NoteBody } from "../components/NoteBody";
import { CalendarPicker } from "../components/CalendarPicker";
import { offsetDate, dateKey, validDate } from "../utils/dates";
export function Sheet({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const { colors } = useDaybook();
  const { width } = useWindowDimensions();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#11182755",
          justifyContent: width < 600 ? "flex-end" : "center",
          alignItems: "center",
          padding: width < 600 ? 0 : 24,
        }}
      >
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close dialog"
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          style={{
            width: "100%",
            maxWidth: 600,
            maxHeight: "90%",
            backgroundColor: colors.bg,
            borderRadius: width < 600 ? 20 : 16,
            overflow: "hidden",
            boxShadow: "0 20px 80px #00000020",
          }}
        >
          <View
            style={[
              s.between,
              {
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: colors.line,
              },
            ]}
          >
            <Label weight="600" size={16}>
              {title}
            </Label>
            <IconButton name="close" label="Close" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 18 }}
          >
            {children}
          </ScrollView>
          {footer && (
            <View
              style={[
                s.between,
                { padding: 20, borderTopWidth: 1, borderColor: colors.line },
              ]}
            >
              {footer}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function Caption({ children }: { children: string }) {
  const { colors } = useDaybook();
  return (
    <Label
      size={11}
      color={colors.muted}
      weight="600"
      style={{ letterSpacing: 1, marginBottom: 7 }}
    >
      {children.toUpperCase()}
    </Label>
  );
}
function Choices({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  const { colors } = useDaybook();
  return (
    <View style={s.wrap}>
      {values.map((v) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 7,
            backgroundColor: v === value ? colors.soft : colors.input,
            borderWidth: 1,
            borderColor: v === value ? colors.accent : "transparent",
          }}
        >
          <Label size={12} color={v === value ? colors.accent : colors.text}>
            {v || "None"}
          </Label>
        </Pressable>
      ))}
    </View>
  );
}
export function TaskEditor({
  initial,
  onClose,
}: {
  initial: Task;
  onClose: () => void;
}) {
  const { data, colors, saveTask, deleteItem, setToast } = useDaybook();
  const [task, setTask] = useState(initial);
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(
    !!initial.description ||
      !!initial.tags.length ||
      initial.recurrence !== "None" ||
      !!initial.subtasks.length,
  );
  const [busy, setBusy] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  const [subtask, setSubtask] = useState("");
  const existing = !!initial.title;
  const change = (patch: Partial<Task>) =>
    setTask({
      ...task,
      ...patch,
      ...(patch.dueDate !== undefined && patch.dueDate !== task.dueDate
        ? { recurrenceDay: undefined }
        : {}),
    });
  async function save() {
    if (busy) return;
    if (!task.title.trim()) {
      setError("Give your task a title.");
      return;
    }
    if (
      !validDate(task.dueDate) ||
      (task.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime))
    ) {
      setError("Use a valid date (YYYY-MM-DD) and time (HH:MM).");
      return;
    }
    if (task.reminder && !task.dueDate) {
      setError("Choose a date for your reminder.");
      return;
    }
    setBusy(true);
    try {
      await saveTask({
        ...task,
        title: task.title.trim(),
        tags: [...new Set(task.tags.filter(Boolean))],
      });
      setToast(
        existing ? "Task updated" : "Task added. You can let it go now.",
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={existing ? "Task details" : "A little less on your mind."}
      onClose={onClose}
      footer={
        <>
          <View>
            {existing && (
              <Button
                icon="trash-outline"
                onPress={async () => {
                  await deleteItem("tasks", task.id);
                  setToast("Task deleted");
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
          </View>
          <Button primary icon="checkmark" onPress={save}>
            {busy ? "Saving…" : existing ? "Save changes" : "Add task"}
          </Button>
        </>
      }
    >
      <TextInput
        autoFocus={!existing}
        accessibilityLabel="Task title"
        placeholder="What do you need to do?"
        placeholderTextColor={colors.muted}
        value={task.title}
        onChangeText={(title) => change({ title })}
        onSubmitEditing={save}
        style={{
          fontSize: 23,
          fontWeight: "500",
          color: colors.text,
          paddingVertical: 8,
        }}
      />
      <View>
        <Caption>When</Caption>
        <View style={s.wrap}>
          {["Today", "Tomorrow", "This weekend", "Next week", "No date"].map(
            (label, i) => {
              const days = [
                0,
                1,
                (6 - new Date().getDay() + 7) % 7 || 7,
                7,
                -100,
              ];
              const value = i === 4 ? "" : offsetDate(days[i]);
              return (
                <Button
                  small
                  key={label}
                  onPress={() => change({ dueDate: value })}
                  style={{
                    backgroundColor:
                      task.dueDate === value ? colors.soft : colors.input,
                  }}
                >
                  {label}
                </Button>
              );
            },
          )}
          <Button
            small
            icon="calendar-outline"
            onPress={() => setPickingDate(!pickingDate)}
          >
            Pick date
          </Button>
        </View>
        {pickingDate && (
          <CalendarPicker
            value={task.dueDate}
            onChange={(dueDate) => {
              change({ dueDate });
              setPickingDate(false);
            }}
          />
        )}
        <View style={[s.row, { gap: 10, marginTop: 10 }]}>
          <Field
            accessibilityLabel="Due date"
            placeholder="YYYY-MM-DD"
            value={task.dueDate}
            onChangeText={(dueDate) => change({ dueDate })}
            style={{ flex: 1 }}
          />
          <Field
            accessibilityLabel="Due time"
            placeholder="HH:MM"
            value={task.dueTime}
            onChangeText={(dueTime) => change({ dueTime })}
            style={{ width: 110 }}
          />
        </View>
      </View>
      <View>
        <Caption>Priority</Caption>
        <Choices
          values={["None", "Low", "Medium", "High"]}
          value={task.priority}
          onChange={(priority) => change({ priority: priority as Priority })}
        />
      </View>
      <View>
        <Caption>List</Caption>
        <Choices
          values={[
            "Inbox",
            ...data.lists.filter((l) => !l.archived).map((l) => l.name),
          ]}
          value={data.lists.find((l) => l.id === task.listId)?.name || "Inbox"}
          onChange={(name) =>
            change({
              listId: data.lists.find((l) => l.name === name)?.id || "",
            })
          }
        />
      </View>
      <View>
        <Caption>Reminder</Caption>
        <Choices
          values={[
            "None",
            "At due time",
            "5 min",
            "15 min",
            "30 min",
            "1 hour",
            "1 day",
            "Custom",
          ]}
          value={
            (
              {
                "": "None",
                "0": "At due time",
                "5": "5 min",
                "15": "15 min",
                "30": "30 min",
                "60": "1 hour",
                "1440": "1 day",
              } as Record<string, string>
            )[task.reminder] || "Custom"
          }
          onChange={(v) =>
            change({
              reminder: (
                {
                  None: "",
                  "At due time": "0",
                  "5 min": "5",
                  "15 min": "15",
                  "30 min": "30",
                  "1 hour": "60",
                  "1 day": "1440",
                  Custom: "120",
                } as Record<string, string>
              )[v],
            })
          }
        />
        {!["", "0", "5", "15", "30", "60", "1440"].includes(task.reminder) && (
          <Field
            accessibilityLabel="Minutes before due time"
            keyboardType="number-pad"
            value={task.reminder}
            onChangeText={(reminder) =>
              change({ reminder: reminder.replace(/\D/g, "") })
            }
            placeholder="Minutes before due time"
          />
        )}
      </View>
      <Pressable
        onPress={() => setAdvanced(!advanced)}
        style={[s.row, { gap: 7 }]}
      >
        <Icon name={advanced ? "chevron-up" : "chevron-down"} size={15} />
        <Label size={13} color={colors.muted}>
          {advanced ? "Fewer details" : "Add notes, tags, subtasks or repeat"}
        </Label>
      </Pressable>
      {advanced && (
        <>
          <Field
            multiline
            placeholder="Add a little context…"
            value={task.description}
            onChangeText={(description) => change({ description })}
            style={{ minHeight: 90, textAlignVertical: "top" }}
          />
          <View>
            <Caption>Tags</Caption>
            <Field
              placeholder="meeting, followup"
              value={task.tags.join(", ")}
              onChangeText={(v) =>
                change({
                  tags: v.split(",").map((x) => x.trim().replace(/^#/, "")),
                })
              }
            />
          </View>
          <View>
            <Caption>Repeat</Caption>
            <Choices
              values={[
                "None",
                "Daily",
                "Weekdays",
                "Weekly",
                "Monthly",
                "Yearly",
                "Custom",
              ]}
              value={task.recurrence}
              onChange={(v) => change({ recurrence: v as Recurrence })}
            />
            {task.recurrence === "Custom" && (
              <View style={[s.row, { gap: 10, marginTop: 10 }]}>
                <Label size={13}>Every</Label>
                <Field
                  value={String(task.interval)}
                  keyboardType="number-pad"
                  onChangeText={(v) =>
                    change({ interval: Math.max(1, Number(v) || 1) })
                  }
                />
                <Label size={13}>weeks</Label>
              </View>
            )}
          </View>
          <View>
            <Caption>Subtasks</Caption>
            {task.subtasks.map((sub) => (
              <View key={sub.id} style={[s.row, { gap: 10, marginBottom: 8 }]}>
                <Pressable
                  accessibilityLabel={`Toggle ${sub.title}`}
                  onPress={() =>
                    change({
                      subtasks: task.subtasks.map((s) =>
                        s.id === sub.id ? { ...s, completed: !s.completed } : s,
                      ),
                    })
                  }
                >
                  <Icon
                    name={sub.completed ? "checkbox" : "square-outline"}
                    color={sub.completed ? colors.accent : colors.muted}
                  />
                </Pressable>
                <Label style={{ flex: 1 }}>{sub.title}</Label>
                <IconButton
                  name="close"
                  label="Remove subtask"
                  onPress={() =>
                    change({
                      subtasks: task.subtasks.filter((s) => s.id !== sub.id),
                    })
                  }
                />
              </View>
            ))}
            <View style={[s.row, { gap: 10 }]}>
              <Field
                placeholder="Add a subtask"
                value={subtask}
                onChangeText={setSubtask}
                style={{ flex: 1 }}
              />
              <IconButton
                name="add"
                label="Add subtask"
                onPress={() => {
                  if (subtask.trim()) {
                    change({
                      subtasks: [
                        ...task.subtasks,
                        { id: uid(), title: subtask.trim(), completed: false },
                      ],
                    });
                    setSubtask("");
                  }
                }}
              />
            </View>
          </View>
        </>
      )}
      {!!error && (
        <Label color={colors.accent} size={13}>
          {error}
        </Label>
      )}
    </Sheet>
  );
}
export function NoteEditor({
  initial,
  onClose,
}: {
  initial: Note;
  onClose: () => void;
}) {
  const { data, colors, saveNote, deleteItem, setToast } = useDaybook();
  const [note, setNote] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const change = (p: Partial<Note>) => setNote({ ...note, ...p });
  const existing = data.notes.some((n) => n.id === note.id);
  const format = (prefix: string, suffix = "") => {
    const text = note.content;
    change({
      content:
        text.slice(0, selection.start) +
        prefix +
        text.slice(selection.start, selection.end) +
        suffix +
        text.slice(selection.end),
    });
  };
  return (
    <Sheet
      title={existing ? "Your note" : "Make room for an idea."}
      onClose={onClose}
      footer={
        <>
          <View>
            {existing && (
              <Button icon="trash-outline" onPress={() => setConfirm(true)}>
                Delete
              </Button>
            )}
          </View>
          <Button
            primary
            onPress={async () => {
              if (!note.title.trim() && !note.content.trim()) {
                setError("Write something to save your note.");
                return;
              }
              try {
                await saveNote({
                  ...note,
                  tags: [...new Set(note.tags.filter(Boolean))],
                });
                setToast("Note saved");
                onClose();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Save note
          </Button>
        </>
      }
    >
      <View style={s.between}>
        <TextInput
          autoFocus={!existing}
          placeholder="Title (optional)"
          placeholderTextColor={colors.muted}
          value={note.title}
          onChangeText={(title) => change({ title })}
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: colors.text,
            flex: 1,
          }}
        />
        <IconButton
          name={note.pinned ? "pin" : "pin-outline"}
          label="Pin note"
          color={note.pinned ? colors.accent : colors.muted}
          onPress={() => change({ pinned: !note.pinned })}
        />
      </View>
      <View style={[s.row, { gap: 5 }]}>
        {[
          ["H", "# "],
          ["B", "**"],
          ["I", "*"],
          ["•", "\n• "],
          ["1.", "\n1. "],
          ["☐", "\n- [ ] "],
        ].map(([label, prefix]) => (
          <Button
            small
            key={label}
            onPress={() =>
              format(prefix, ["B", "I"].includes(label) ? prefix : "")
            }
          >
            {label}
          </Button>
        ))}
        <Button small onPress={() => setPreview(!preview)}>
          {preview ? "Write" : "Preview"}
        </Button>
      </View>
      {preview ? (
        <View
          style={{
            minHeight: 220,
            padding: 16,
            backgroundColor:
              colors[note.color as "cream" | "lavender" | "green"],
            borderRadius: 8,
          }}
        >
          <NoteBody
            content={note.content}
            onChange={(content) => change({ content })}
          />
        </View>
      ) : (
        <Field
          multiline
          accessibilityLabel="Note content"
          placeholder="Start writing. Anything goes…"
          value={note.content}
          onChangeText={(content) => change({ content })}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          style={{
            minHeight: 220,
            textAlignVertical: "top",
            backgroundColor:
              colors[note.color as "cream" | "lavender" | "green"],
            lineHeight: 25,
          }}
        />
      )}
      <View>
        <Caption>Color</Caption>
        <Choices
          values={["cream", "lavender", "green"]}
          value={note.color}
          onChange={(color) => change({ color })}
        />
      </View>
      <View>
        <Caption>Tags</Caption>
        <Field
          placeholder="idea, meeting"
          value={note.tags.join(", ")}
          onChangeText={(v) =>
            change({
              tags: v.split(",").map((s) => s.trim().replace(/^#/, "")),
            })
          }
        />
      </View>
      <View>
        <Caption>Link to a list</Caption>
        <Choices
          values={[
            "None",
            ...data.lists.filter((l) => !l.archived).map((l) => l.name),
          ]}
          value={data.lists.find((l) => l.id === note.listId)?.name || "None"}
          onChange={(v) =>
            change({ listId: data.lists.find((l) => l.name === v)?.id || "" })
          }
        />
      </View>
      <View>
        <Caption>Link to a task</Caption>
        <Choices
          values={[
            "None",
            ...data.tasks
              .filter((t) => t.status === "active")
              .map((t) => t.title),
          ]}
          value={data.tasks.find((t) => t.id === note.taskId)?.title || "None"}
          onChange={(v) =>
            change({ taskId: data.tasks.find((t) => t.title === v)?.id || "" })
          }
        />
      </View>
      {!!error && <Label color={colors.accent}>{error}</Label>}
      {confirm && (
        <View style={{ gap: 10 }}>
          <Label>Delete this note permanently?</Label>
          <Button
            onPress={async () => {
              await deleteItem("notes", note.id);
              onClose();
            }}
          >
            Yes, delete note
          </Button>
        </View>
      )}
    </Sheet>
  );
}
export function ListEditor({
  initial,
  onClose,
}: {
  initial: Project;
  onClose: () => void;
}) {
  const { colors, data, saveList, deleteList } = useDaybook();
  const [list, setList] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const existing = data.lists.some((l) => l.id === list.id);
  return (
    <Sheet
      title={existing ? "Edit list" : "A place for related things."}
      onClose={onClose}
      footer={
        <>
          <View>
            {existing && (
              <Button onPress={() => setConfirm(true)}>Delete list</Button>
            )}
          </View>
          <Button
            primary
            onPress={async () => {
              if (!list.name.trim()) {
                setError("Give your list a name.");
                return;
              }
              await saveList({ ...list, name: list.name.trim() });
              onClose();
            }}
          >
            Save list
          </Button>
        </>
      }
    >
      <Field
        autoFocus
        placeholder="List name"
        value={list.name}
        onChangeText={(name) => setList({ ...list, name })}
      />
      <View>
        <Caption>Color</Caption>
        <View style={s.wrap}>
          {[
            "#9FADD0",
            "#B6A2C9",
            "#A5B99C",
            "#DCB56D",
            "#CF9990",
            "#DD704D",
          ].map((color) => (
            <Pressable
              accessibilityLabel={`Choose ${color}`}
              onPress={() => setList({ ...list, color })}
              key={color}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: color,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {color === list.color && <Icon name="checkmark" color="white" />}
            </Pressable>
          ))}
        </View>
      </View>
      <View>
        <Caption>Icon</Caption>
        <View style={s.wrap}>
          {[
            "briefcase",
            "person",
            "bag-handle",
            "bulb",
            "wallet",
            "heart",
            "book",
            "home",
          ].map((icon) => (
            <IconButton
              key={icon}
              name={icon as any}
              label={icon}
              color={list.icon === icon ? colors.accent : colors.muted}
              onPress={() => setList({ ...list, icon })}
            />
          ))}
        </View>
      </View>
      {existing && (
        <>
          <Button
            onPress={() => setList({ ...list, archived: !list.archived })}
          >
            {list.archived ? "Unarchive list" : "Archive list"}
          </Button>
          <View style={s.row}>
            <Label>Order</Label>
            <IconButton
              name="arrow-up"
              label="Move up"
              onPress={() =>
                setList({ ...list, sortOrder: list.sortOrder - 1 })
              }
            />
            <Label>{list.sortOrder + 1}</Label>
            <IconButton
              name="arrow-down"
              label="Move down"
              onPress={() =>
                setList({ ...list, sortOrder: list.sortOrder + 1 })
              }
            />
          </View>
        </>
      )}
      {confirm && (
        <View style={{ gap: 10 }}>
          <Label>What should happen to the tasks in this list?</Label>
          <Button
            onPress={async () => {
              await deleteList(list.id);
              onClose();
            }}
          >
            Move tasks to Inbox & delete list
          </Button>
          <Button
            onPress={async () => {
              await deleteList(list.id, true);
              onClose();
            }}
          >
            Permanently delete list & its tasks
          </Button>
          <Label size={12} color={colors.muted}>
            Notes will be kept without a list.
          </Label>
        </View>
      )}
      {!!error && <Label color={colors.accent}>{error}</Label>}
    </Sheet>
  );
}
