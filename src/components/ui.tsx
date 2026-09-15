import React from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  TextInput,
  TextInputProps,
  ViewStyle,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDaybook } from "../hooks/useDaybook";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useDaybook();
  return <Ionicons name={name} size={size} color={color || colors.muted} />;
}
export function Label({
  children,
  size = 14,
  color,
  weight = "400",
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: "400" | "500" | "600" | "700" | "800";
  style?: any;
}) {
  const { colors } = useDaybook();
  return (
    <Text
      style={[
        {
          fontFamily:
            Platform.OS === "web"
              ? "system-ui, -apple-system, sans-serif"
              : undefined,
          fontSize: size,
          color: color || colors.text,
          fontWeight: weight,
          lineHeight: size * 1.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  children,
  onPress,
  icon,
  primary = false,
  style,
  small = false,
}: {
  children?: React.ReactNode;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const { colors, setError } = useDaybook();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={typeof children === "string" ? children : undefined}
      onPress={async () => {
        try {
          await onPress();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
      style={({ pressed, hovered }: any) => [
        {
          minHeight: small ? 36 : 44,
          paddingHorizontal: small ? 12 : 17,
          borderRadius: 9,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primary ? colors.accent : colors.input,
          opacity: pressed ? 0.7 : 1,
        },
        hovered && { opacity: 0.8 },
        style,
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={small ? 16 : 19}
          color={primary ? "white" : colors.muted}
        />
      )}
      <Label
        size={small ? 12 : 14}
        weight="500"
        color={primary ? "white" : colors.text}
      >
        {children}
      </Label>
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
  color,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ hovered }: any) => ({
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        opacity: hovered ? 0.6 : 1,
      })}
    >
      <Icon name={name} color={color} />
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  const { colors } = useDaybook();
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[
        {
          backgroundColor: colors.input,
          borderRadius: 8,
          padding: 13,
          color: colors.text,
          fontSize: 14,
          minHeight: 46,
        },
        props.style,
      ]}
    />
  );
}
export function Empty({
  title,
  description,
  icon = "checkmark-circle-outline",
}: {
  title: string;
  description?: string;
  icon?: IconName;
}) {
  return (
    <View style={{ alignItems: "center", padding: 36, gap: 9 }}>
      <Icon name={icon} size={28} />
      <Label weight="500">{title}</Label>
      {description && (
        <Label size={13} style={{ textAlign: "center" }}>
          {description}
        </Label>
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
