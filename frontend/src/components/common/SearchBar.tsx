import React from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "./AppIcon";
import { colors, radius, typography } from "../../theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={18} color={colors.textMuted} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, typography.body]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            onChangeText("");
            onClear?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    padding: 0,
  },
});
