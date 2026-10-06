/**
 * TrustTrip Design System — Icon Glyph Mappings
 * Standardized semantic icon identifiers using Ionicons.
 */

import { Ionicons } from "../components/common/AppIcon";

export type IconGlyph = string;

export const icons = {
  // Navigation
  home: "home-outline" as IconGlyph,
  homeActive: "home" as IconGlyph,
  explore: "compass-outline" as IconGlyph,
  exploreActive: "compass" as IconGlyph,
  activity: "document-text-outline" as IconGlyph,
  activityActive: "document-text" as IconGlyph,
  profile: "person-outline" as IconGlyph,
  profileActive: "person" as IconGlyph,

  // Core Safety
  sos: "alert-circle" as IconGlyph,
  shield: "shield-checkmark-outline" as IconGlyph,
  shieldActive: "shield-checkmark" as IconGlyph,
  location: "location-outline" as IconGlyph,
  locationActive: "location" as IconGlyph,
  crowd: "people-outline" as IconGlyph,
  womenSafety: "heart-outline" as IconGlyph,
  complaint: "chatbubble-ellipses-outline" as IconGlyph,
  aiAssistant: "sparkles-outline" as IconGlyph,

  // Travel & Marketplace
  guide: "map-outline" as IconGlyph,
  equipment: "cube-outline" as IconGlyph,
  facilities: "business-outline" as IconGlyph,
  fairPricing: "pricetag-outline" as IconGlyph,
  orders: "bag-check-outline" as IconGlyph,
  payments: "card-outline" as IconGlyph,
  language: "language-outline" as IconGlyph,

  // Controls & Actions
  search: "search-outline" as IconGlyph,
  filter: "filter-outline" as IconGlyph,
  notification: "notifications-outline" as IconGlyph,
  notificationActive: "notifications" as IconGlyph,
  settings: "settings-outline" as IconGlyph,
  back: "arrow-back-outline" as IconGlyph,
  close: "close-outline" as IconGlyph,
  check: "checkmark-outline" as IconGlyph,
  chevronRight: "chevron-forward-outline" as IconGlyph,
  chevronDown: "chevron-down-outline" as IconGlyph,
  info: "information-circle-outline" as IconGlyph,
  refresh: "refresh-outline" as IconGlyph,
  phone: "call-outline" as IconGlyph,
  share: "share-social-outline" as IconGlyph,
  trash: "trash-outline" as IconGlyph,
  logout: "log-out-outline" as IconGlyph,
  lock: "lock-closed-outline" as IconGlyph,
  star: "star" as IconGlyph,
  starOutline: "star-outline" as IconGlyph,
  add: "add-outline" as IconGlyph,
  remove: "remove-outline" as IconGlyph,
} as const;

export default icons;
