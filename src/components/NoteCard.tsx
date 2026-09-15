import React from "react";
import { View, Pressable } from "react-native";
import { Note } from "../types";
import { useDaybook } from "../hooks/useDaybook";
import { Icon, Label, s } from "./ui";
export function NoteCard({
  note,
  onOpen,
  compact = false,
}: {
  note: Note;
  onOpen: (note: Note) => void;
  compact?: boolean;
}) {
  const { colors, saveNote, setError } = useDaybook();
  const background =
    colors[note.color as "cream" | "lavender" | "green"] || colors.cream;
  return (
    <Pressable
      onPress={() => onOpen(note)}
      style={({ hovered }: any) => ({
        flex: 1,
        minWidth: compact ? 180 : 240,
        borderRadius: 12,
        padding: 21,
        backgroundColor: background,
        minHeight: 210,
        opacity: hovered ? 0.85 : 1,
      })}
    >
      <View style={[s.between, { marginBottom: 13 }]}>
        <View
          style={{
            width: 27,
            height: 30,
            borderWidth: 1,
            borderColor: colors.muted,
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.55,
          }}
        >
          <Icon name="reorder-three-outline" size={21} />
        </View>
        <Pressable
          onPress={() =>
            saveNote({ ...note, pinned: !note.pinned }).catch((e) =>
              setError(e.message),
            )
          }
          accessibilityLabel={note.pinned ? "Unpin note" : "Pin note"}
          style={{ padding: 6 }}
        >
          <Icon
            name={note.pinned ? "pin" : "pin-outline"}
            size={15}
            color={note.pinned ? "#A99C79" : colors.muted}
          />
        </Pressable>
      </View>
      <Label weight="600" size={14}>
        {note.title || note.content.slice(0, 40) || "Untitled note"}
      </Label>
      <View style={{ marginTop: 9, flex: 1 }}>
        {note.content
          .split("\n")
          .slice(0, 4)
          .map((line, i) =>
            /^[-] \[[ x]\]/.test(line) ? (
              <Pressable
                key={i}
                onPress={() => {
                  const lines = note.content.split("\n");
                  lines[i] = line.includes("[x]")
                    ? line.replace("[x]", "[ ]")
                    : line.replace("[ ]", "[x]");
                  saveNote({ ...note, content: lines.join("\n") }).catch((e) =>
                    setError(e.message),
                  );
                }}
                style={[s.row, { gap: 7, marginBottom: 4 }]}
              >
                <Icon
                  size={14}
                  name={
                    line.includes("[x]") ? "checkbox-outline" : "square-outline"
                  }
                />
                <Label size={12} color={colors.muted}>
                  {line.slice(6)}
                </Label>
              </Pressable>
            ) : (
              <Label
                key={i}
                size={12}
                color={colors.muted}
                style={{ lineHeight: 20 }}
              >
                {line.replace(/^#+ /, "").replace(/\*\*/g, "")}
              </Label>
            ),
          )}
      </View>
      <View style={[s.between, { marginTop: 17 }]}>
        <Label size={10} color={colors.muted}>
          {note.tags.length ? "#" + note.tags[0] : "Just a little note"}
        </Label>
        <Label size={10} color={colors.muted}>
          {new Date(note.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </Label>
      </View>
    </Pressable>
  );
}
