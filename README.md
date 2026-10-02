# 🎬 SyncTube — Real-Time YouTube Watch Party

[![Live Demo](https://img.shields.io/badge/Live%20Demo-watch--party--system.vercel.app-blue?style=for-the-badge&logo=vercel)](https://watch-party-system-six.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-Edge_Cache-00E599?style=for-the-badge&logo=redis)](https://upstash.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Database-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A high-performance, real-time collaborative YouTube watch party platform built with **Next.js 16**, **React 19**, **Socket.IO**, **Upstash Redis**, **MongoDB Atlas**, **Clerk Authentication**, and **Tailwind CSS v4**.

Watch YouTube videos together with friends in synchronized sub-300ms playback, role-based controls, automated host succession, interactive live chat, and floating emoji reactions.

---

## 🌐 Live Deployment

- **Production URL**: [https://watch-party-system-six.vercel.app/](https://watch-party-system-six.vercel.app/)
- **Repository**: [https://github.com/kushalpatel8/watch-party-system](https://github.com/kushalpatel8/watch-party-system)

---

## ✨ Key Features

- ⚡ **Sub-300ms Synchronized Playback**: Intelligent master-clock alignment with continuous drift correction (adaptive speed adjustments for minor drifts, instant seek for desyncs).
- 🚀 **Sub-15ms Edge Caching with Upstash Redis**: Edge-cached room snapshots for instant response times during high-frequency room polling and state retrieval.
- 👑 **Role-Based Permission Hierarchy**:
  - **Host**: Full playback control (Play, Pause, Seek, Load Video), promote/demote moderators, manual host transfer, kick participants, and change request reviews.
  - **Moderator**: Delegated playback controls and video request review capabilities.
  - **Participant / Viewer**: Synchronized viewing, video change requests, live chat, and emoji reactions.
- 🔄 **Automated Host Succession**: When a host leaves or disconnects, ownership automatically transfers to the senior moderator or next viewer in line.
- 📨 **Video Change Request Workflow**: Viewers can request YouTube videos; hosts and moderators can approve or decline in real time.
- 💬 **Live Chat with Deduplication**: Instant messaging with zero-latency optimistic delivery, unique message ID tracking, role badges, and MongoDB chat persistence.
- 🎉 **Floating Emoji Reactions**: Live floating reaction animations (`👍`, `❤️`, `😂`, `😮`, `🔥`, `🎉`, `👎`, `💯`).
- 📱 **100% Screen-Fit Responsive Layout**: Zero whole-page scroll design (`h-[100dvh] overflow-hidden`) with a dedicated tab switcher for Viewers and Live Chat on mobile devices, and multi-column view on desktop.
- 🌗 **Dark & Light Mode**: Premium aesthetic with tailored HSL tokens, glassmorphism, and smooth micro-animations.

---

## 📸 Screenshots

<div align="center">

### 1. Landing Page & Room Creation
![Landing Page](./Screenshot1.png)

### 2. Room Lobby & Video Player Controls
![Room Lobby & Player](./Screenshot2.png)

### 3. Live Synchronized Playback, Chat & Participant Management
![Live Playback & Chat](./Screenshot3.png)

</div>

---

## 🏗️ Architecture Overview

The system utilizes a **hybrid dual-layer real-time architecture** that delivers sub-second synchronization in custom stateful Node servers while remaining resilient on serverless cloud platforms (such as Vercel).

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER                                   │
│  Next.js 16 (React 19) • Zustand Store • YouTube IFrame API • Clerk Auth Client │
└────────────────────────┬───────────────────────────────────┬─────────────────────┘
                         │ (WebSocket / Socket.IO)           │ (REST / JSON Polling)
                         ▼                                   ▼
┌──────────────────────────────────────────┐    ┌──────────────────────────────────┐
│           WEBSOCKET SERVER               │    │       NEXT.JS API ROUTES         │
│         (Node.js / server.ts)            │    │    (/api/rooms/[code], etc.)     │
│  • Clerk JWT Handshake Auth              │    │  • Edge-accelerated Handlers     │
│  • Memory Room Manager                   │    │  • Self-healing Host Succession  │
│  • Sub-second Broadcast Pipeline         │    │  • REST Fallback Synchronization │
└────────────────────┬─────────────────────┘    └────────────────┬─────────────────┘
                     │                                           │
                     ▼                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              HIGH-SPEED CACHE LAYER                              │
│                    Upstash Redis (Global Serverless Edge)                        │
│   • Room State Snapshot (`room:{code}:data`)   • User Profiles (`user:{id}`)     │
│   • Sub-15ms Polling Latency                   • Cross-Instance Event Pub/Sub    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ (Async Persistence)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                PERSISTENCE LAYER                                 │
│                           MongoDB Atlas + Mongoose                               │
│       • Room Documents & Memberships           • Persistent Chat History         │
│       • User Accounts & Metadata               • Room Ownership Records          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### How WebSockets Integrate with the System Flow

1. **Authentication & Handshake**:
   - On room entry, the client fetches a fresh Clerk JWT session token.
   - The Socket.IO client connects to `/api/socket`, where `socketAuth.ts` verifies the JWT signature with `@clerk/backend`, attaching the user's `userId`, `username`, and `imageUrl` to `socket.data`.

2. **Room Subscription & State Hydration**:
   - The client emits `join_room { roomId }`.
   - The server registers the socket into the corresponding Socket.IO room room channel (`io.to(roomId)`).
   - The server returns the active `syncState`, `participants`, and pending change requests directly to the client.

3. **Master-Clock Playback Sync**:
   - When the Host performs a playback action (Play, Pause, Seek), a WebSocket event is emitted (`play`, `pause`, `seek`).
   - The server validates the user's role with `PermissionPolicy.can(role, action)`.
   - The server updates the master playback state and broadcasts `sync_state` to all connected clients in the room in sub-100ms.

4. **Self-Healing Dual-Channel Synchronization**:
   - In environments where WebSockets are unavailable or transitioning, clients execute a lightweight 1.5s background poll against `/api/rooms/[code]`.
   - Polling requests hit the **Upstash Redis Edge cache**, resolving in **<15ms** with zero database load.
   - If a host disconnects, automated succession immediately updates Redis and MongoDB, seamlessly promoting the next moderator.

---

## 🔄 Real-Time Sequence Diagrams

### 1. Connection, Authentication & State Hydration

```mermaid
sequenceDiagram
    autonumber
    actor Viewer as Viewer
    participant Client as Next.js Client
    participant Clerk as Clerk Auth
    participant Server as Socket.IO Server
    participant Redis as Upstash Redis
    participant DB as MongoDB Atlas
    participant YT as YouTube Player

    Viewer->>Client: Open Room URL (/room/[code])
    Client->>Clerk: Get Session JWT
    Clerk-->>Client: Return JWT Token
    Client->>Server: socket.connect({ token, roomId })
    Server->>Clerk: verifyToken(token)
    Clerk-->>Server: Valid (userId, username)
    Server->>Redis: getRoomDataCache(code)
    alt Cache Hit
        Redis-->>Server: Return Room Snapshot (<15ms)
    else Cache Miss
        Server->>DB: Fetch Room & Members
        DB-->>Server: Return Room Document
        Server->>Redis: setRoomDataCache(code, data)
    end
    Server->>Server: Add Socket to Room & Assign Role
    Server-->>Client: emit("sync_state", { videoId, playState, currentTime })
    Server-->>Client: emit("user_joined", { participants })
    Client->>YT: Load video & seek to synchronized timestamp
```

### 2. Playback Control & Adaptive Drift Correction

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host
    participant HostClient as Host Client
    participant Socket as Socket.IO / Server
    participant Redis as Upstash Redis
    participant ViewerClient as Viewer Client
    participant ViewerYT as Viewer YouTube Player

    Host->>HostClient: Click Play / Seek (e.g. 02:45)
    HostClient->>Socket: emit("play", { time: 165 })
    HostClient->>Redis: PATCH /api/rooms/[code] (Update Redis Cache)
    Socket->>Socket: Update Master Clock (playState: "playing", time: 165s)
    Socket-->>ViewerClient: broadcast("sync_state", { playState, currentTime })
    
    loop Every 500ms (Drift Monitor)
        ViewerClient->>ViewerClient: Calculate Drift = |playerTime - masterTime|
        alt Drift < 300ms (Synchronized)
            ViewerClient->>ViewerYT: Keep playback rate at 1.0x
        else 300ms <= Drift <= 2000ms (Minor Drift)
            ViewerClient->>ViewerYT: Adjust playbackRate (1.05x or 0.95x) to catch up smoothly
        else Drift > 2000ms (Hard Desync)
            ViewerClient->>ViewerYT: seekTo(masterTime) & playVideo()
        end
    end
```

### 3. Video Change Request & Approval Flow

```mermaid
sequenceDiagram
    autonumber
    actor Viewer as Viewer
    participant ViewerClient as Viewer Client
    participant Server as Socket.IO Server
    participant HostClient as Host Client
    actor Host as Host

    Viewer->>ViewerClient: Submit YouTube URL ("Request Video")
    ViewerClient->>Server: emit("request_change", { type: "change_video", payload: { videoId } })
    Server->>Server: Store ChangeRequest in Room State
    Server-->>HostClient: emit("change_requested", { requestId, requesterUsername, videoId })
    Host->>HostClient: Click "Approve"
    HostClient->>Server: emit("resolve_request", { requestId, approve: true })
    Server-->>ViewerClient: broadcast("sync_state", { videoId, playState: "paused", currentTime: 0 })
    Server-->>HostClient: broadcast("sync_state", { videoId, playState: "paused", currentTime: 0 })
```

### 4. Automated Host Succession & Disconnection

```mermaid
sequenceDiagram
    autonumber
    actor Host as Former Host
    participant HostSocket as Host WebSocket / Tab
    participant Server as Server & API Layer
    participant Redis as Upstash Redis
    participant DB as MongoDB Atlas
    participant NewHost as Senior Moderator / Next Viewer

    Host->>HostSocket: Leaves Room / Closes Window
    HostSocket->>Server: PATCH /api/rooms/[code] { leaveUserId } (keepalive)
    Server->>Server: Remove former host from members list
    Server->>Server: Run Succession: Select Senior Moderator -> Next Viewer
    Server->>DB: Update room.hostId = newHostId, newHost.role = "Host"
    Server->>Redis: setRoomDataCache(code, updatedRoomSnapshot)
    Server-->>NewHost: broadcast("host_transferred", { newHostId, participants })
    NewHost->>NewHost: Unlock Host controls (Play/Pause, URL Input, Kick/Promote)
```

---

## 📂 Code Walkthrough Readiness & Modules

| Module / File | Technology | Purpose & Logic Overview |
|---|---|---|
| [server.ts](file:///server.ts) | Node.js `http` + Next.js | Custom HTTP server integrating the Next.js request handler with the standalone Socket.IO server on a unified port. |
| [server/socketServer.ts](file:///server/socketServer.ts) | Socket.IO + Redis Adapter | Initializes the WebSocket server with CORS reflection, optional Redis pub/sub adapter clustering, and periodic 7-second drift-correction broadcasts. |
| [server/socketAuth.ts](file:///server/socketAuth.ts) | `@clerk/backend` | Middleware that validates Clerk JWT session tokens during the WebSocket handshake before allowing socket connection. |
| [server/RoomManager.ts](file:///server/RoomManager.ts) | In-Memory Map | Singleton manager tracking active stateful `Room` instances in server memory. |
| [server/handlers/](file:///server/handlers/) | Socket Event Handlers | Modular event routers for `roomHandlers`, `playbackHandlers`, `roleHandlers`, `requestHandlers`, and `chatHandlers`. |
| [lib/redis.ts](file:///lib/redis.ts) | `@upstash/redis` | High-speed Edge caching layer caching room snapshots (`room:{code}:data`), user profiles (`user:{id}:profile`), and multi-get helpers. |
| [lib/db.ts](file:///lib/db.ts) | Mongoose | Cached MongoDB connection helper ensuring connection pooling across serverless functions. |
| [models/Room.ts](file:///models/Room.ts) | Mongoose Schema | Database schema for rooms, storing room code, host ID, playback states, member roles, and capped message history (last 200). |
| [hooks/usePlayerSync.ts](file:///hooks/usePlayerSync.ts) | YouTube IFrame API | Core player sync engine executing 500ms drift calculations, dynamic rate adjustment (0.95x/1.05x), and seeking. |
| [hooks/useSocket.ts](file:///hooks/useSocket.ts) | `socket.io-client` + REST | Manages WebSocket lifecycle, attaches event listeners, and runs a 1.5s Upstash-cached polling fallback. |
| [hooks/useRoom.ts](file:///hooks/useRoom.ts) | Zustand Selector | Computed hook providing `me`, `isHost`, `isModerator`, `canControl`, and active room state. |
| [components/room/YouTubePlayer.tsx](file:///components/room/YouTubePlayer.tsx) | React 19 + IFrame API | Video player frame with custom controls, scrubbing bar, volume/fullscreen handlers, and direct gesture execution. |
| [components/room/RoomClient.tsx](file:///components/room/RoomClient.tsx) | React 19 + Lucide Icons | Top-level room workspace coordinator handling SSR data seeding, mobile tab switching, info/leave modals, and layout scaling. |
| [components/room/Chat.tsx](file:///components/room/Chat.tsx) | React 19 + Zustand | Live chat panel with optimistic UI dispatch, unique message ID tracking, role badges, and auto-scrolling. |
| [components/room/ParticipantList.tsx](file:///components/room/ParticipantList.tsx) | React 19 | Role-ranked participant sidebar with rank badges, kick, promote/demote, and manual host transfer actions. |
| [components/room/ReactionBar.tsx](file:///components/room/ReactionBar.tsx) | CSS Animations | Interactive emoji picker with optimistic floating animation physics. |
| [store/roomStore.ts](file:///store/roomStore.ts) | Zustand | Global client state store with smart sliding-window message deduplication and participant synchronization. |

---

## 👥 Role Permissions Matrix

| Capability | Host 👑 | Moderator 🛡️ | Participant 👤 |
|---|:---:|:---:|:---:|
| Play / Pause / Seek Video | ✅ | ✅ | ❌ |
| Load New YouTube URL | ✅ | ✅ | ❌ |
| Request Video Change | ❌ | ❌ | ✅ |
| Approve / Reject Change Requests | ✅ | ✅ | ❌ |
| Promote to Moderator | ✅ | ❌ | ❌ |
| Demote to Participant | ✅ | ❌ | ❌ |
| Kick / Remove Viewers | ✅ | ❌ | ❌ |
| Transfer Host Privileges | ✅ | ❌ | ❌ |
| Live Chat & Emoji Reactions | ✅ | ✅ | ✅ |

---

## 🚀 Setup & Run Instructions

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **Package Manager**: `npm`, `pnpm`, or `yarn`
- **MongoDB Atlas**: A MongoDB database connection URI
- **Clerk Account**: For user authentication keys ([clerk.com](https://clerk.com))
- **Upstash Redis**: An Upstash Redis database for Edge caching ([upstash.com](https://upstash.com))

### 2. Clone the Repository

```bash
git clone https://github.com/kushalpatel8/watch-party-system.git
cd watch-party-system
npm install
```

### 3. Environment Variables Configuration

Create a `.env` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority

# Upstash Redis (Edge Caching & Low-Latency Polling)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
REDIS_URL=rediss://default:...@...upstash.io:6379

# Server Configuration
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Running Locally

#### Development Mode (with Live Hot-Reloading & WebSockets):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build & Execution:
```bash
npm run build
npm run start
```

---

## 📜 Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `tsx watch server.ts` | Starts the custom development server with hot-reloading for both Next.js and WebSockets |
| `build` | `next build && tsc -p tsconfig.server.json` | Generates the optimized Next.js production build and compiles server TypeScript |
| `start` | `node dist/server.js` | Runs the compiled production Node.js + Socket.IO server |
| `lint` | `eslint` | Executes ESLint static code analysis |

---

## 👤 Author

**Kushal Patel**
- **GitHub**: [@kushalpatel8](https://github.com/kushalpatel8)
- **Live Demo**: [watch-party-system-six.vercel.app](https://watch-party-system-six.vercel.app/)

---

## 🛡️ License

This project is open-source and licensed under the [MIT License](LICENSE).
