# Ramzee - Product Backlog

**Version:** 1.0.0
**Date:** February 2026
**Team Size:** 5-8 Software Engineers
**Methodology:** Agile/Scrum (2-week sprints)

---

## Table of Contents

1. [Team Structure](#team-structure)
2. [Epic Overview](#epic-overview)
3. [Detailed Epics & User Stories](#detailed-epics--user-stories)
4. [Sprint Planning](#sprint-planning)
5. [Testing Backlog](#testing-backlog)
6. [Definition of Done](#definition-of-done)

---

## Team Structure

### Recommended 6-Person Core Team

| Role | Responsibilities | Allocation |
|------|------------------|------------|
| **Tech Lead** | Architecture, code reviews, unblocking, Sprint 0 infra | 1 FTE |
| **Backend Engineer #1** | User Service, Auth, API Gateway | 1 FTE |
| **Backend Engineer #2** | Bleat Service, Feed Service, Search | 1 FTE |
| **iOS Engineer** | Native iOS app (Swift/SwiftUI) | 1 FTE |
| **Frontend Engineer** | Next.js web app, shared components | 1 FTE |
| **Full-Stack Engineer** | Barn Service, Notifications, DevOps support | 1 FTE |

### Optional +2 for Accelerated Timeline

| Role | Responsibilities |
|------|------------------|
| **Android Engineer** | Native Android app (Kotlin/Compose) |
| **DevOps/Platform** | CI/CD, monitoring, infrastructure |

---

## Epic Overview

| Epic | Priority | Sprints | Description |
|------|----------|---------|-------------|
| **E0: Foundation** | P0 | 1-2 | Infrastructure, CI/CD, project scaffolding |
| **E1: Identity** | P0 | 2-3 | Auth, registration, URI email verification |
| **E2: Core Social** | P0 | 3-5 | Bleats, Huffs, Rebaa, threading |
| **E3: Social Graph** | P0 | 4-5 | Graze/Flock, user profiles, discovery |
| **E4: Feed System** | P0 | 5-6 | Pasture, Meadow, real-time updates |
| **E5: Mobile iOS** | P0 | 4-8 | Native iOS application |
| **E6: Web App** | P0 | 3-7 | Next.js web application |
| **E7: Messaging** | P1 | 7-9 | Barn Chat, conversations, notifications |
| **E8: Herds** | P1 | 8-10 | Groups, community features |
| **E9: Search** | P1 | 6-7 | Full-text search, Ram Tags, user search |
| **E10: Gamification** | P2 | 10-11 | Wool Awards, Rhody Points, streaks |
| **E11: Moderation** | P1 | 9-11 | Shepherd tools, reporting, content moderation |
| **E12: Mobile Android** | P2 | 9-12 | Native Android application |
| **E13: Polish & Launch** | P0 | 11-12 | Performance, security audit, App Store |

---

## Detailed Epics & User Stories

---

### Epic 0: Foundation

**Goal:** Establish development infrastructure, tooling, and project scaffolding.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E0-001** | **Monorepo Setup** | 3 | - pnpm workspace configured<br>- Turborepo build orchestration<br>- Shared tsconfig, eslint, prettier<br>- Git hooks (husky + lint-staged) |
| **E0-002** | **Database Infrastructure** | 5 | - PostgreSQL provisioned (RDS or local Docker)<br>- Drizzle ORM configured<br>- Initial schema migrations<br>- Connection pooling setup |
| **E0-003** | **Redis Infrastructure** | 3 | - Redis cluster provisioned<br>- Connection wrapper with retry logic<br>- Health check endpoint |
| **E0-004** | **CI/CD Pipeline** | 5 | - GitHub Actions workflow<br>- Lint, typecheck, test stages<br>- Docker build and push<br>- Staging deployment trigger |
| **E0-005** | **Local Development Environment** | 3 | - Docker Compose for all services<br>- Hot reload for all apps<br>- Seed data scripts<br>- README documentation |
| **E0-006** | **Observability Stack** | 5 | - Structured logging (pino)<br>- OpenTelemetry tracing setup<br>- Prometheus metrics endpoint<br>- Grafana dashboards (basic) |
| **E0-007** | **API Gateway Scaffold** | 3 | - Fastify project structure<br>- Health/ready endpoints<br>- Request ID middleware<br>- Error handling middleware |
| **E0-008** | **Shared Packages** | 3 | - @ramzee/database package<br>- @ramzee/shared (types, utils)<br>- @ramzee/config (shared configs) |

**Epic Total:** 30 points

---

### Epic 1: Identity & Authentication

**Goal:** Users can register with URI email, verify, login, and manage sessions.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E1-001** | **User Registration API** | 5 | - POST /v1/auth/register endpoint<br>- Validate @uri.edu email format<br>- Hash password with Argon2id<br>- Store user in database<br>- Return 201 with user ID |
| **E1-002** | **Email Verification System** | 5 | - Generate 6-digit code<br>- Store code in Redis (15-min TTL)<br>- Send email via SendGrid/SES<br>- POST /v1/auth/verify-email endpoint<br>- Mark user as verified |
| **E1-003** | **Login & Token Issuance** | 5 | - POST /v1/auth/login endpoint<br>- Validate credentials<br>- Issue JWT access token (ES256, 15-min)<br>- Issue refresh token (opaque, 30-day)<br>- Set HttpOnly cookie for refresh |
| **E1-004** | **Token Refresh Flow** | 3 | - POST /v1/auth/refresh endpoint<br>- Validate refresh token<br>- Rotate refresh token<br>- Issue new access token |
| **E1-005** | **Logout & Token Revocation** | 2 | - POST /v1/auth/logout endpoint<br>- Invalidate refresh token<br>- Clear cookies |
| **E1-006** | **Auth Middleware** | 3 | - JWT verification middleware<br>- Attach user to request context<br>- Handle expired tokens gracefully<br>- Rate limiting per user |
| **E1-007** | **Password Reset Flow** | 5 | - POST /v1/auth/forgot-password<br>- Email reset link with token<br>- POST /v1/auth/reset-password<br>- Invalidate old sessions |
| **E1-008** | **Username Selection** | 3 | - POST /v1/auth/set-username<br>- Validate uniqueness<br>- Validate format (alphanumeric, 3-30 chars)<br>- Profanity filter |

**Epic Total:** 31 points

---

### Epic 2: Core Social (Bleats)

**Goal:** Users can create, view, delete bleats with full engagement features.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E2-001** | **Create Text Bleat** | 5 | - POST /v1/bleats endpoint<br>- Validate 280 char limit<br>- Extract Ram Tags from content<br>- Store in database<br>- Publish bleat.created event to Kafka |
| **E2-002** | **View Single Bleat** | 2 | - GET /v1/bleats/:id endpoint<br>- Include author info<br>- Include engagement counts<br>- 404 if not found or deleted |
| **E2-003** | **Delete Bleat** | 2 | - DELETE /v1/bleats/:id endpoint<br>- Only author can delete<br>- Soft delete (or hard delete)<br>- Publish bleat.deleted event |
| **E2-004** | **Huff a Bleat** | 3 | - POST /v1/bleats/:id/huff endpoint<br>- Prevent duplicate huffs<br>- Increment huff_count<br>- Publish huff.created event |
| **E2-005** | **Remove Huff** | 2 | - DELETE /v1/bleats/:id/huff endpoint<br>- Decrement huff_count<br>- Handle race conditions |
| **E2-006** | **Rebaa a Bleat** | 3 | - POST /v1/bleats/:id/rebaa endpoint<br>- Create new bleat with rebaa_of_id<br>- Optional quote content<br>- Increment rebaa_count on original |
| **E2-007** | **Reply to Bleat (Threading)** | 5 | - POST /v1/bleats with parent_bleat_id<br>- Increment reply_count on parent<br>- Maintain thread structure<br>- GET /v1/bleats/:id/thread endpoint |
| **E2-008** | **Photo Bleats** | 5 | - Accept image upload (multipart)<br>- Upload to S3/R2<br>- Generate thumbnail<br>- Store media_urls array<br>- Support up to 4 images |
| **E2-009** | **Poll Bleats** | 5 | - Create poll with 2-4 options<br>- POST /v1/bleats/:id/vote endpoint<br>- One vote per user<br>- Real-time vote counts |
| **E2-010** | **Ram Tag Extraction & Storage** | 3 | - Parse #RamTags from content<br>- Store in separate table<br>- Index for search<br>- Trending calculation job |
| **E2-011** | **Bleat Validation & Sanitization** | 3 | - XSS prevention (DOMPurify)<br>- Link detection and formatting<br>- Mention detection (@username)<br>- Emoji support |
| **E2-012** | **Get Huffers List** | 2 | - GET /v1/bleats/:id/huffers<br>- Paginated user list<br>- Cursor-based pagination |

**Epic Total:** 40 points

---

### Epic 3: Social Graph

**Goal:** Users can follow (graze) others, build their flock, and discover users.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E3-001** | **Graze a User** | 3 | - POST /v1/users/:id/graze endpoint<br>- Create graze relationship<br>- Publish graze.created event<br>- Cannot graze yourself |
| **E3-002** | **Ungraze a User** | 2 | - DELETE /v1/users/:id/graze endpoint<br>- Remove relationship<br>- Publish graze.deleted event |
| **E3-003** | **Get My Flock (Followers)** | 3 | - GET /v1/users/me/flock endpoint<br>- Paginated list of grazers<br>- Include follow-back status |
| **E3-004** | **Get Who I Graze (Following)** | 3 | - GET /v1/users/me/grazing endpoint<br>- Paginated list of grazees<br>- Include mutual status |
| **E3-005** | **User Public Profile** | 3 | - GET /v1/users/:username endpoint<br>- Public profile info<br>- Follower/following counts<br>- Recent bleats preview |
| **E3-006** | **Update My Profile** | 3 | - PATCH /v1/users/me endpoint<br>- Update display_name, bio, avatar<br>- Validate field lengths<br>- Upload avatar to S3 |
| **E3-007** | **Block User** | 3 | - POST /v1/users/:id/block endpoint<br>- Hide their content from me<br>- Hide my content from them<br>- Remove any graze relationship |
| **E3-008** | **Unblock User** | 2 | - DELETE /v1/users/:id/block endpoint<br>- Restore visibility |
| **E3-009** | **Mute User** | 2 | - POST /v1/users/:id/mute endpoint<br>- Hide from feed without unfollowing<br>- Still accessible via profile |
| **E3-010** | **Suggested Users** | 5 | - GET /v1/users/suggestions endpoint<br>- Algorithm: mutual follows, same herds<br>- Exclude already grazing<br>- Paginated |

**Epic Total:** 29 points

---

### Epic 4: Feed System

**Goal:** Users see personalized feeds (Pasture) and can discover content (Meadow).

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E4-001** | **Feed Service Setup** | 5 | - Kafka consumer for bleat events<br>- Redis sorted set operations<br>- Fan-out on write logic |
| **E4-002** | **Pasture Feed (Home)** | 5 | - GET /v1/feed/pasture endpoint<br>- Bleats from users I graze<br>- Reverse chronological<br>- Cursor-based pagination<br>- 50 bleats per page |
| **E4-003** | **Fan-Out on Write** | 8 | - On bleat.created event<br>- Get author's flock (grazers)<br>- Batch write to each pasture in Redis<br>- Handle large flock (>10K) with pull fallback |
| **E4-004** | **Meadow Feed (Explore)** | 5 | - GET /v1/feed/meadow endpoint<br>- Trending bleats (engagement-weighted)<br>- Exclude users I graze<br>- Time-decay algorithm |
| **E4-005** | **Meadow Latest** | 3 | - GET /v1/feed/meadow/latest endpoint<br>- All public bleats chronologically<br>- Good for URI-wide discovery |
| **E4-006** | **Real-Time Feed Updates** | 8 | - WebSocket connection<br>- Subscribe to pasture channel<br>- Push new bleats instantly<br>- Handle reconnection gracefully |
| **E4-007** | **Feed Caching Strategy** | 5 | - Cache feed pages in Redis<br>- Invalidate on new bleat<br>- TTL-based expiration<br>- Cold start from database |
| **E4-008** | **User Timeline** | 3 | - GET /v1/users/:username/bleats<br>- All bleats by a specific user<br>- Include replies optionally<br>- Paginated |

**Epic Total:** 42 points

---

### Epic 5: iOS Application

**Goal:** Native iOS app with full core functionality.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E5-001** | **iOS Project Setup** | 3 | - Xcode project with SwiftUI<br>- Clean Architecture structure<br>- Dependency injection (Swinject or manual)<br>- Environment configurations |
| **E5-002** | **Networking Layer** | 5 | - URLSession wrapper<br>- JWT token handling<br>- Refresh token logic<br>- Request/response logging |
| **E5-003** | **Auth Screens** | 5 | - Login screen<br>- Registration screen<br>- Email verification screen<br>- Forgot password flow |
| **E5-004** | **Pasture Feed Screen** | 8 | - Infinite scroll feed<br>- Pull to refresh<br>- Bleat cells with engagement buttons<br>- Real-time updates via WebSocket |
| **E5-005** | **Bleat Composer** | 5 | - Text input with character count<br>- Photo picker (up to 4)<br>- Location picker<br>- Ram Tag highlighting |
| **E5-006** | **Bleat Detail Screen** | 3 | - Full bleat view<br>- Thread display<br>- Engagement actions<br>- Reply composer |
| **E5-007** | **User Profile Screen** | 5 | - Profile header with avatar<br>- Stats (flock, grazing counts)<br>- User's bleats list<br>- Graze/Ungraze button |
| **E5-008** | **My Profile & Settings** | 5 | - Edit profile<br>- Avatar upload<br>- Theme selection (Fleece Themes)<br>- Logout |
| **E5-009** | **Meadow (Explore) Screen** | 5 | - Trending bleats<br>- Search bar<br>- Ram Tag browsing<br>- User discovery |
| **E5-010** | **Push Notifications** | 5 | - APNs integration<br>- Register device token<br>- Handle notification taps<br>- Background refresh |
| **E5-011** | **Offline Support** | 8 | - Local SQLite cache<br>- Optimistic UI updates<br>- Sync queue for actions<br>- Offline indicator |
| **E5-012** | **App Store Preparation** | 3 | - App icons and screenshots<br>- Privacy policy compliance<br>- App Store listing<br>- TestFlight beta setup |

**Epic Total:** 60 points

---

### Epic 6: Web Application

**Goal:** Next.js web app with full core functionality.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E6-001** | **Next.js Project Setup** | 3 | - Next.js 15 with App Router<br>- Tailwind CSS configured<br>- TanStack Query setup<br>- Environment variables |
| **E6-002** | **Auth Pages** | 5 | - /login page<br>- /register page<br>- /verify-email page<br>- /forgot-password flow |
| **E6-003** | **Layout & Navigation** | 5 | - Responsive sidebar/header<br>- Mobile bottom nav<br>- User dropdown menu<br>- Notifications icon |
| **E6-004** | **Pasture Feed Page** | 8 | - Infinite scroll with TanStack Query<br>- Optimistic updates for huffs<br>- Real-time via WebSocket<br>- Loading states and skeletons |
| **E6-005** | **Bleat Composer Component** | 5 | - Modal or inline composer<br>- Character count<br>- Image upload with preview<br>- Keyboard shortcuts |
| **E6-006** | **Bleat Detail Page** | 3 | - /bleat/:id route<br>- Full thread view<br>- OG meta tags for sharing |
| **E6-007** | **User Profile Page** | 5 | - /:username route<br>- Profile header<br>- Tabs: Bleats, Replies, Huffs<br>- Graze button |
| **E6-008** | **Settings Pages** | 5 | - /settings/profile<br>- /settings/account<br>- /settings/appearance (themes)<br>- /settings/notifications |
| **E6-009** | **Meadow (Explore) Page** | 5 | - /explore route<br>- Trending section<br>- Search bar with results<br>- Ram Tag pages |
| **E6-010** | **Responsive Design** | 5 | - Mobile-first approach<br>- Breakpoints: sm, md, lg, xl<br>- Touch-friendly interactions<br>- PWA manifest |
| **E6-011** | **Accessibility (a11y)** | 5 | - ARIA labels<br>- Keyboard navigation<br>- Screen reader testing<br>- Color contrast compliance |
| **E6-012** | **Performance Optimization** | 5 | - Image optimization (next/image)<br>- Code splitting<br>- Bundle analysis<br>- Core Web Vitals targets |

**Epic Total:** 59 points

---

### Epic 7: Messaging (Barn Chat)

**Goal:** Users can send direct messages to individuals and groups.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E7-001** | **Barn Service Setup** | 5 | - Fastify service scaffold<br>- Database tables (conversations, messages)<br>- Kafka integration |
| **E7-002** | **Start Conversation** | 3 | - POST /v1/barn/conversations<br>- Create 1:1 or group conversation<br>- Check for existing conversation<br>- Return conversation ID |
| **E7-003** | **List Conversations** | 3 | - GET /v1/barn/conversations<br>- Sorted by last message<br>- Unread count per conversation<br>- Participant info |
| **E7-004** | **Send Message** | 5 | - POST /v1/barn/conversations/:id<br>- Store message<br>- Publish message.created event<br>- Real-time delivery via WebSocket |
| **E7-005** | **Get Messages** | 3 | - GET /v1/barn/conversations/:id<br>- Paginated, newest first<br>- Mark as read on fetch |
| **E7-006** | **Real-Time Messages** | 5 | - WebSocket subscription to conversation<br>- Instant message delivery<br>- Typing indicators<br>- Read receipts |
| **E7-007** | **Message Notifications** | 5 | - Push notification for new DM<br>- Unread badge count<br>- In-app notification |
| **E7-008** | **Media Messages** | 5 | - Image attachments<br>- Upload to S3<br>- Inline preview |
| **E7-009** | **Delete Conversation** | 2 | - Leave conversation<br>- Delete all messages for user<br>- Retain for other participants |
| **E7-010** | **Barn UI (Web)** | 8 | - /barn route<br>- Conversation list sidebar<br>- Message thread view<br>- Composer with media |
| **E7-011** | **Barn UI (iOS)** | 8 | - Conversations list screen<br>- Chat screen<br>- Message bubbles<br>- Keyboard handling |

**Epic Total:** 52 points

---

### Epic 8: Herds (Groups)

**Goal:** Users can create and join community groups.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E8-001** | **Herd Service Setup** | 3 | - Database tables (herds, memberships)<br>- API routes scaffold |
| **E8-002** | **Create Herd** | 3 | - POST /v1/herds endpoint<br>- Name, description, avatar<br>- Privacy setting (public/private)<br>- Creator becomes owner |
| **E8-003** | **Join Herd** | 3 | - POST /v1/herds/:id/join<br>- Auto-join for public herds<br>- Request to join for private<br>- Publish membership event |
| **E8-004** | **Leave Herd** | 2 | - DELETE /v1/herds/:id/leave<br>- Remove membership<br>- Handle owner leaving |
| **E8-005** | **Herd Feed** | 5 | - GET /v1/herds/:id/feed<br>- Bleats posted to this herd<br>- Members only for private herds |
| **E8-006** | **Post to Herd** | 3 | - POST /v1/bleats with herd_id<br>- Validate membership<br>- Fan-out to herd feed |
| **E8-007** | **List Herds** | 3 | - GET /v1/herds (public herds)<br>- GET /v1/users/me/herds (my herds)<br>- Search herds by name |
| **E8-008** | **Herd Management** | 5 | - PATCH /v1/herds/:id (owner only)<br>- Add/remove moderators<br>- Update settings<br>- Transfer ownership |
| **E8-009** | **Incognito Mode in Herds** | 5 | - allows_incognito setting per herd<br>- Anonymous posting<br>- Identity hidden from other members<br>- Visible to moderators for reports |
| **E8-010** | **Herds UI (Web)** | 8 | - /herds discovery page<br>- /herds/:id herd page<br>- Member list<br>- Herd creation modal |
| **E8-011** | **Herds UI (iOS)** | 8 | - Herds tab<br>- Herd detail screen<br>- Join/leave flow<br>- Post to herd |

**Epic Total:** 48 points

---

### Epic 9: Search

**Goal:** Users can search for bleats, users, and Ram Tags.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E9-001** | **Search Service Setup** | 5 | - Elasticsearch cluster<br>- Index schemas for users, bleats<br>- Kafka consumer for indexing |
| **E9-002** | **Index Users** | 3 | - On user.created/updated events<br>- Index username, display_name, bio<br>- Fuzzy matching support |
| **E9-003** | **Index Bleats** | 3 | - On bleat.created events<br>- Index content, ram_tags<br>- Time-decay scoring |
| **E9-004** | **Search Users API** | 3 | - GET /v1/search/users?q=<br>- Return matching users<br>- Boost verified users |
| **E9-005** | **Search Bleats API** | 3 | - GET /v1/search/bleats?q=<br>- Full-text search<br>- Filter by date range |
| **E9-006** | **Ram Tag Search** | 3 | - GET /v1/search/ramtags/:tag<br>- All bleats with tag<br>- Sorted by recency or popularity |
| **E9-007** | **Trending Ram Tags** | 5 | - Background job to calculate<br>- Time-weighted frequency<br>- GET /v1/ramtags/trending |
| **E9-008** | **Search UI (Web)** | 5 | - /search page<br>- Tabs: All, Users, Bleats, Tags<br>- Autocomplete suggestions |
| **E9-009** | **Search UI (iOS)** | 5 | - Search screen<br>- Recent searches<br>- Results by category |

**Epic Total:** 35 points

---

### Epic 10: Gamification

**Goal:** Engagement system with achievements, points, and streaks.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E10-001** | **Gamify Service Setup** | 3 | - Database tables (achievements, user_achievements)<br>- Points transaction log |
| **E10-002** | **Wool Awards System** | 5 | - Define achievement criteria<br>- Award on event triggers<br>- GET /v1/users/me/achievements |
| **E10-003** | **Rhody Points** | 5 | - Points for actions (bleat, huff, etc.)<br>- GET /v1/users/me/points<br>- Transaction history |
| **E10-004** | **Streak Counter** | 5 | - Daily login tracking<br>- Streak increment/reset logic<br>- Bonus points for milestones |
| **E10-005** | **Leaderboard** | 5 | - GET /v1/leaderboard<br>- Weekly/monthly/all-time<br>- Redis sorted set for performance |
| **E10-006** | **Achievements UI (Web)** | 5 | - Profile achievements section<br>- Progress bars<br>- Unlock animations |
| **E10-007** | **Achievements UI (iOS)** | 5 | - Achievements screen<br>- Badge display on profile<br>- Push notification on unlock |

**Epic Total:** 33 points

---

### Epic 11: Moderation

**Goal:** Community moderation tools for Shepherds and admins.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E11-001** | **Report Content** | 3 | - POST /v1/bleats/:id/report<br>- Report reasons (spam, abuse, etc.)<br>- Store in moderation queue |
| **E11-002** | **Moderation Queue** | 5 | - GET /v1/admin/moderation/queue<br>- Shepherd/admin only<br>- Filter by status, type |
| **E11-003** | **Take Action** | 5 | - POST /v1/admin/moderation/:id/action<br>- Actions: dismiss, warn, delete, ban<br>- Audit log |
| **E11-004** | **User Bans** | 5 | - Temporary and permanent bans<br>- Ban reasons<br>- Appeal process placeholder |
| **E11-005** | **Shepherd Election** | 5 | - Nomination system<br>- Voting mechanism<br>- Term limits |
| **E11-006** | **Content Filters** | 5 | - Automated profanity filter<br>- Spam detection (basic)<br>- Auto-flag for review |
| **E11-007** | **Admin Dashboard** | 8 | - /admin routes<br>- User management<br>- Analytics overview<br>- System health |
| **E11-008** | **Moderation UI (Web)** | 5 | - Shepherd moderation panel<br>- Queue review interface<br>- Action buttons |

**Epic Total:** 41 points

---

### Epic 12: Android Application

**Goal:** Native Android app with full core functionality.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E12-001** | **Android Project Setup** | 3 | - Kotlin + Jetpack Compose<br>- MVVM architecture<br>- Hilt dependency injection |
| **E12-002** | **Networking Layer** | 5 | - Retrofit + Moshi<br>- Auth interceptor<br>- Token refresh logic |
| **E12-003** | **Auth Screens** | 5 | - Login, Register, Verify<br>- Material 3 design |
| **E12-004** | **Pasture Feed Screen** | 8 | - LazyColumn with pagination<br>- Pull to refresh<br>- Real-time updates |
| **E12-005** | **Bleat Composer** | 5 | - Bottom sheet composer<br>- Photo picker<br>- Character counter |
| **E12-006** | **User Profile Screen** | 5 | - Profile header<br>- Tab layout for content<br>- Graze button |
| **E12-007** | **Settings & Themes** | 5 | - Fleece Themes implementation<br>- Dynamic color support<br>- Preferences datastore |
| **E12-008** | **Push Notifications** | 5 | - Firebase Cloud Messaging<br>- Notification channels<br>- Deep linking |
| **E12-009** | **Offline Support** | 8 | - Room database<br>- Offline-first architecture<br>- Sync worker |
| **E12-010** | **Play Store Preparation** | 3 | - App bundle<br>- Screenshots<br>- Store listing |

**Epic Total:** 52 points

---

### Epic 13: Polish & Launch

**Goal:** Production readiness, performance optimization, and launch.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| **E13-001** | **Performance Audit** | 5 | - Lighthouse scores > 90<br>- API latency < 100ms P95<br>- Database query optimization |
| **E13-002** | **Security Audit** | 8 | - Penetration testing<br>- OWASP checklist<br>- Remediate findings |
| **E13-003** | **Load Testing** | 5 | - k6 load tests<br>- 1000 concurrent users<br>- Identify bottlenecks |
| **E13-004** | **Error Handling Polish** | 3 | - User-friendly error messages<br>- Retry logic<br>- Fallback states |
| **E13-005** | **Analytics Integration** | 3 | - Mixpanel/Amplitude setup<br>- Key event tracking<br>- Funnel analysis |
| **E13-006** | **App Store Submission** | 5 | - iOS App Store review<br>- Google Play review<br>- Address rejections |
| **E13-007** | **Beta Program** | 5 | - TestFlight / Play Beta<br>- 100 beta users at URI<br>- Feedback collection |
| **E13-008** | **Launch Checklist** | 3 | - DNS configuration<br>- SSL certificates<br>- Monitoring alerts active<br>- Rollback plan |
| **E13-009** | **Documentation** | 5 | - API documentation (OpenAPI)<br>- Runbooks for incidents<br>- Onboarding guide |

**Epic Total:** 42 points

---

## Sprint Planning

### Sprint Velocity Assumptions

| Team Size | Velocity (points/sprint) |
|-----------|--------------------------|
| 5 engineers | 35-45 points |
| 6 engineers | 45-55 points |
| 7 engineers | 55-65 points |
| 8 engineers | 65-75 points |

### 12-Sprint Roadmap (6 Engineers)

| Sprint | Focus | Epics | Points | Deliverables |
|--------|-------|-------|--------|--------------|
| **Sprint 1** | Foundation | E0 | 30 | Dev environment, CI/CD, scaffolding |
| **Sprint 2** | Auth + Identity | E1 | 31 | Registration, login, email verification |
| **Sprint 3** | Core Social | E2 (partial) | 25 | Text bleats, huffs, rebaa |
| **Sprint 4** | Core Social + Web | E2, E6 (partial) | 30 | Threading, photos, web auth pages |
| **Sprint 5** | Social Graph + Feed | E3, E4 (partial) | 35 | Graze system, pasture feed |
| **Sprint 6** | Feed + iOS Start | E4, E5 (partial) | 40 | Real-time feed, iOS scaffolding |
| **Sprint 7** | iOS + Web | E5, E6 | 50 | iOS core screens, web feed |
| **Sprint 8** | iOS + Messaging | E5, E7 (partial) | 45 | iOS polish, barn service |
| **Sprint 9** | Messaging + Search | E7, E9 | 50 | Full messaging, search |
| **Sprint 10** | Herds + Moderation | E8, E11 (partial) | 50 | Groups, reporting |
| **Sprint 11** | Gamification + Polish | E10, E13 (partial) | 45 | Achievements, performance |
| **Sprint 12** | Launch Prep | E13 | 42 | Security audit, beta, submission |

### Sprint Detail: Sprint 1

**Goal:** Development infrastructure complete, team can start building features.

| Story ID | Story | Assignee | Points |
|----------|-------|----------|--------|
| E0-001 | Monorepo Setup | Tech Lead | 3 |
| E0-002 | Database Infrastructure | Backend #1 | 5 |
| E0-003 | Redis Infrastructure | Backend #2 | 3 |
| E0-004 | CI/CD Pipeline | Tech Lead | 5 |
| E0-005 | Local Dev Environment | Full-Stack | 3 |
| E0-006 | Observability Stack | Backend #2 | 5 |
| E0-007 | API Gateway Scaffold | Backend #1 | 3 |
| E0-008 | Shared Packages | Tech Lead | 3 |

**Sprint Total:** 30 points

### Sprint Detail: Sprint 2

**Goal:** Users can register, verify email, and log in.

| Story ID | Story | Assignee | Points |
|----------|-------|----------|--------|
| E1-001 | User Registration API | Backend #1 | 5 |
| E1-002 | Email Verification System | Backend #1 | 5 |
| E1-003 | Login & Token Issuance | Backend #2 | 5 |
| E1-004 | Token Refresh Flow | Backend #2 | 3 |
| E1-005 | Logout & Token Revocation | Backend #2 | 2 |
| E1-006 | Auth Middleware | Tech Lead | 3 |
| E1-007 | Password Reset Flow | Full-Stack | 5 |
| E1-008 | Username Selection | Full-Stack | 3 |

**Sprint Total:** 31 points

---

## Testing Backlog

### Unit Testing Requirements

| Area | Test Coverage Target | Key Test Cases |
|------|---------------------|----------------|
| **Auth Service** | 90% | Email validation, password hashing, token generation, refresh logic |
| **Bleat Service** | 85% | Content validation, character limits, Ram Tag extraction, threading |
| **Feed Service** | 80% | Fan-out logic, pagination, cache invalidation |
| **User Service** | 85% | Profile updates, graze/ungraze, block logic |
| **Barn Service** | 85% | Conversation creation, message ordering, read receipts |
| **Gamify Service** | 80% | Points calculation, streak logic, achievement triggers |

### Integration Testing Requirements

| Test Suite | Description | Count |
|------------|-------------|-------|
| **Auth API Tests** | Full registration, login, refresh flows | 15 |
| **Bleat API Tests** | CRUD operations, engagement, threading | 20 |
| **Feed API Tests** | Pasture, Meadow, real-time updates | 12 |
| **Social Graph Tests** | Graze, block, mute operations | 10 |
| **Barn API Tests** | Conversations, messages, notifications | 15 |
| **Search API Tests** | User search, bleat search, Ram Tags | 10 |
| **Herd API Tests** | CRUD, membership, permissions | 12 |

### E2E Testing Requirements (Playwright)

| Flow | Priority | Steps |
|------|----------|-------|
| **User Registration** | P0 | Register -> Verify Email -> Set Username -> See Feed |
| **Create Bleat** | P0 | Login -> Compose -> Post -> See in Feed |
| **Engagement Flow** | P0 | Login -> View Bleat -> Huff -> Rebaa |
| **Follow User** | P0 | Login -> Search User -> Graze -> See in Feed |
| **Direct Message** | P1 | Login -> Start Conversation -> Send Message -> Receive |
| **Join Herd** | P1 | Login -> Browse Herds -> Join -> Post to Herd |
| **Profile Update** | P1 | Login -> Settings -> Update Bio/Avatar -> Verify |

### Performance Testing Requirements

| Test | Tool | Threshold |
|------|------|-----------|
| **API Load Test** | k6 | 1000 RPS, P99 < 200ms |
| **Feed Fan-Out** | Custom | 10K followers < 500ms |
| **WebSocket Connections** | Artillery | 5000 concurrent |
| **Database Queries** | pg_stat | No queries > 100ms |
| **Search Latency** | k6 | P95 < 150ms |

### Security Testing Requirements

| Test Type | Tool | Scope |
|-----------|------|-------|
| **Dependency Scan** | Snyk | All npm packages |
| **SAST** | CodeQL | All TypeScript code |
| **API Security** | OWASP ZAP | All endpoints |
| **Auth Testing** | Manual | Token security, session handling |
| **Input Validation** | Manual | XSS, SQL injection, SSRF |

### Mobile Testing Requirements

| Test Type | Platform | Scope |
|-----------|----------|-------|
| **Unit Tests** | iOS (XCTest) | ViewModels, Use Cases |
| **Unit Tests** | Android (JUnit) | ViewModels, Use Cases |
| **UI Tests** | iOS (XCUITest) | Critical flows |
| **UI Tests** | Android (Espresso) | Critical flows |
| **Device Matrix** | BrowserStack | Top 10 iOS, Top 10 Android |

---

## Definition of Done

### Story Level

- [ ] Code complete and compiles
- [ ] Unit tests written and passing (coverage target met)
- [ ] Integration tests written for API endpoints
- [ ] Code reviewed by at least 1 team member
- [ ] No TypeScript errors or ESLint warnings
- [ ] API documentation updated (if applicable)
- [ ] Deployed to staging environment
- [ ] QA tested on staging
- [ ] Product owner accepted

### Sprint Level

- [ ] All committed stories meet Definition of Done
- [ ] No critical or high-severity bugs
- [ ] Performance benchmarks met
- [ ] Security scan passed (no high/critical issues)
- [ ] Demo presented to stakeholders
- [ ] Retrospective completed

### Release Level

- [ ] All planned epics complete
- [ ] Full regression test passed
- [ ] Load testing completed successfully
- [ ] Security audit completed and findings addressed
- [ ] Documentation complete
- [ ] Rollback plan documented and tested
- [ ] Monitoring and alerting configured
- [ ] Stakeholder sign-off obtained

---

## Appendix: Story Point Reference

| Points | Complexity | Example |
|--------|------------|---------|
| 1 | Trivial | Config change, copy update |
| 2 | Simple | Simple CRUD endpoint, minor UI tweak |
| 3 | Moderate | Standard feature, well-understood |
| 5 | Complex | New service integration, significant logic |
| 8 | Very Complex | Cross-service feature, real-time logic |
| 13 | Epic-level | Should be broken down |

---

*Document maintained by Product & Engineering*
*Last updated: February 2026*
