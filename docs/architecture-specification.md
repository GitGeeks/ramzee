# Ramzee - Software Engineering & Architecture Specification

**Version:** 1.0.0
**Classification:** Internal Technical Documentation
**Last Updated:** February 2026

---

## Executive Summary

Ramzee is a hyper-local social platform purpose-built for the University of Rhode Island community. This document outlines the technical architecture, engineering principles, and implementation strategy to deliver a scalable, secure, and delightful product that can serve as a blueprint for expansion to other university campuses.

Our architecture prioritizes:
- **Speed**: Sub-100ms API responses, instant feed updates
- **Scale**: Built for 15,000 DAU at URI, extensible to 1M+ across campuses
- **Security**: Zero-trust architecture with defense in depth
- **Simplicity**: Clean abstractions, minimal operational overhead

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Data Architecture](#3-data-architecture)
4. [API Design](#4-api-design)
5. [Real-Time Infrastructure](#5-real-time-infrastructure)
6. [Authentication & Security](#6-authentication--security)
7. [Infrastructure & Deployment](#7-infrastructure--deployment)
8. [Observability & Monitoring](#8-observability--monitoring)
9. [Development Workflow](#9-development-workflow)
10. [Testing Strategy](#10-testing-strategy)
11. [Performance Engineering](#11-performance-engineering)
12. [Mobile Architecture](#12-mobile-architecture)
13. [Future Scalability](#13-future-scalability)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   iOS App       │   Android App   │   Web App       │   Admin Dashboard     │
│   (Swift/UIKit) │   (Kotlin)      │   (Next.js)     │   (Next.js)           │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬────────────┘
         │                 │                 │                   │
         └─────────────────┴────────┬────────┴───────────────────┘
                                    │
                           ┌────────▼────────┐
                           │   CDN (Edge)    │
                           │   Cloudflare    │
                           └────────┬────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                           API GATEWAY LAYER                                  │
│  ┌────────────────────────────────▼────────────────────────────────────┐    │
│  │                        Kong API Gateway                              │    │
│  │         Rate Limiting · Auth · Routing · Analytics                   │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
│                                   │                                          │
│  ┌───────────┐  ┌───────────┐  ┌─▼─────────┐  ┌───────────┐  ┌───────────┐ │
│  │  User     │  │  Bleat    │  │  Feed     │  │  Barn     │  │  Notify   │ │
│  │  Service  │  │  Service  │  │  Service  │  │  Service  │  │  Service  │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘ │
│        │              │              │              │              │        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │  Herd     │  │  Search   │  │  Media    │  │  Gamify   │  │  Moderate │ │
│  │  Service  │  │  Service  │  │  Service  │  │  Service  │  │  Service  │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                           DATA LAYER                                         │
│                                   │                                          │
│  ┌───────────┐  ┌───────────┐  ┌─▼─────────┐  ┌───────────┐  ┌───────────┐ │
│  │PostgreSQL │  │   Redis   │  │  Kafka    │  │   S3      │  │  Elastic  │ │
│  │ (Primary) │  │  (Cache)  │  │ (Events)  │  │  (Media)  │  │  (Search) │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Service Isolation** | Each domain owns its data and exposes clean APIs |
| **Event-Driven** | Async communication via Kafka for loose coupling |
| **Cache-First** | Redis for hot paths, fan-out on write for feeds |
| **Fail Gracefully** | Circuit breakers, fallbacks, graceful degradation |
| **Observable** | Structured logging, distributed tracing, metrics |

---

## 2. Technology Stack

### 2.1 Backend Services

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Node.js 22 LTS | Async I/O, large ecosystem, team familiarity |
| **Framework** | Fastify | 2x faster than Express, schema validation built-in |
| **Language** | TypeScript 5.x | Type safety, better DX, catch errors at compile time |
| **ORM** | Drizzle ORM | Type-safe, lightweight, excellent DX |
| **Validation** | Zod | Runtime validation, TypeScript inference |

### 2.2 Data Stores

| Store | Technology | Use Case |
|-------|------------|----------|
| **Primary DB** | PostgreSQL 16 | Users, Bleats, relationships, transactions |
| **Cache** | Redis 7 (Cluster) | Sessions, feed cache, rate limits, leaderboards |
| **Search** | Elasticsearch 8 | Full-text search, Ram Tags, user discovery |
| **Object Storage** | AWS S3 / Cloudflare R2 | Media files, avatars, bleat attachments |
| **Message Queue** | Apache Kafka | Event streaming, async processing |

### 2.3 Frontend & Mobile

| Platform | Technology | Details |
|----------|------------|---------|
| **Web** | Next.js 15 (App Router) | React 19, Server Components, Edge Runtime |
| **iOS** | Swift 6 / SwiftUI | Native performance, modern declarative UI |
| **Android** | Kotlin / Jetpack Compose | Native performance, modern declarative UI |
| **State** | TanStack Query | Server state management, caching |
| **Styling** | Tailwind CSS | Utility-first, design system friendly |

### 2.4 Infrastructure

| Component | Technology |
|-----------|------------|
| **Cloud** | AWS (primary), Cloudflare (edge) |
| **Containers** | Docker + Kubernetes (EKS) |
| **IaC** | Terraform + Pulumi |
| **CI/CD** | GitHub Actions |
| **Secrets** | AWS Secrets Manager |
| **DNS/CDN** | Cloudflare |

---

## 3. Data Architecture

### 3.1 Core Domain Models

```typescript
// Domain: Identity
interface User {
  id: UUID
  uri_email: string              // Primary identifier, verified
  username: string               // @handle, unique
  display_name: string
  avatar_url: string | null
  bio: string | null
  horn_style: HornStyleId        // Customization
  fleece_theme: ThemeId
  is_verified: boolean           // Golden Fleece
  is_shepherd: boolean           // Moderator
  created_at: Timestamp
  updated_at: Timestamp
}

// Domain: Content
interface Bleat {
  id: UUID
  author_id: UUID
  content: string                // Max 280 chars
  bleat_type: 'text' | 'photo' | 'poll' | 'event'
  media_urls: string[]
  location_id: LocationId | null
  parent_bleat_id: UUID | null   // For threads
  rebaa_of_id: UUID | null       // For rebaas
  is_incognito: boolean
  herd_id: UUID | null           // If posted to a Herd
  huff_count: number             // Denormalized counter
  rebaa_count: number
  reply_count: number
  created_at: Timestamp
}

// Domain: Social Graph
interface Graze {
  grazer_id: UUID                // Who is following
  grazee_id: UUID                // Who is being followed
  created_at: Timestamp
  PRIMARY KEY (grazer_id, grazee_id)
}

// Domain: Engagement
interface Huff {
  user_id: UUID
  bleat_id: UUID
  created_at: Timestamp
  PRIMARY KEY (user_id, bleat_id)
}

// Domain: Messaging
interface BarnMessage {
  id: UUID
  conversation_id: UUID
  sender_id: UUID
  content: string
  media_url: string | null
  read_at: Timestamp | null
  created_at: Timestamp
}

// Domain: Community
interface Herd {
  id: UUID
  name: string
  description: string
  avatar_url: string | null
  is_private: boolean
  allows_incognito: boolean
  owner_id: UUID
  member_count: number
  created_at: Timestamp
}
```

### 3.2 Database Schema (PostgreSQL)

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Fuzzy text search

-- Users table with optimized indexes
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uri_email       VARCHAR(255) UNIQUE NOT NULL,
    username        VARCHAR(30) UNIQUE NOT NULL,
    display_name    VARCHAR(50) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    bio             VARCHAR(160),
    horn_style      VARCHAR(50) DEFAULT 'classic',
    fleece_theme    VARCHAR(50) DEFAULT 'keaney_blue',
    is_verified     BOOLEAN DEFAULT FALSE,
    is_shepherd     BOOLEAN DEFAULT FALSE,
    rhody_points    INTEGER DEFAULT 0,
    streak_days     INTEGER DEFAULT 0,
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username_trgm ON users USING gin(username gin_trgm_ops);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);

-- Bleats with partitioning for scale
CREATE TABLE bleats (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         VARCHAR(280) NOT NULL,
    bleat_type      VARCHAR(20) DEFAULT 'text',
    media_urls      TEXT[],
    location_id     UUID REFERENCES locations(id),
    parent_bleat_id UUID REFERENCES bleats(id) ON DELETE CASCADE,
    rebaa_of_id     UUID REFERENCES bleats(id) ON DELETE SET NULL,
    is_incognito    BOOLEAN DEFAULT FALSE,
    herd_id         UUID REFERENCES herds(id) ON DELETE CASCADE,
    huff_count      INTEGER DEFAULT 0,
    rebaa_count     INTEGER DEFAULT 0,
    reply_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE bleats_2026_02 PARTITION OF bleats
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE INDEX idx_bleats_author ON bleats(author_id, created_at DESC);
CREATE INDEX idx_bleats_herd ON bleats(herd_id, created_at DESC) WHERE herd_id IS NOT NULL;
CREATE INDEX idx_bleats_trending ON bleats(huff_count DESC, created_at DESC);

-- Social graph with efficient lookup
CREATE TABLE grazes (
    grazer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grazee_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (grazer_id, grazee_id)
);

CREATE INDEX idx_grazes_grazee ON grazes(grazee_id);  -- "Who grazes me?"

-- Engagement tracking
CREATE TABLE huffs (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bleat_id    UUID NOT NULL REFERENCES bleats(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, bleat_id)
);

CREATE INDEX idx_huffs_bleat ON huffs(bleat_id);  -- Count huffs efficiently
```

### 3.3 Feed Architecture (Fan-Out on Write)

For optimal read performance, we implement fan-out on write using Redis sorted sets:

```
Feed Key Structure:
  pasture:{user_id}         -> Sorted Set (bleat_id, timestamp)
  meadow:trending           -> Sorted Set (bleat_id, score)
  meadow:latest             -> Sorted Set (bleat_id, timestamp)
  herd:{herd_id}:feed       -> Sorted Set (bleat_id, timestamp)
```

**Fan-Out Process:**
1. User creates a Bleat
2. Bleat Service writes to PostgreSQL
3. Event published to Kafka: `bleat.created`
4. Feed Service consumes event
5. Fan-out to all grazer's pastures in Redis
6. For users with >10K grazers, use pull-based hybrid approach

---

## 4. API Design

### 4.1 API Principles

- **RESTful** with pragmatic deviations where beneficial
- **Versioned** via URL path (`/v1/`)
- **Consistent** response envelope
- **Paginated** with cursor-based pagination
- **Rate Limited** per user and per endpoint

### 4.2 Response Envelope

```typescript
// Success Response
interface ApiResponse<T> {
  success: true
  data: T
  meta?: {
    cursor?: string
    has_more?: boolean
    total?: number
  }
}

// Error Response
interface ApiError {
  success: false
  error: {
    code: string           // Machine-readable: "BLEAT_NOT_FOUND"
    message: string        // Human-readable: "The bleat you requested does not exist"
    details?: Record<string, any>
  }
}
```

### 4.3 Core Endpoints

```yaml
# Authentication
POST   /v1/auth/register          # Create account with URI email
POST   /v1/auth/verify-email      # Verify email code
POST   /v1/auth/login             # Get access + refresh tokens
POST   /v1/auth/refresh           # Refresh access token
POST   /v1/auth/logout            # Invalidate tokens

# Users
GET    /v1/users/:username        # Get public profile
PATCH  /v1/users/me               # Update own profile
GET    /v1/users/me/flock         # Get my grazers (paginated)
GET    /v1/users/me/grazing       # Get who I graze (paginated)

# Social Graph
POST   /v1/users/:id/graze        # Start grazing a user
DELETE /v1/users/:id/graze        # Stop grazing a user
POST   /v1/users/:id/block        # Block a user
DELETE /v1/users/:id/block        # Unblock a user

# Bleats
POST   /v1/bleats                 # Create a bleat
GET    /v1/bleats/:id             # Get single bleat
DELETE /v1/bleats/:id             # Delete own bleat
GET    /v1/bleats/:id/thread      # Get full thread

# Engagement
POST   /v1/bleats/:id/huff        # Huff a bleat
DELETE /v1/bleats/:id/huff        # Remove huff
POST   /v1/bleats/:id/rebaa       # Rebaa a bleat
GET    /v1/bleats/:id/huffers     # Get users who huffed (paginated)

# Feeds
GET    /v1/feed/pasture           # My personalized feed
GET    /v1/feed/meadow            # Explore/trending
GET    /v1/feed/meadow/latest     # Latest from everyone

# Herds
GET    /v1/herds                  # List herds
POST   /v1/herds                  # Create a herd
GET    /v1/herds/:id              # Get herd details
GET    /v1/herds/:id/feed         # Get herd feed
POST   /v1/herds/:id/join         # Join a herd
DELETE /v1/herds/:id/leave        # Leave a herd

# Messaging (Barn)
GET    /v1/barn/conversations     # List conversations
POST   /v1/barn/conversations     # Start new conversation
GET    /v1/barn/conversations/:id # Get messages (paginated)
POST   /v1/barn/conversations/:id # Send message

# Search
GET    /v1/search/users           # Search users
GET    /v1/search/bleats          # Search bleats
GET    /v1/search/ramtags/:tag    # Get bleats by Ram Tag

# Notifications
GET    /v1/notifications          # Get notifications (paginated)
POST   /v1/notifications/read     # Mark as read
```

### 4.4 Example Request/Response

```bash
# Create a Bleat
POST /v1/bleats
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
Content-Type: application/json

{
  "content": "Just aced my CS 212 midterm! #RhodyLife",
  "bleat_type": "text",
  "location_id": "loc_library_carothers"
}

# Response: 201 Created
{
  "success": true,
  "data": {
    "id": "blt_7x8k2m1p9q",
    "author": {
      "id": "usr_abc123",
      "username": "ramfan2026",
      "display_name": "Jordan",
      "avatar_url": "https://cdn.ramzee.app/avatars/usr_abc123.jpg",
      "is_verified": false
    },
    "content": "Just aced my CS 212 midterm! #RhodyLife",
    "bleat_type": "text",
    "location": {
      "id": "loc_library_carothers",
      "name": "Robert L. Carothers Library"
    },
    "ram_tags": ["RhodyLife"],
    "huff_count": 0,
    "rebaa_count": 0,
    "reply_count": 0,
    "created_at": "2026-02-21T14:30:00Z"
  }
}
```

---

## 5. Real-Time Infrastructure

### 5.1 WebSocket Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│  WebSocket   │────▶│    Redis     │
│  (Browser/   │◀────│   Gateway    │◀────│   Pub/Sub    │
│   Mobile)    │     │   (Socket.io)│     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Kafka     │
                     │   Consumer   │
                     └──────────────┘
```

### 5.2 Real-Time Events

```typescript
// Client subscribes to channels
socket.emit('subscribe', {
  channels: [
    'pasture',           // Feed updates
    'barn',              // DM notifications
    'notifications',     // All notifications
    'herd:cs_majors'     // Specific herd
  ]
})

// Server pushes events
interface RealTimeEvent {
  type: 'NEW_BLEAT' | 'NEW_HUFF' | 'NEW_GRAZE' | 'NEW_MESSAGE' | 'NEW_NOTIFICATION'
  payload: Record<string, any>
  timestamp: string
}

// Example: New bleat in feed
{
  "type": "NEW_BLEAT",
  "payload": {
    "bleat_id": "blt_7x8k2m1p9q",
    "preview": "Just aced my CS 212...",
    "author_username": "ramfan2026"
  },
  "timestamp": "2026-02-21T14:30:00Z"
}
```

### 5.3 Presence System

Track online status with Redis:

```
presence:{user_id} -> TTL 60s (heartbeat refreshes)
presence:online    -> Set of online user IDs
```

---

## 6. Authentication & Security

### 6.1 Authentication Flow

```
┌─────────┐                                           ┌─────────┐
│  User   │                                           │ Ramzee  │
└────┬────┘                                           └────┬────┘
     │                                                     │
     │  1. POST /auth/register {uri_email, password}       │
     │────────────────────────────────────────────────────▶│
     │                                                     │
     │  2. Email verification code sent                    │
     │◀────────────────────────────────────────────────────│
     │                                                     │
     │  3. POST /auth/verify-email {code}                  │
     │────────────────────────────────────────────────────▶│
     │                                                     │
     │  4. {access_token, refresh_token}                   │
     │◀────────────────────────────────────────────────────│
     │                                                     │
     │  5. API requests with Authorization header          │
     │────────────────────────────────────────────────────▶│
     │                                                     │
```

### 6.2 Token Strategy

| Token | Type | Expiry | Storage |
|-------|------|--------|---------|
| **Access Token** | JWT (ES256) | 15 minutes | Memory only |
| **Refresh Token** | Opaque UUID | 30 days | HttpOnly cookie + DB |

```typescript
// JWT Payload
interface AccessTokenPayload {
  sub: string          // User ID
  username: string
  is_verified: boolean
  is_shepherd: boolean
  iat: number
  exp: number
}
```

### 6.3 Security Measures

| Layer | Measure | Implementation |
|-------|---------|----------------|
| **Transport** | TLS 1.3 | Cloudflare edge termination |
| **Auth** | JWT + Refresh rotation | Short-lived access, rotating refresh |
| **API** | Rate limiting | 100 req/min per user, 1000/min per IP |
| **Input** | Validation | Zod schemas on all endpoints |
| **XSS** | Content sanitization | DOMPurify on user content |
| **CSRF** | SameSite cookies | `SameSite=Strict` on refresh token |
| **Passwords** | Argon2id | Memory-hard hashing |
| **Secrets** | Rotation | AWS Secrets Manager with rotation |

### 6.4 URI Email Verification

```typescript
// Only accept @uri.edu emails
const URI_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@uri\.edu$/

async function verifyURIEmail(email: string): Promise<void> {
  if (!URI_EMAIL_REGEX.test(email)) {
    throw new ValidationError('Must use a valid @uri.edu email address')
  }

  // Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString()

  // Store with 15-min TTL
  await redis.setex(`email_verify:${email}`, 900, code)

  // Send via email service
  await emailService.send({
    to: email,
    subject: 'Verify your Ramzee account',
    template: 'email-verification',
    data: { code }
  })
}
```

---

## 7. Infrastructure & Deployment

### 7.1 AWS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   VPC                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Public Subnets                                │    │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │    │
│  │   │     ALB     │    │     NAT     │    │   Bastion   │             │    │
│  │   │             │    │   Gateway   │    │    Host     │             │    │
│  │   └──────┬──────┘    └─────────────┘    └─────────────┘             │    │
│  └──────────┼──────────────────────────────────────────────────────────┘    │
│             │                                                                │
│  ┌──────────┼──────────────────────────────────────────────────────────┐    │
│  │          │           Private Subnets (Apps)                          │    │
│  │   ┌──────▼──────┐                                                    │    │
│  │   │     EKS     │    ┌───────────┐  ┌───────────┐  ┌───────────┐   │    │
│  │   │   Cluster   │───▶│  Service  │  │  Service  │  │  Service  │   │    │
│  │   │             │    │   Pods    │  │   Pods    │  │   Pods    │   │    │
│  │   └─────────────┘    └───────────┘  └───────────┘  └───────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Private Subnets (Data)                            │   │
│  │   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐  │   │
│  │   │    RDS    │    │ ElastiCache│    │    MSK    │    │  OpenSearch│  │   │
│  │   │ PostgreSQL│    │   Redis   │    │   Kafka   │    │            │  │   │
│  │   └───────────┘    └───────────┘    └───────────┘    └───────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Kubernetes Resources

```yaml
# Deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bleat-service
  namespace: ramzee
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bleat-service
  template:
    metadata:
      labels:
        app: bleat-service
    spec:
      containers:
        - name: bleat-service
          image: ramzee/bleat-service:1.2.3
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: ramzee-secrets
                  key: database-url
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bleat-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bleat-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### 7.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/ramzee/${{ matrix.service }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v3
      - uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
      - run: |
          kubectl set image deployment/bleat-service \
            bleat-service=ghcr.io/ramzee/bleat-service:${{ github.sha }} \
            -n ramzee
          kubectl rollout status deployment/bleat-service -n ramzee
```

---

## 8. Observability & Monitoring

### 8.1 Logging Stack

```
Application → Structured JSON → Fluent Bit → OpenSearch → Dashboards
```

```typescript
// Structured log format
logger.info('Bleat created', {
  event: 'bleat.created',
  bleat_id: 'blt_123',
  author_id: 'usr_456',
  bleat_type: 'text',
  duration_ms: 45,
  trace_id: 'abc123'
})
```

### 8.2 Metrics (Prometheus)

```typescript
// Key metrics
const metrics = {
  // RED metrics (Rate, Errors, Duration)
  http_requests_total: Counter,
  http_request_duration_seconds: Histogram,
  http_request_errors_total: Counter,

  // Business metrics
  bleats_created_total: Counter,
  huffs_total: Counter,
  active_users_gauge: Gauge,
  feed_fanout_duration: Histogram
}
```

### 8.3 Distributed Tracing (OpenTelemetry)

```typescript
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('bleat-service')

async function createBleat(data: CreateBleatDto) {
  return tracer.startActiveSpan('createBleat', async (span) => {
    span.setAttribute('bleat.type', data.bleat_type)

    // Database write
    const bleat = await tracer.startActiveSpan('db.insert', async (dbSpan) => {
      const result = await db.insert(bleats).values(data)
      dbSpan.end()
      return result
    })

    // Publish event
    await tracer.startActiveSpan('kafka.produce', async (kafkaSpan) => {
      await kafka.send('bleat.created', bleat)
      kafkaSpan.end()
    })

    span.end()
    return bleat
  })
}
```

### 8.4 Alerting Rules

```yaml
# Critical alerts
groups:
  - name: ramzee-critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: APILatencyHigh
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 1 second"

      - alert: DatabaseConnectionsExhausted
        expr: pg_stat_activity_count > 90
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near exhaustion"
```

---

## 9. Development Workflow

### 9.1 Repository Structure

```
ramzee/
├── apps/
│   ├── api/                    # API Gateway (Fastify)
│   ├── web/                    # Next.js web app
│   ├── admin/                  # Admin dashboard
│   └── mobile/
│       ├── ios/                # Swift/SwiftUI
│       └── android/            # Kotlin/Compose
├── packages/
│   ├── database/               # Drizzle schemas, migrations
│   ├── shared/                 # Shared types, utilities
│   ├── ui/                     # Shared UI components
│   └── config/                 # Shared configs (eslint, tsconfig)
├── services/
│   ├── user-service/
│   ├── bleat-service/
│   ├── feed-service/
│   ├── barn-service/
│   ├── notify-service/
│   ├── search-service/
│   ├── media-service/
│   └── gamify-service/
├── infrastructure/
│   ├── terraform/
│   ├── kubernetes/
│   └── docker/
├── docs/
│   ├── architecture-specification.md
│   ├── api-reference.md
│   └── runbooks/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### 9.2 Local Development

```bash
# Prerequisites
- Node.js 22+
- pnpm 9+
- Docker Desktop
- AWS CLI (for secrets)

# Setup
pnpm install
pnpm db:migrate
pnpm dev

# Services available at:
- API Gateway:    http://localhost:3000
- Web App:        http://localhost:3001
- Admin:          http://localhost:3002
- PostgreSQL:     localhost:5432
- Redis:          localhost:6379
- Kafka UI:       http://localhost:8080
```

### 9.3 Code Quality Gates

| Check | Tool | Threshold |
|-------|------|-----------|
| Type Safety | TypeScript strict | Zero errors |
| Linting | ESLint + Prettier | Zero warnings |
| Unit Tests | Vitest | 80% coverage |
| Integration Tests | Vitest + Testcontainers | Critical paths |
| Security | Snyk | No high/critical |
| Bundle Size | Bundlewatch | Max 200KB initial |

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

```
         ╱╲
        ╱  ╲         E2E Tests (Playwright)
       ╱────╲        - Critical user flows
      ╱      ╲       - 5-10 tests
     ╱────────╲
    ╱          ╲     Integration Tests
   ╱────────────╲    - API endpoints
  ╱              ╲   - Database operations
 ╱────────────────╲  - 50-100 tests
╱                  ╲
╱────────────────────╲ Unit Tests
                       - Business logic
                       - Pure functions
                       - 500+ tests
```

### 10.2 Testing Examples

```typescript
// Unit test (Vitest)
describe('BleatService', () => {
  it('should extract ram tags from content', () => {
    const content = 'Loving this weather! #RhodyLife #Sunny'
    const tags = extractRamTags(content)
    expect(tags).toEqual(['RhodyLife', 'Sunny'])
  })

  it('should enforce 280 character limit', () => {
    const longContent = 'a'.repeat(281)
    expect(() => validateBleatContent(longContent)).toThrow('Content exceeds 280 characters')
  })
})

// Integration test
describe('POST /v1/bleats', () => {
  it('should create a bleat and publish event', async () => {
    const response = await request(app)
      .post('/v1/bleats')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ content: 'Test bleat', bleat_type: 'text' })

    expect(response.status).toBe(201)
    expect(response.body.data.content).toBe('Test bleat')

    // Verify Kafka event was published
    const events = await kafkaConsumer.consume('bleat.created', 1)
    expect(events[0].payload.bleat_id).toBe(response.body.data.id)
  })
})

// E2E test (Playwright)
test('user can create and huff a bleat', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'test@uri.edu')
  await page.fill('[name=password]', 'testpass123')
  await page.click('button[type=submit]')

  await page.fill('[data-testid=bleat-composer]', 'Hello Ramzee!')
  await page.click('[data-testid=post-bleat]')

  await expect(page.locator('text=Hello Ramzee!')).toBeVisible()

  await page.click('[data-testid=huff-button]')
  await expect(page.locator('[data-testid=huff-count]')).toHaveText('1')
})
```

---

## 11. Performance Engineering

### 11.1 Performance Budgets

| Metric | Target | Critical |
|--------|--------|----------|
| Time to First Byte (TTFB) | < 100ms | < 200ms |
| First Contentful Paint (FCP) | < 1.0s | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.0s | < 2.5s |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.25 |
| API P50 Latency | < 50ms | < 100ms |
| API P99 Latency | < 200ms | < 500ms |

### 11.2 Optimization Techniques

```typescript
// 1. Database query optimization
// Use covering indexes
CREATE INDEX idx_bleats_feed ON bleats(author_id, created_at DESC)
  INCLUDE (content, huff_count, rebaa_count);

// 2. Batch operations
async function fanOutBleat(bleatId: string, authorId: string) {
  const grazers = await getGrazers(authorId)

  // Batch Redis writes (100 at a time)
  const pipeline = redis.pipeline()
  for (const grazerId of grazers) {
    pipeline.zadd(`pasture:${grazerId}`, Date.now(), bleatId)
    pipeline.zremrangebyrank(`pasture:${grazerId}`, 0, -1001) // Keep 1000 max
  }
  await pipeline.exec()
}

// 3. Response compression
app.register(fastifyCompress, {
  encodings: ['br', 'gzip'], // Prefer Brotli
  threshold: 1024
})

// 4. Connection pooling
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

### 11.3 Caching Strategy

| Data | Cache | TTL | Invalidation |
|------|-------|-----|--------------|
| User Profile | Redis | 5 min | On update |
| Bleat | Redis | 1 hour | On delete |
| Feed (Pasture) | Redis | Real-time | Fan-out on write |
| Trending (Meadow) | Redis | 5 min | Background job |
| Static Assets | CDN | 1 year | Versioned filenames |

---

## 12. Mobile Architecture

### 12.1 iOS Architecture (Swift)

```swift
// Clean Architecture layers
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │    Views    │  │  ViewModels     │  │
│  │  (SwiftUI)  │  │  (@Observable)  │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│             Domain Layer                │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │   Entities  │  │   Use Cases     │  │
│  │             │  │                 │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│              Data Layer                 │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │Repositories │  │  Data Sources   │  │
│  │             │  │  (API, Cache)   │  │
│  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘

// Example: Bleat creation flow
@Observable
class CreateBleatViewModel {
    var content: String = ""
    var isSubmitting: Bool = false
    var error: String?

    private let createBleatUseCase: CreateBleatUseCase

    func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            try await createBleatUseCase.execute(content: content)
            content = ""
        } catch {
            self.error = error.localizedDescription
        }
    }
}
```

### 12.2 Android Architecture (Kotlin)

```kotlin
// Modern Android stack
- Jetpack Compose (UI)
- Kotlin Coroutines + Flow (Async)
- Hilt (Dependency Injection)
- Retrofit + Moshi (Networking)
- Room (Local caching)

// Example: Feed screen
@HiltViewModel
class PastureViewModel @Inject constructor(
    private val getFeedUseCase: GetFeedUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow<FeedUiState>(FeedUiState.Loading)
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    init {
        loadFeed()
    }

    private fun loadFeed() {
        viewModelScope.launch {
            getFeedUseCase()
                .catch { e -> _uiState.value = FeedUiState.Error(e.message) }
                .collect { bleats -> _uiState.value = FeedUiState.Success(bleats) }
        }
    }
}

@Composable
fun PastureScreen(viewModel: PastureViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (val state = uiState) {
        is FeedUiState.Loading -> LoadingIndicator()
        is FeedUiState.Success -> BleatList(state.bleats)
        is FeedUiState.Error -> ErrorMessage(state.message)
    }
}
```

### 12.3 Offline Support

```
┌─────────────────────────────────────────┐
│              Mobile App                  │
│  ┌─────────────────────────────────┐    │
│  │         Repository              │    │
│  │  ┌─────────┐  ┌─────────────┐  │    │
│  │  │  Remote │  │    Local    │  │    │
│  │  │  Source │  │   (SQLite)  │  │    │
│  │  └────┬────┘  └──────┬──────┘  │    │
│  │       │              │         │    │
│  │       ▼              ▼         │    │
│  │  ┌─────────────────────────┐  │    │
│  │  │    Sync Manager         │  │    │
│  │  │  - Conflict resolution  │  │    │
│  │  │  - Background sync      │  │    │
│  │  │  - Optimistic updates   │  │    │
│  │  └─────────────────────────┘  │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 13. Future Scalability

### 13.1 Multi-Campus Expansion

```
Phase 1: URI Only (Current)
├── Single PostgreSQL cluster
├── Single Redis cluster
└── Single Kafka cluster

Phase 2: Multi-Campus (10 universities)
├── PostgreSQL per region (read replicas)
├── Redis Cluster (geo-distributed)
├── Campus-aware sharding (campus_id in all tables)
└── Global search with Elasticsearch

Phase 3: National Scale (100+ universities)
├── Multi-region active-active
├── CockroachDB or Spanner for global consistency
├── Campus data sovereignty compliance
└── Edge caching per campus
```

### 13.2 Sharding Strategy

```sql
-- Shard key: campus_id (after multi-campus)
-- All queries include campus_id for efficient routing

CREATE TABLE bleats (
    id          UUID,
    campus_id   UUID NOT NULL,  -- Shard key
    author_id   UUID NOT NULL,
    content     VARCHAR(280),
    created_at  TIMESTAMPTZ,
    PRIMARY KEY (campus_id, id)  -- Composite PK for sharding
);

-- Shard routing
campus_id -> hash -> shard_number -> physical_node
```

### 13.3 Feature Flags

```typescript
// Gradual rollout for new features
const flags = {
  'fleece-stories': {
    enabled: true,
    rollout: 0.25,           // 25% of users
    campuses: ['uri'],       // Only URI initially
    allowList: ['beta-testers']
  },
  'ram-radio': {
    enabled: false,
    rollout: 0,
    plannedLaunch: '2026-04-01'
  }
}

// Usage
if (await featureFlags.isEnabled('fleece-stories', { userId, campusId })) {
  return <FleeceStories />
}
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Bleat** | A post (equivalent to Tweet) |
| **Huff** | A like/favorite action |
| **Rebaa** | A repost/retweet action |
| **Graze** | To follow another user |
| **Flock** | A user's followers |
| **Pasture** | Home feed |
| **Meadow** | Explore/discover page |
| **Herd** | A group/community |
| **Barn** | Direct messages |
| **Ram Tag** | Hashtag |
| **Golden Fleece** | Verified badge |
| **Shepherd** | Community moderator |
| **Wool** | Achievement/badge |
| **Rhody Points** | Engagement currency |
| **Fleece Theme** | App color theme |
| **Horn Style** | Profile customization |

---

## Appendix B: ADR Log

### ADR-001: Database Selection
**Decision:** PostgreSQL over MongoDB
**Rationale:** Strong consistency requirements for social graph, mature ecosystem, excellent full-text search with pg_trgm

### ADR-002: Event Streaming
**Decision:** Kafka over RabbitMQ
**Rationale:** Higher throughput, built-in partitioning for fan-out, better durability guarantees

### ADR-003: Mobile Framework
**Decision:** Native (Swift/Kotlin) over React Native
**Rationale:** Better performance, smaller team can maintain two codebases, platform-specific features matter for social apps

### ADR-004: API Style
**Decision:** REST over GraphQL
**Rationale:** Simpler caching, team familiarity, most endpoints are simple CRUD, WebSockets for real-time instead of subscriptions

---

*Document maintained by the Ramzee Engineering Team*
*Last reviewed: February 2026*
