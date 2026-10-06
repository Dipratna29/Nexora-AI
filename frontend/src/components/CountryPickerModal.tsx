import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "./common/AppIcon";
import { colors, typography, radius, shadows, spacing } from "../theme";

export interface Country {
  name: string;
  code: string;
  flag: string;
  dial_code: string;
}

export const COUNTRIES: Country[] = [
  { name: "India", code: "IN", flag: "🇮🇳", dial_code: "+91" },
  { name: "United States", code: "US", flag: "🇺🇸", dial_code: "+1" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", dial_code: "+44" },
  { name: "Canada", code: "CA", flag: "🇨🇦", dial_code: "+1" },
  { name: "Australia", code: "AU", flag: "🇦🇺", dial_code: "+61" },
  { name: "Germany", code: "DE", flag: "🇩🇪", dial_code: "+49" },
  { name: "France", code: "FR", flag: "🇫🇷", dial_code: "+33" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪", dial_code: "+971" },
  { name: "Singapore", code: "SG", flag: "🇸🇬", dial_code: "+65" },
  { name: "Japan", code: "JP", flag: "🇯🇵", dial_code: "+81" },
  { name: "Nepal", code: "NP", flag: "🇳🇵", dial_code: "+977" },
  { name: "Sri Lanka", code: "LK", flag: "🇱🇰", dial_code: "+94" },
  { name: "Bangladesh", code: "BD", flag: "🇧🇩", dial_code: "+880" },
  { name: "Thailand", code: "TH", flag: "🇹🇭", dial_code: "+66" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾", dial_code: "+60" },
  { name: "Spain", code: "ES", flag: "🇪🇸", dial_code: "+34" },
  { name: "Italy", code: "IT", flag: "🇮🇹", dial_code: "+39" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭", dial_code: "+41" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱", dial_code: "+31" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿", dial_code: "+64" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", dial_code: "+27" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", dial_code: "+55" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", dial_code: "+52" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦", dial_code: "+966" },
  { name: "Qatar", code: "QA", flag: "🇶🇦", dial_code: "+974" },
];

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountry?: Country;
}

export default function CountryPickerModal({
  visible,
  onClose,
  onSelect,
  selectedCountry,
}: CountryPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial_code.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Country</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search country or code (e.g. +91, India)..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>

          {/* Country list */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code + item.dial_code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = selectedCountry?.code === item.code;
              return (
                <TouchableOpacity
                  style={[styles.countryRow, isSelected && styles.selectedRow]}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.dialCode}>{item.dial_code}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={colors.electricBlue} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0B1538",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: {
    ...typography.h3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(16, 27, 61, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 27, 61, 0.8)",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  selectedRow: {
    backgroundColor: "rgba(36, 107, 255, 0.15)",
  },
  flag: {
    fontSize: 22,
    marginRight: 14,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dialCode: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textAccent,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(61, 123, 255, 0.08)",
    marginHorizontal: 20,
  },
});
