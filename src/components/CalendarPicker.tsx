import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useDaybook } from "../hooks/useDaybook";
import { dateKey, validDate } from "../utils/dates";
import { IconButton, Label, s } from "./ui";
export function CalendarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useDaybook();
  const [month, setMonth] = useState(
    value && validDate(value) ? new Date(value + "T12:00:00") : new Date(),
  );
  const y = month.getFullYear(),
    m = month.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7,
    total = new Date(y, m + 1, 0).getDate();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
      }}
    >
      <View style={s.between}>
        <IconButton
          name="chevron-back"
          label="Previous month"
          onPress={() => setMonth(new Date(y, m - 1, 1))}
        />
        <Label weight="500">
          {month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Label>
        <IconButton
          name="chevron-forward"
          label="Next month"
          onPress={() => setMonth(new Date(y, m + 1, 1))}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <View
            key={"day" + i}
            style={{
              width: "14.285%",
              alignItems: "center",
              paddingVertical: 10,
            }}
          >
            <Label size={11} color={colors.muted}>
              {d}
            </Label>
          </View>
        ))}
        {Array.from({ length: start + total }, (_, i) => {
          const day = i - start + 1;
          const key = dateKey(new Date(y, m, day));
          return (
            <Pressable
              key={i}
              disabled={day < 1}
              accessibilityLabel={day > 0 ? `Select ${key}` : undefined}
              onPress={() => onChange(key)}
              style={{
                width: "14.285%",
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {day > 0 && (
                <View
                  style={{
                    width: 37,
                    height: 37,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      value === key ? colors.accent : "transparent",
                  }}
                >
                  <Label
                    size={13}
                    color={value === key ? "white" : colors.text}
                  >
                    {day}
                  </Label>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
