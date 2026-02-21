// Content limits
export const MAX_BLEAT_LENGTH = 280;
export const MAX_BIO_LENGTH = 160;
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_USERNAME_LENGTH = 30;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_IMAGES_PER_BLEAT = 4;
export const MAX_POLL_OPTIONS = 4;
export const MIN_POLL_OPTIONS = 2;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Rate limits
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 100;
export const RATE_LIMIT_REQUESTS_PER_MINUTE_IP = 1000;

// Token expiration
export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const EMAIL_VERIFICATION_EXPIRY_SECONDS = 15 * 60; // 15 minutes
export const PASSWORD_RESET_EXPIRY_SECONDS = 60 * 60; // 1 hour

// Fleece Themes
export const FLEECE_THEMES = [
  "keaney_blue",
  "white_wool",
  "golden_ram",
  "night_pasture",
  "pride_fleece",
] as const;

export type FleeceTheme = (typeof FLEECE_THEMES)[number];

// Horn Styles
export const HORN_STYLES = [
  "classic",
  "golden",
  "silver",
  "bronze",
  "rainbow",
  "fire",
  "ice",
] as const;

export type HornStyle = (typeof HORN_STYLES)[number];

// Ramzee Terminology Mapping
export const TERMINOLOGY = {
  post: "Bleat",
  posts: "Bleats",
  like: "Huff",
  likes: "Huffs",
  repost: "Rebaa",
  reposts: "Rebaas",
  follow: "Graze",
  following: "Grazing",
  followers: "Flock",
  feed: "Pasture",
  explore: "Meadow",
  group: "Herd",
  groups: "Herds",
  dm: "Barn Chat",
  hashtag: "Ram Tag",
  verified: "Golden Fleece",
  moderator: "Shepherd",
  achievement: "Wool",
  points: "Rhody Points",
  theme: "Fleece Theme",
  avatar: "Horn Style",
} as const;

// Achievement IDs
export const ACHIEVEMENTS = {
  FIRST_BLEAT: "first_bleat",
  FLOCK_LEADER_100: "flock_leader_100",
  FLOCK_LEADER_1000: "flock_leader_1000",
  SOCIAL_RAM: "social_ram",
  TRENDING_TROTTER: "trending_trotter",
  SENIOR_RAM: "senior_ram",
  STREAK_7: "streak_7",
  STREAK_30: "streak_30",
  STREAK_100: "streak_100",
} as const;

// Points for actions
export const POINTS = {
  CREATE_BLEAT: 5,
  RECEIVE_HUFF: 1,
  RECEIVE_REBAA: 2,
  GAIN_GRAZER: 3,
  DAILY_LOGIN: 10,
  STREAK_BONUS_7: 50,
  STREAK_BONUS_30: 200,
} as const;
