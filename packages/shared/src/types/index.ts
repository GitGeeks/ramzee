// Domain: User
export interface User {
  id: string;
  uriEmail: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  hornStyle: string;
  fleeceTheme: string;
  isVerified: boolean;
  isShepherd: boolean;
  rhodyPoints: number;
  streakDays: number;
  createdAt: Date;
  updatedAt: Date;
}

// Domain: Bleat
export type BleatType = "text" | "photo" | "poll" | "event";

export interface Bleat {
  id: string;
  authorId: string;
  content: string;
  bleatType: BleatType;
  mediaUrls: string[];
  locationId: string | null;
  parentBleatId: string | null;
  rebaaOfId: string | null;
  isIncognito: boolean;
  herdId: string | null;
  huffCount: number;
  rebaaCount: number;
  replyCount: number;
  createdAt: Date;
}

// Domain: Social Graph
export interface Graze {
  grazerId: string;
  grazeeId: string;
  createdAt: Date;
}

// Domain: Engagement
export interface Huff {
  userId: string;
  bleatId: string;
  createdAt: Date;
}

// Domain: Messaging
export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessageAt: Date;
  createdAt: Date;
}

export interface BarnMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
}

// Domain: Community
export interface Herd {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  allowsIncognito: boolean;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Pagination
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}
