import React from "react";
import { View, Pressable } from "react-native";
import { useDaybook } from "../hooks/useDaybook";
import { Icon, Label, s } from "./ui";
/** A deliberately small Markdown renderer for the supported note formatting. */
export function NoteBody({
  content,
  onChange,
  maxLines,
}: {
  content: string;
  onChange?: (content: string) => void;
  maxLines?: number;
}) {
  const { colors } = useDaybook();
  const lines = content.split("\n");
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) =>
      part.startsWith("**") ? (
        <Label key={i} size={13} weight="700">
          {part.slice(2, -2)}
        </Label>
      ) : part.startsWith("*") ? (
        <Label key={i} size={13} style={{ fontStyle: "italic" }}>
          {part.slice(1, -1)}
        </Label>
      ) : (
        part
      ),
    );
  return (
    <View style={{ gap: 5 }}>
      {lines.slice(0, maxLines).map((line, i) => {
        if (/^[-] \[[ x]\]/.test(line)) {
          const checked = line.startsWith("- [x]");
          return (
            <Pressable
              key={i}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={line.slice(6)}
              disabled={!onChange}
              onPress={() => {
                const next = [...lines];
                next[i] = checked
                  ? line.replace("[x]", "[ ]")
                  : line.replace("[ ]", "[x]");
                onChange?.(next.join("\n"));
              }}
              style={[s.row, { gap: 8, minHeight: maxLines ? 21 : 36 }]}
            >
              <Icon
                size={16}
                name={checked ? "checkbox-outline" : "square-outline"}
                color={checked ? colors.accent : colors.muted}
              />
              <Label
                size={13}
                color={colors.muted}
                style={
                  checked ? { textDecorationLine: "line-through" } : undefined
                }
              >
                {inline(line.slice(6))}
              </Label>
            </Pressable>
          );
        }
        const heading = /^#{1,3} /.test(line);
        return (
          <Label
            key={i}
            size={heading ? 17 : 13}
            weight={heading ? "600" : "400"}
            color={heading ? colors.text : colors.muted}
            style={{ lineHeight: 22 }}
          >
            {inline(line.replace(/^#{1,3} /, "").replace(/^- /, "• "))}
          </Label>
        );
      })}
    </View>
  );
}
