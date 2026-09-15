import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDaybook } from "../hooks/useDaybook";
import {
  Button,
  Empty,
  Icon,
  IconButton,
  IconName,
  Label,
  s,
} from "../components/ui";
import { TaskRow } from "../components/TaskRow";
import { NoteCard } from "../components/NoteCard";
import { Task, Note, Project, newTask, newNote, uid, ViewName } from "../types";
import { dateKey, offsetDate, prettyDate } from "../utils/dates";
import { ListEditor, NoteEditor, Sheet, TaskEditor } from "./Editors";
import { getTask } from "../db/repository";
import { listenForReminder } from "../services/reminders";
const nav: { name: ViewName; icon: IconName }[] = [
  { name: "Today", icon: "sunny-outline" },
  { name: "Tasks", icon: "checkbox-outline" },
  { name: "Notes", icon: "document-text-outline" },
  { name: "Search", icon: "search-outline" },
];
export default function DaybookScreen() {
  const {
    colors,
    data,
    setScope,
    loadMore,
    ready,
    error,
    setError,
    toast,
    mode,
    setMode,
    deletedTask,
    undoDelete,
  } = useDaybook();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const wide = width >= 1250;
  const params = useLocalSearchParams<{
    view?: string;
    filter?: string;
    task?: string;
  }>();
  const view = (
    nav.some((n) => n.name === params.view) ? params.view : "Today"
  ) as ViewName;
  const filter = params.filter || "All tasks";
  const [task, setTask] = useState<Task | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [list, setList] = useState<Project | null>(null);
  const [capture, setCapture] = useState(false);
  const [settings, setSettings] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("All");
  const [searchDate, setSearchDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [noteFilter, setNoteFilter] = useState("All notes");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const navigate = (name: ViewName, nextFilter?: string) =>
    router.setParams({ view: name, filter: nextFilter || "All tasks" });
  useEffect(
    () => listenForReminder((id) => router.setParams({ task: id })),
    [],
  );
  useEffect(() => {
    if (params.task && ready) {
      getTask(params.task)
        .then((found) => {
          if (found) setTask(found);
          else setError("This task is no longer available.");
        })
        .catch((e) => setError(e.message));
      router.setParams({ task: "" });
    }
  }, [params.task, ready]);
  useEffect(() => {
    if (ready)
      setScope({
        view,
        filter,
        text: query,
        kind: searchFilter,
        date: searchDate,
      });
  }, [ready, view, filter, query, searchFilter, searchDate]);
  useEffect(() => {
    if (
      ready &&
      view === "Tasks" &&
      !["All tasks", "Today", "Upcoming", "Inbox", "Completed"].includes(
        filter,
      ) &&
      !data.lists.some((l) => l.id === filter && !l.archived)
    )
      navigate("Tasks");
  }, [ready, view, filter, data.lists]);
  const active = data.tasks.filter((t) => t.status === "active");
  const today = active.filter((t) => t.dueDate === dateKey());
  const overdue = active.filter((t) => !!t.dueDate && t.dueDate < dateKey());
  const upcoming = active
    .filter((t) => t.dueDate > dateKey())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completedToday = data.tasks.filter(
    (t) => t.status === "completed" && t.dueDate === dateKey(),
  );
  const lists = data.lists
    .filter((l) => !l.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const notes = [...data.notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
  const addTask = () => {
    setCapture(false);
    setTask({
      ...newTask(),
      dueDate: view === "Today" ? dateKey() : "",
      listId: lists.some((l) => l.id === filter) ? filter : "",
    });
  };
  const addNote = () => {
    setCapture(false);
    setNote(newNote());
  };
  const addList = () =>
    setList({
      id: uid(),
      name: "",
      icon: "list",
      color: "#9FADD0",
      archived: false,
      sortOrder: data.lists.length,
      createdAt: new Date().toISOString(),
    });
  const section = (
    title: string,
    count?: number,
    action?: React.ReactNode,
    color?: string,
  ) => (
    <View style={[s.between, { marginTop: 29, marginBottom: 6 }]}>
      <View style={[s.row, { gap: 9 }]}>
        <Label size={14} weight="600" color={color}>
          {title}
        </Label>
        {count !== undefined && (
          <View
            style={{
              backgroundColor: colors.input,
              paddingHorizontal: 6,
              borderRadius: 5,
            }}
          >
            <Label size={10} color={colors.muted}>
              {count}
            </Label>
          </View>
        )}
      </View>
      {action}
    </View>
  );
  const navItem = (
    name: string,
    icon: IconName,
    count?: number,
    onPress?: () => void,
    selected = false,
  ) => (
    <Pressable
      key={name}
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ hovered }: any) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 15,
        minHeight: 46,
        borderRadius: 8,
        backgroundColor: selected
          ? colors.soft
          : hovered
            ? colors.line
            : "transparent",
        marginBottom: 4,
      })}
    >
      <Icon
        name={icon}
        size={20}
        color={selected ? colors.accent : colors.muted}
      />
      <Label
        size={13}
        weight={selected ? "600" : "400"}
        color={selected ? colors.accent : colors.text}
        style={{ flex: 1 }}
      >
        {name}
      </Label>
      {count !== undefined && (
        <Label size={11} color={selected ? colors.accent : colors.muted}>
          {count}
        </Label>
      )}
      {name === "Search" && (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 4,
            paddingHorizontal: 4,
          }}
        >
          <Label size={10} color={colors.muted}>
            ⌘ K
          </Label>
        </View>
      )}
    </Pressable>
  );
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        navigate("Search");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setCapture(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
          gap: 20,
        }}
      >
        <ActivityIndicator color={colors.accent} />
        <Label>{error || "Making a little space…"}</Label>
      </View>
    );
  let filteredTasks =
    filter === "Completed"
      ? data.tasks.filter((t) => t.status === "completed")
      : filter === "Today"
        ? today
        : filter === "Upcoming"
          ? upcoming
          : filter === "Inbox"
            ? active.filter((t) => !t.listId)
            : filter === "All tasks"
              ? active
              : active.filter((t) => t.listId === filter);
  if (filter === "Upcoming")
    filteredTasks = [...filteredTasks].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate),
    );
  const match = (parts: string[]) =>
    parts.join(" ").toLowerCase().includes(query.toLowerCase());
  const searchTasks = data.tasks.filter(
    (t) =>
      (searchFilter === "Completed"
        ? t.status === "completed"
        : t.status === "active") &&
      match(
        searchFilter === "Tags"
          ? t.tags
          : [
              t.title,
              t.description,
              ...t.tags,
              data.lists.find((l) => l.id === t.listId)?.name || "",
            ],
      ) &&
      (!searchDate || t.dueDate === searchDate),
  );
  const searchNotes = notes.filter((n) =>
    match(
      searchFilter === "Tags"
        ? n.tags
        : [
            n.title,
            n.content,
            ...n.tags,
            data.lists.find((l) => l.id === n.listId)?.name || "",
          ],
    ),
  );
  const searchLists = lists.filter((l) => match([l.name]));
  const title =
    view === "Tasks"
      ? lists.find((l) => l.id === filter)?.name || filter
      : view;
  const Calendar = () => {
    const year = calendarMonth.getFullYear(),
      month = calendarMonth.getMonth();
    const start = (new Date(year, month, 1).getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    return (
      <View
        style={{
          padding: 20,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 12,
        }}
      >
        <View style={[s.between, { marginBottom: 20 }]}>
          <Label size={13} weight="600">
            {calendarMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Label>
          <View style={s.row}>
            <Pressable
              accessibilityLabel="Previous month"
              onPress={() => setCalendarMonth(new Date(year, month - 1, 1))}
              style={{ padding: 6 }}
            >
              <Icon name="chevron-back" size={13} />
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              onPress={() => setCalendarMonth(new Date(year, month + 1, 1))}
              style={{ padding: 6 }}
            >
              <Icon name="chevron-forward" size={13} />
            </Pressable>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <View
              key={"w" + i}
              style={{
                width: "14.285%",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Label size={9} color={colors.muted}>
                {d}
              </Label>
            </View>
          ))}
          {Array.from({ length: start + total }, (_, i) => {
            const day = i - start + 1;
            const value = dateKey(new Date(year, month, day));
            return (
              <Pressable
                disabled={day < 1}
                onPress={() => setSelectedDate(value)}
                key={i}
                style={{
                  width: "14.285%",
                  height: 35,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {day > 0 && (
                  <View
                    style={{
                      width: 27,
                      height: 27,
                      borderRadius: 9,
                      backgroundColor:
                        value === selectedDate ? colors.accent : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Label
                      size={11}
                      weight={value === dateKey() ? "700" : "400"}
                      color={value === selectedDate ? "white" : colors.text}
                    >
                      {day}
                    </Label>
                    {value !== selectedDate &&
                      active.some((t) => t.dueDate === value) && (
                        <View
                          style={{
                            position: "absolute",
                            bottom: 0,
                            width: 3,
                            height: 3,
                            backgroundColor: colors.accent,
                            borderRadius: 2,
                          }}
                        />
                      )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        {selectedDate !== dateKey() && (
          <View
            style={{
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingTop: 12,
              marginTop: 10,
            }}
          >
            <Label size={11} color={colors.muted}>
              {prettyDate(selectedDate)}
            </Label>
            {active
              .filter((t) => t.dueDate === selectedDate)
              .map((t) => (
                <Pressable key={t.id} onPress={() => setTask(t)}>
                  <Label size={12} style={{ marginTop: 7 }}>
                    {t.title}
                  </Label>
                </Pressable>
              ))}
            {!active.some((t) => t.dueDate === selectedDate) && (
              <Label size={12}>A little breathing room.</Label>
            )}
          </View>
        )}
      </View>
    );
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "bottom"]}
    >
      <StatusBar style={colors.bg === "#FFFFFF" ? "dark" : "light"} />
      <View style={{ flex: 1, flexDirection: "row" }}>
        {desktop && (
          <View
            style={{
              width: 238,
              backgroundColor: colors.sidebar,
              borderRightWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: 19,
              paddingTop: 31,
            }}
          >
            <View
              style={[
                s.row,
                { gap: 10, paddingHorizontal: 12, marginBottom: 35 },
              ]}
            >
              <View
                style={{
                  width: 31,
                  height: 33,
                  backgroundColor: colors.accent,
                  borderRadius: 9,
                  justifyContent: "center",
                  alignItems: "center",
                  transform: [{ rotate: "-5deg" }],
                }}
              >
                <Icon name="checkmark" color="white" size={23} />
              </View>
              <Label size={23} weight="700" style={{ letterSpacing: -1 }}>
                daybook
                <Label size={25} color={colors.accent}>
                  .
                </Label>
              </Label>
            </View>
            <Button
              primary
              icon="add"
              onPress={() => setCapture(true)}
              style={{ marginBottom: 26 }}
            >
              Create new{" "}
              <Label color="#FFFFFF99" size={12}>
                　⌘ N
              </Label>
            </Button>
            {nav.map((n) =>
              navItem(
                n.name,
                n.icon,
                n.name === "Today"
                  ? (data.counts?.today ?? today.length)
                  : undefined,
                () => navigate(n.name),
                view === n.name,
              ),
            )}
            <View
              style={{
                height: 1,
                backgroundColor: colors.line,
                marginVertical: 22,
                marginHorizontal: 13,
              }}
            />
            <View style={[s.between, { paddingLeft: 15, marginBottom: 9 }]}>
              <Label
                size={9}
                weight="600"
                color={colors.muted}
                style={{ letterSpacing: 1.6 }}
              >
                MY LISTS
              </Label>
              <IconButton name="add" label="Create list" onPress={addList} />
            </View>
            {lists.map((l) => (
              <Pressable
                onPress={() => navigate("Tasks", l.id)}
                onLongPress={() => setList(l)}
                key={l.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 15,
                  minHeight: 43,
                  borderRadius: 7,
                  backgroundColor:
                    view === "Tasks" && filter === l.id
                      ? colors.line
                      : "transparent",
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 3,
                    backgroundColor: l.color,
                  }}
                />
                <Label size={13} style={{ flex: 1 }}>
                  {l.name}
                </Label>
                <Label size={10} color={colors.muted}>
                  {(data.counts?.lists[l.id] ??
                    active.filter((t) => t.listId === l.id).length) ||
                    ""}
                </Label>
              </Pressable>
            ))}
            <Pressable
              onPress={addList}
              style={[s.row, { gap: 10, padding: 15 }]}
            >
              <Icon name="add" size={16} />
              <Label size={12} color={colors.muted}>
                New list
              </Label>
            </Pressable>
            <View style={{ flex: 1, minHeight: 30 }} />
            <View style={{ paddingHorizontal: 13, paddingBottom: 25 }}>
              <View style={[s.row, { gap: 7, marginBottom: 25 }]}>
                <Icon name="cloud-done-outline" size={15} color="#98A99B" />
                <Label size={10} color={colors.muted}>
                  All changes saved on this device
                </Label>
              </View>
              <Pressable
                onPress={() => setSettings(true)}
                style={[
                  s.row,
                  {
                    gap: 11,
                    borderTopWidth: 1,
                    borderColor: colors.line,
                    paddingTop: 20,
                  },
                ]}
              >
                <View
                  style={{
                    width: 33,
                    height: 33,
                    borderRadius: 12,
                    backgroundColor: "#EDE5DD",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Label color="#8B7565" size={12} weight="600">
                    J
                  </Label>
                </View>
                <View style={{ flex: 1 }}>
                  <Label size={12} weight="500">
                    My workspace
                  </Label>
                  <Label size={10} color={colors.muted}>
                    A little more intentional.
                  </Label>
                </View>
                <Icon name="settings-outline" size={17} />
              </Pressable>
            </View>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={[
              s.between,
              {
                height: 76,
                borderBottomWidth: 1,
                borderColor: colors.line,
                paddingHorizontal: desktop ? 43 : 22,
              },
            ]}
          >
            <View style={[s.row, { gap: 10 }]}>
              <Icon name={nav.find((n) => n.name === view)!.icon} size={17} />
              <Label size={12} weight="500">
                {view}
              </Label>
              <Label color={colors.line} size={16}>
                /
              </Label>
              <Label size={12} color={colors.muted}>
                Your personal space
              </Label>
            </View>
            <View style={[s.row, { gap: 8 }]}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#9CAF9C",
                }}
              />
              <Label size={10} color={colors.muted}>
                Local & private
              </Label>
              <IconButton
                name={desktop ? "ellipsis-horizontal" : "settings-outline"}
                label="Settings"
                onPress={() => setSettings(true)}
              />
            </View>
          </View>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: desktop ? 44 : 22,
              paddingTop: desktop ? 38 : 25,
              paddingBottom: 100,
            }}
          >
            <View
              style={{ maxWidth: 1160, width: "100%", alignSelf: "center" }}
            >
              <View style={[s.between, { marginBottom: 33 }]}>
                <View style={{ flex: 1 }}>
                  {view === "Today" ? (
                    <>
                      <View style={[s.row, { gap: 9, marginBottom: 9 }]}>
                        <Icon
                          name="sunny-outline"
                          size={15}
                          color={colors.accent}
                        />
                        <Label
                          size={10}
                          weight="500"
                          color={colors.muted}
                          style={{ letterSpacing: 1.3 }}
                        >
                          {new Date()
                            .toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })
                            .toUpperCase()}
                        </Label>
                      </View>
                      <Label
                        size={desktop ? 32 : 29}
                        weight="600"
                        style={{ letterSpacing: -1.1 }}
                      >
                        Good{" "}
                        {new Date().getHours() < 12
                          ? "morning"
                          : new Date().getHours() < 18
                            ? "afternoon"
                            : "evening"}
                        <Label size={30} color={colors.accent}>
                          .
                        </Label>
                      </Label>
                      <Label
                        size={13}
                        color={colors.muted}
                        style={{ marginTop: 7 }}
                      >
                        A fresh page. A little focus. You’ve got this.
                      </Label>
                    </>
                  ) : (
                    <>
                      <Label
                        size={32}
                        weight="600"
                        style={{ letterSpacing: -1 }}
                      >
                        {title}
                      </Label>
                      <Label
                        size={13}
                        color={colors.muted}
                        style={{ marginTop: 7 }}
                      >
                        {view === "Notes"
                          ? "Thoughts worth keeping. Space to think."
                          : view === "Search"
                            ? "Find that thing on your mind."
                            : "Make space for what matters."}
                      </Label>
                    </>
                  )}
                </View>
                {desktop && (
                  <Button
                    icon={view === "Notes" ? "add" : "add"}
                    primary={view !== "Today"}
                    onPress={view === "Notes" ? addNote : addTask}
                    style={
                      view === "Today"
                        ? {
                            backgroundColor: colors.bg,
                            borderWidth: 1,
                            borderColor: colors.line,
                          }
                        : undefined
                    }
                  >
                    {view === "Notes" ? "New note" : "Add task"}
                  </Button>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 42 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {view === "Today" && (
                    <>
                      <View
                        style={{
                          backgroundColor: colors.soft,
                          borderRadius: 10,
                          paddingHorizontal: 19,
                          paddingVertical: 15,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 13,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: colors.bg,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon
                            name="sunny-outline"
                            color={colors.accent}
                            size={20}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Label size={12} weight="500">
                            A little intention goes a long way.
                          </Label>
                          <Label
                            size={11}
                            color={colors.muted}
                            style={{ marginTop: 2 }}
                          >
                            You have {data.counts?.today ?? today.length} tasks
                            on your plate today. One thing at a time.
                          </Label>
                        </View>
                        <Icon
                          name="leaf-outline"
                          color={colors.accent}
                          size={21}
                        />
                      </View>
                      {overdue.length > 0 && (
                        <>
                          {section(
                            "A little overdue",
                            data.counts?.overdue ?? overdue.length,
                            <Label size={10} color={colors.muted}>
                              There’s still time
                            </Label>,
                            colors.accent,
                          )}
                          {overdue.map((t) => (
                            <TaskRow
                              key={t.id}
                              task={t}
                              onOpen={setTask}
                              showDate
                            />
                          ))}
                        </>
                      )}
                      {section(
                        "Today",
                        data.counts?.today ?? today.length,
                        <IconButton
                          name="ellipsis-horizontal"
                          label="Show completed tasks"
                          onPress={() => setShowCompleted(!showCompleted)}
                        />,
                      )}
                      {today.map((t) => (
                        <TaskRow key={t.id} task={t} onOpen={setTask} />
                      ))}
                      {today.length === 0 && (
                        <Empty
                          title="Nothing scheduled for today."
                          description="Enjoy a little breathing room."
                        />
                      )}
                      <Pressable
                        onPress={addTask}
                        style={[s.row, { gap: 12, paddingVertical: 19 }]}
                      >
                        <Icon name="add" size={19} color={colors.muted} />
                        <Label size={12} color={colors.muted}>
                          Add a task to today
                        </Label>
                      </Pressable>
                      {completedToday.length > 0 && (
                        <Pressable
                          onPress={() => setShowCompleted(!showCompleted)}
                          style={[s.row, { gap: 8, marginTop: 1 }]}
                        >
                          <Icon
                            name={
                              showCompleted ? "chevron-down" : "chevron-forward"
                            }
                            size={12}
                          />
                          <Label size={11} color={colors.muted}>
                            {completedToday.length} completed{" "}
                            {completedToday.length === 1 ? "task" : "tasks"}
                          </Label>
                        </Pressable>
                      )}
                      {showCompleted &&
                        completedToday.map((t) => (
                          <TaskRow key={t.id} task={t} onOpen={setTask} />
                        ))}
                      {section(
                        "Coming up",
                        undefined,
                        <Pressable
                          onPress={() => navigate("Tasks", "Upcoming")}
                          style={[s.row, { gap: 5, paddingVertical: 7 }]}
                        >
                          <Label size={11} color={colors.muted}>
                            View all
                          </Label>
                          <Icon name="arrow-forward" size={12} />
                        </Pressable>,
                      )}
                      {upcoming.slice(0, 3).map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          onOpen={setTask}
                          showDate
                        />
                      ))}
                      {!upcoming.length && (
                        <Empty title="The days ahead are open." />
                      )}
                    </>
                  )}
                  {view === "Tasks" && (
                    <>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 18 }}
                        contentContainerStyle={{ gap: 7 }}
                      >
                        {[
                          "All tasks",
                          "Inbox",
                          "Today",
                          "Upcoming",
                          "Completed",
                        ].map((f) => (
                          <Button
                            key={f}
                            small
                            onPress={() => navigate("Tasks", f)}
                            style={{
                              backgroundColor:
                                filter === f ? colors.soft : colors.input,
                            }}
                          >
                            {f}
                          </Button>
                        ))}
                      </ScrollView>
                      {!desktop && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8, marginBottom: 20 }}
                        >
                          {lists.map((l) => (
                            <Button
                              key={l.id}
                              small
                              onPress={() => navigate("Tasks", l.id)}
                              style={{
                                backgroundColor:
                                  filter === l.id ? colors.soft : colors.input,
                              }}
                            >
                              {l.name}
                            </Button>
                          ))}
                          <Button small icon="add" onPress={addList}>
                            List
                          </Button>
                        </ScrollView>
                      )}
                      {lists.some((l) => l.id === filter) && (
                        <Button
                          small
                          icon="settings-outline"
                          onPress={() =>
                            setList(lists.find((l) => l.id === filter)!)
                          }
                        >
                          Edit list
                        </Button>
                      )}
                      {filteredTasks.map((t, i) => (
                        <View key={t.id}>
                          {(filter === "Upcoming" || filter === "Completed") &&
                            (i === 0 ||
                              (filter === "Upcoming"
                                ? filteredTasks[i - 1].dueDate !== t.dueDate
                                : filteredTasks[i - 1].completedAt.slice(
                                    0,
                                    10,
                                  ) !== dateKey(new Date(t.completedAt)))) &&
                            section(
                              prettyDate(
                                filter === "Upcoming"
                                  ? t.dueDate
                                  : dateKey(new Date(t.completedAt)),
                              ),
                            )}
                          <TaskRow task={t} onOpen={setTask} showDate />
                        </View>
                      ))}
                      {!filteredTasks.length && (
                        <Empty
                          title="You’re all caught up."
                          description="Capture a task whenever it comes to mind."
                        />
                      )}
                      <Button
                        icon="add"
                        onPress={addTask}
                        style={{ alignSelf: "flex-start", marginTop: 22 }}
                      >
                        Add a task
                      </Button>
                    </>
                  )}
                  {view === "Notes" && (
                    <>
                      <View style={[s.row, { gap: 8, marginBottom: 24 }]}>
                        {["All notes", "Pinned"].map((f) => (
                          <Button
                            small
                            key={f}
                            onPress={() => setNoteFilter(f)}
                            style={{
                              backgroundColor:
                                noteFilter === f ? colors.soft : colors.input,
                            }}
                          >
                            {f}
                          </Button>
                        ))}
                        <Label size={11} color={colors.muted}>
                          {notes.length} notes
                        </Label>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 16,
                        }}
                      >
                        {notes
                          .filter((n) => noteFilter !== "Pinned" || n.pinned)
                          .map((n) => (
                            <View
                              key={n.id}
                              style={{
                                width: desktop ? "31%" : "100%",
                                flexGrow: 1,
                              }}
                            >
                              <NoteCard note={n} onOpen={setNote} />
                            </View>
                          ))}
                      </View>
                      {notes.filter((n) => noteFilter !== "Pinned" || n.pinned)
                        .length === 0 && (
                        <Empty
                          title="A place for your thoughts."
                          description="Capture an idea, thought or meeting note."
                          icon="document-text-outline"
                        />
                      )}
                    </>
                  )}
                  {view === "Search" && (
                    <>
                      <View
                        style={[
                          s.row,
                          {
                            gap: 10,
                            backgroundColor: colors.input,
                            paddingHorizontal: 16,
                            borderRadius: 10,
                            marginBottom: 18,
                          },
                        ]}
                      >
                        <Icon name="search-outline" />
                        <TextInput
                          autoFocus
                          placeholder="Search tasks, notes, tags, anything…"
                          placeholderTextColor={colors.muted}
                          value={query}
                          onChangeText={setQuery}
                          style={{
                            flex: 1,
                            height: 52,
                            color: colors.text,
                            fontSize: 14,
                          }}
                        />
                        {!!query && (
                          <IconButton
                            name="close"
                            label="Clear search"
                            onPress={() => setQuery("")}
                          />
                        )}
                      </View>
                      <View style={[s.wrap, { marginBottom: 14 }]}>
                        {[
                          "All",
                          "Tasks",
                          "Notes",
                          "Completed",
                          "Date",
                          "Tags",
                        ].map((f) => (
                          <Button
                            small
                            key={f}
                            onPress={() => {
                              setSearchFilter(f);
                              if (f !== "Date") setSearchDate("");
                            }}
                            style={{
                              backgroundColor:
                                searchFilter === f ? colors.soft : colors.input,
                            }}
                          >
                            {f}
                          </Button>
                        ))}
                      </View>
                      {searchFilter === "Date" && (
                        <TextInput
                          placeholder="YYYY-MM-DD"
                          value={searchDate}
                          onChangeText={setSearchDate}
                          style={{
                            color: colors.text,
                            padding: 15,
                            backgroundColor: colors.input,
                            borderRadius: 8,
                          }}
                        />
                      )}
                      {searchFilter !== "Notes" && (
                        <>
                          {section("Tasks", searchTasks.length)}
                          {searchTasks.map((t) => (
                            <TaskRow
                              key={t.id}
                              task={t}
                              onOpen={setTask}
                              showDate
                            />
                          ))}
                        </>
                      )}
                      {!["Tasks", "Completed", "Date"].includes(
                        searchFilter,
                      ) && (
                        <>
                          {section("Notes", searchNotes.length)}
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 14,
                              marginTop: 14,
                            }}
                          >
                            {searchNotes.map((n) => (
                              <NoteCard key={n.id} note={n} onOpen={setNote} />
                            ))}
                          </View>
                        </>
                      )}
                      {searchFilter === "All" && (
                        <>
                          {section("Lists", searchLists.length)}
                          {searchLists.map((l) =>
                            navItem(
                              l.name,
                              l.icon as IconName,
                              data.counts?.lists[l.id] ??
                                active.filter((t) => t.listId === l.id).length,
                              () => navigate("Tasks", l.id),
                            ),
                          )}
                        </>
                      )}
                      {!searchTasks.length &&
                        !searchNotes.length &&
                        !searchLists.length && (
                          <Empty
                            title="Nothing here just yet."
                            description="Try another word or tag."
                            icon="search-outline"
                          />
                        )}
                    </>
                  )}
                </View>
                {wide && view === "Today" && (
                  <View style={{ width: 264, gap: 23 }}>
                    <Calendar />
                    <View
                      style={{
                        padding: 23,
                        backgroundColor: colors.card,
                        borderRadius: 12,
                      }}
                    >
                      <View style={[s.row, { gap: 7, marginBottom: 19 }]}>
                        <Icon name="leaf-outline" size={15} color="#8B9C86" />
                        <Label
                          size={9}
                          weight="600"
                          color={colors.muted}
                          style={{ letterSpacing: 1.5 }}
                        >
                          A GENTLE REMINDER
                        </Label>
                      </View>
                      <Label
                        size={18}
                        weight="500"
                        style={{ lineHeight: 29, letterSpacing: -0.35 }}
                      >
                        You don’t have to do it all. Just the next right thing.
                      </Label>
                      <View
                        style={{
                          height: 2,
                          width: 22,
                          backgroundColor: "#D8DFD4",
                          marginTop: 20,
                          marginBottom: 14,
                        }}
                      />
                      <Label
                        size={11}
                        color={colors.muted}
                        style={{ lineHeight: 19 }}
                      >
                        Progress can be quiet. Small steps still move you
                        forward.
                      </Label>
                    </View>
                    <Pressable
                      onPress={addNote}
                      style={{
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: colors.line,
                        borderRadius: 12,
                        padding: 20,
                        flexDirection: "row",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <Icon name="create-outline" size={21} />
                      <View>
                        <Label size={12} weight="500">
                          Something on your mind?
                        </Label>
                        <Label size={11} color={colors.muted}>
                          Make a quick note{" "}
                          <Icon name="arrow-forward" size={11} />
                        </Label>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
              {data.hasMore && (
                <Button
                  onPress={loadMore}
                  style={{ alignSelf: "center", marginTop: 24 }}
                >
                  Load more
                </Button>
              )}
              {view === "Today" && (
                <View style={{ marginTop: 10 }}>
                  {section(
                    "A few things to keep",
                    undefined,
                    <Pressable
                      onPress={() => navigate("Notes")}
                      style={[s.row, { gap: 5, paddingVertical: 8 }]}
                    >
                      <Label size={11} color={colors.muted}>
                        All notes
                      </Label>
                      <Icon name="arrow-forward" size={12} />
                    </Pressable>,
                  )}
                  <View
                    style={{
                      flexDirection: width >= 700 ? "row" : "column",
                      gap: 16,
                      marginTop: 13,
                    }}
                  >
                    {notes.slice(0, 3).map((n) => (
                      <NoteCard key={n.id} note={n} onOpen={setNote} compact />
                    ))}
                    {!notes.length && (
                      <Empty
                        title="Capture an idea, thought or meeting note."
                        icon="document-text-outline"
                      />
                    )}
                  </View>
                  <View
                    style={[
                      s.row,
                      { justifyContent: "center", gap: 7, marginTop: 33 },
                    ]}
                  >
                    <Icon name="leaf-outline" size={11} />
                    <Label size={10} color={colors.muted}>
                      Less noise. More space for what matters.
                    </Label>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
          {!desktop && (
            <>
              <Pressable
                accessibilityLabel="Create new task or note"
                onPress={() => setCapture(true)}
                style={{
                  position: "absolute",
                  right: 22,
                  bottom: 87,
                  backgroundColor: colors.accent,
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 5px 14px #DD704D40",
                }}
              >
                <Icon name="add" color="white" size={29} />
              </Pressable>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: colors.bg,
                  borderTopWidth: 1,
                  borderColor: colors.line,
                  paddingTop: 9,
                  paddingBottom: 8,
                }}
              >
                {nav.map((n) => (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityLabel={n.name}
                    accessibilityState={{ selected: view === n.name }}
                    onPress={() => navigate(n.name)}
                    key={n.name}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      gap: 4,
                      paddingVertical: 5,
                    }}
                  >
                    <Icon
                      name={n.icon}
                      size={22}
                      color={view === n.name ? colors.accent : colors.muted}
                    />
                    <Label
                      size={10}
                      weight={view === n.name ? "600" : "400"}
                      color={view === n.name ? colors.accent : colors.muted}
                    >
                      {n.name}
                    </Label>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
      {capture && (
        <Sheet title="Make a little space." onClose={() => setCapture(false)}>
          <Button icon="checkbox-outline" onPress={addTask}>
            New task
          </Button>
          <Button icon="document-text-outline" onPress={addNote}>
            New note
          </Button>
          <Label size={12} color={colors.muted} style={{ textAlign: "center" }}>
            Get it out of your head. Come back to it when you’re ready.
          </Label>
        </Sheet>
      )}
      {task && (
        <TaskEditor
          key={task.id}
          initial={task}
          onClose={() => setTask(null)}
        />
      )}
      {note && (
        <NoteEditor
          key={note.id}
          initial={note}
          onClose={() => setNote(null)}
        />
      )}
      {list && (
        <ListEditor
          key={list.id}
          initial={list}
          onClose={() => setList(null)}
        />
      )}
      {settings && (
        <Sheet title="Your workspace" onClose={() => setSettings(false)}>
          <Label weight="600">Appearance</Label>
          <View style={s.wrap}>
            {(["Light", "Dark", "System"] as const).map((m) => (
              <Button
                key={m}
                onPress={() => setMode(m)}
                style={{
                  backgroundColor: mode === m ? colors.soft : colors.input,
                }}
              >
                {m}
              </Button>
            ))}
          </View>
          <Label weight="600">Lists</Label>
          {data.lists.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => {
                setSettings(false);
                setList(l);
              }}
              style={s.between}
            >
              <Label>
                {l.name}
                {l.archived ? " · Archived" : ""}
              </Label>
              <Icon name="chevron-forward" size={15} />
            </Pressable>
          ))}
          <Button
            icon="add"
            onPress={() => {
              setSettings(false);
              addList();
            }}
          >
            Create a list
          </Button>
          <View
            style={{
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingTop: 20,
              gap: 7,
            }}
          >
            <Label weight="600">A calmer kind of productive.</Label>
            <Label size={13} color={colors.muted}>
              Daybook keeps your tasks and notes on this device. No account. No
              noise. Just a little more space.
            </Label>
            <Label size={11} color={colors.muted}>
              Daybook 1.0 · Made for your everyday
            </Label>
          </View>
        </Sheet>
      )}
      {!!toast && (
        <View
          style={{
            position: "absolute",
            bottom: desktop ? 25 : 88,
            alignSelf: "center",
            backgroundColor: colors.text,
            paddingHorizontal: 22,
            paddingVertical: 14,
            borderRadius: 10,
            flexDirection: "row",
            gap: 9,
            alignItems: "center",
            maxWidth: "90%",
          }}
        >
          <Icon name="checkmark-circle-outline" color={colors.bg} size={17} />
          <Label size={12} color={colors.bg}>
            {toast}
          </Label>
          {toast === "Task deleted" && deletedTask && (
            <Pressable
              onPress={() => undoDelete().catch((e) => setError(e.message))}
            >
              <Label size={12} weight="600" color={colors.accent}>
                Undo
              </Label>
            </Pressable>
          )}
        </View>
      )}
      {!!error && (
        <Sheet title="A quick heads-up" onClose={() => setError("")}>
          <Label>{error}</Label>
          <Button onPress={() => setError("")}>Got it</Button>
        </Sheet>
      )}
    </SafeAreaView>
  );
}
