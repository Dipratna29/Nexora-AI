import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Speech from "expo-speech";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import api from "../config/api";
import CosmicBackground from "../components/common/CosmicBackground";
import SurfaceCard from "../components/common/SurfaceCard";
import ScreenHeader from "../components/common/ScreenHeader";
import AppIcon from "../components/common/AppIcon";
import CustomBottomNav from "../components/common/CustomBottomNav";
import { colors, typography, radius, spacing } from "../theme";

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Marathi", value: "mr" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Spanish", value: "es" },
];

const COMMON_PHRASES = [
  { category: "Emergency", phrase: "I need medical help" },
  { category: "Safety", phrase: "Call the police please" },
  { category: "Directions", phrase: "Where is the nearest safe zone?" },
  { category: "Transport", phrase: "How much is the taxi fare?" },
];

export default function LanguageScreen() {
  const [text, setText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("hi");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);

  const swapLanguages = () => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
    setText(translatedText);
    setTranslatedText(text);
  };

  const handleTranslate = async (textToTranslate?: string) => {
    const query = (textToTranslate || text).trim();
    if (!query) return;

    setLoading(true);
    try {
      const res = await api.post("/translate", {
        text: query,
        source_language: sourceLanguage,
        target_language: targetLanguage,
      });

      if (res.data && res.data.translated_text) {
        setTranslatedText(res.data.translated_text);
      } else {
        setTranslatedText(query); // Fallback
      }
    } catch {
      // Fallback
      setTranslatedText(query);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (content: string, lang: string) => {
    if (!content) return;
    Speech.speak(content, { language: lang });
  };

  const copyToClipboard = async (content: string) => {
    if (!content) return;
    await Clipboard.setStringAsync(content);
    Alert.alert("Copied", "Text copied to clipboard.");
  };

  return (
    <CosmicBackground>
      <ScreenHeader
        title="Travel Translator"
        subtitle="Real-time translation & voice pronouncer"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* LANGUAGE SELECTOR BAR */}
        <SurfaceCard style={styles.selectorCard} variant="elevated">
          <View style={styles.langSelectorRow}>
            <View style={styles.langPickerCol}>
              <Text style={styles.pickerLabel}>FROM</Text>
              <Text style={styles.pickerVal}>
                {LANGUAGES.find((l) => l.value === sourceLanguage)?.label ?? "English"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.swapBtn}
              onPress={swapLanguages}
              activeOpacity={0.7}
            >
              <AppIcon name="refresh" size={18} color={colors.primary} />
            </TouchableOpacity>

            <View style={[styles.langPickerCol, { alignItems: "flex-end" }]}>
              <Text style={styles.pickerLabel}>TO</Text>
              <Text style={[styles.pickerVal, { color: colors.primary }]}>
                {LANGUAGES.find((l) => l.value === targetLanguage)?.label ?? "Hindi"}
              </Text>
            </View>
          </View>

          {/* QUICK TARGET LANGUAGE CHIPS */}
          <View style={styles.chipsRow}>
            {LANGUAGES.map((l) => {
              const isSel = targetLanguage === l.value;
              return (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.chip, isSel && styles.chipActive]}
                  onPress={() => {
                    setTargetLanguage(l.value);
                    if (text) handleTranslate();
                  }}
                >
                  <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SurfaceCard>

        {/* INPUT CARD */}
        <SurfaceCard style={styles.ioCard}>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={4}
            placeholder="Type phrases or conversation to translate..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
          />

          <View style={styles.ioCardFooter}>
            <TouchableOpacity
              style={[styles.translateBtn, loading && styles.btnDisabled]}
              onPress={() => handleTranslate()}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <AppIcon name="language" size={16} color={colors.background} />
                  <Text style={styles.translateBtnText}>Translate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SurfaceCard>

        {/* OUTPUT CARD */}
        {translatedText ? (
          <SurfaceCard style={[styles.ioCard, styles.outputCard]} variant="elevated">
            <Text style={styles.outputLabel}>TRANSLATION</Text>
            <Text style={styles.outputText}>{translatedText}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => speakText(translatedText, targetLanguage)}
              >
                <AppIcon name="volume-high" size={18} color={colors.primary} />
                <Text style={styles.actionBtnText}>Listen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => copyToClipboard(translatedText)}
              >
                <AppIcon name="copy" size={18} color={colors.textSecondary} />
                <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Copy</Text>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        ) : null}

        {/* COMMON TRAVEL PHRASES */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Common Safety Phrases</Text>
        </View>

        {COMMON_PHRASES.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.phraseItem}
            onPress={() => {
              setText(item.phrase);
              handleTranslate(item.phrase);
            }}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.phraseCategory}>{item.category}</Text>
              <Text style={styles.phraseText}>"{item.phrase}"</Text>
            </View>
            <AppIcon name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* BOTTOM NAV */}
      <CustomBottomNav activeTab="Home" navigation={useNavigation()} />
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  selectorCard: {
    padding: 16,
    marginBottom: 16,
    borderColor: colors.primaryBorder,
  },
  langSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langPickerCol: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  pickerVal: {
    ...typography.h3,
    color: colors.white,
    marginTop: 4,
  },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: "800",
  },
  ioCard: {
    padding: 16,
    marginBottom: 14,
  },
  textInput: {
    color: colors.textPrimary,
    fontSize: 15,
    textAlignVertical: "top",
    minHeight: 80,
  },
  ioCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  translateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
    gap: 6,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  translateBtnText: {
    fontFamily: typography.button.fontFamily,
    fontSize: 13,
    fontWeight: "800",
    color: colors.background,
  },
  outputCard: {
    borderColor: colors.primaryBorder,
  },
  outputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  outputText: {
    ...typography.h3,
    fontSize: 18,
    color: colors.white,
    lineHeight: 26,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 12,
  },
  phraseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phraseCategory: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
  },
  phraseText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    marginTop: 2,
  },
});
