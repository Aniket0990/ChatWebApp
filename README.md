# 🌐 Connecto — Connection-Driven Social & Real-Time Chat Platform

<div align="center">

[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js_20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js_5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io_4.8-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS_3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query_v5-FF4154?style=flat-square&logo=reactquery&logoColor=white)](https://tanstack.com/query)

**Connecto** is a connection-first social networking and real-time communication platform built on the **MERN** stack with **Socket.IO**. Going beyond basic instant messaging, Connecto seamlessly integrates a social connection engine that allows users to discover peers, build and manage meaningful networks through connection requests, and interact in high-speed, private, and group conversations with rich media and document sharing.

🌐 **Live Demo:** [https://connectnchat.vercel.app/](https://connectnchat.vercel.app/)

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Deployment](#-deployment)

</div>

---

## 🚀 Key Features

### 👥 Social Connection & Networking Engine
- **Discover & Expand Your Network:** Real-time search across registered users with intelligent connection status pills (*Connect*, *Pending*, *Connected*).
- **Full Connection Lifecycle:** Send, cancel, accept, decline, and disconnect relationships with instant UI feedback.
- **Dedicated Connection Hub:** Interactive connection management panel displaying sent requests, incoming invitations, and active contacts.
- **Privacy-First Communication:** Messaging boundaries ensuring conversations flow between verified connections.

### 💬 Connection-Centric Real-Time Messaging
- **Instant Bidirectional Messaging:** Sub-millisecond message delivery powered by **Socket.IO** with low latency and automatic fallback.
- **Live Delivery & Read Receipts:**
  - `✔` **Sent:** Saved to database and dispatched.
  - `✔✔` **Delivered:** Successfully received on peer device.
  - `✔✔` *(Seen)*: Read receipt triggered upon active conversation viewing.
- **Interactive Message Controls:**
  - ✏️ **Inline Editing:** Edit sent messages with live updates synced across all connected devices.
  - 🗑️ **Flexible Deletion:** "Delete for Me" and "Delete for Everyone" with automated file asset cleanup.
  - 📌 **Pin Messages:** Highlight critical messages at the top of conversations for quick reference.
  - 💬 **Contextual Replies:** Quoted thread replies with 1-click jump to the referenced message.
  - 😄 **Emoji Reactions:** Expressive emoji picker with real-time reaction tallies.
- **Live Social Presence:** Real-time typing indicators ("*typing...*") and online/offline status with last-seen timestamps.
- **Cross-Device Sync:** Seamless real-time synchronization of pinned chats and hidden conversation states across multiple tabs and devices.

### 📁 Media & Document Sharing Hub
- **Cloudinary Media Pipeline:** High-speed image upload, CDN optimization, and responsive previewing.
- **Local Document Storage Engine:** Dedicated, authenticated file serving for non-image assets (`PDF`, `DOC/DOCX`, `XLS/XLSX`, `PPT/PPTX`, `TXT`, `CSV`, `ZIP`, `Audio`, `Video`).
- **In-App Document Previewer:** Integrated multi-page document viewer with zoom in/out, rotation, reset controls, and direct download.
- **Smart Compression:** Client-side pre-upload compression and strict 2 MB storage caps.

### 🛡️ Security, Privacy & Profile Management
- **Stateless JWT Auth:** Token-based authentication with secure header verification.
- **Bcrypt Password Security:** Robust salting and hashing protocols protecting user credentials.
- **Customizable User Identity:** Profile editor with avatar uploads, bio updates, and secure password changes.

### 🎨 Modern Glassmorphic UI & Experience
- **TailwindCSS Design System:** Sleek, modern interface with fluid micro-animations and polished layouts.
- **Dark Mode Support:** Built-in dark/light theme switching tailored for day and night use.
- **TanStack React Query v5:** Optimistic UI updates, smart caching, and instant cache invalidation.
- **SEO & Social Sharing:** Rich dynamic meta tags and OpenGraph integration for shareable links.

---

## 🛠 Tech Stack

### Frontend
| Technology | Description |
| :--- | :--- |
| **React 19** | Component-based modern UI library |
| **Vite 8** | Next-generation frontend build tooling and fast HMR |
| **TanStack React Query v5** | Server-state management, caching, and data synchronization |
| **TailwindCSS & PostCSS** | Utility-first styling engine |
| **React Router v7** | Client-side routing and navigation guards |
| **Socket.io-Client** | WebSocket client for real-time events |
| **Axios** | Promise-based HTTP client |
| **React Icons** | Icon collection (`react-icons/fi`, `react-icons/fa6`) |
| **Emoji Picker React** | Native emoji selection panel |
| **React Toastify** | Non-blocking toast alerts and notifications |

### Backend
| Technology | Description |
| :--- | :--- |
| **Node.js** | Server-side JavaScript runtime (v18+) |
| **Express.js 5** | Minimalist web application and API framework |
| **Socket.IO 4.8** | Real-time event-based WebSocket server |
| **MongoDB & Mongoose 9** | NoSQL document database and schema-based modeling |
| **JSONWebToken (JWT)** | Secure token-based session authentication |
| **Bcryptjs** | Password hashing algorithm |
| **Multer** | Multipart/form-data upload handling |
| **Cloudinary SDK** | Cloud media storage and asset optimization |
| **Cors & Dotenv** | Cross-Origin Resource Sharing and environment configuration |

---

## 🚀 Deployment

### Backend Deployment (Render / Railway / Heroku)
1. Set the root directory to `server`.
2. Set Build Command: `npm install`.
3. Set Start Command: `node server.js` (or `npm start`).
4. Configure required server environment variables in your hosting provider's dashboard.
5. Ensure CORS configuration allows your production frontend domain.

### Frontend Deployment (Vercel / Netlify)
1. Set the root directory to `client`.
2. Set Build Command: `npm run build`.
3. Set Output Directory: `dist`.
4. Configure production API URL in your hosting provider's dashboard.
5. Configure SPA rewrite rules (`vercel.json` or `_redirects` for Netlify) to route all paths to `index.html`.

---

## 🛡️ Security & Best Practices
- **Data Validation & Sanitization:** Path traversal safeguards on file serving and strict schema constraints with Mongoose.
- **Payload Limits:** 2 MB file size cap enforced on both client compression pipeline and server multer middleware.
- **Credential Storage:** Hashing passwords with modern bcrypt rounds before saving to database.
- **CORS Policies:** Configurable origins to restrict unauthorized cross-origin API calls.

---

## 🔮 Roadmap
- [x] Real-time 1-on-1 & Group Chat
- [x] Online/Offline Presence & Typing Indicators
- [x] Sent / Delivered / Seen Status Indicators
- [x] Message Edit, Delete, Pinning, and Emoji Reactions
- [x] File Sharing & Document Previewer
- [x] Connection & Network Request System
- [ ] Voice Notes & Audio Recording
- [ ] End-to-End Encryption (E2EE)
- [ ] Video & Audio Calling via WebRTC
- [ ] Push Notifications (PWA / Web Push)

---

## 👨‍💻 Author

**Aniket Shelke**  
*Computer Engineering Graduate \| Full Stack Developer*  
- **GitHub:** [@Aniket0990](https://github.com/Aniket0990)
- **LinkedIn:** [Aniket Shelke](https://www.linkedin.com/in/shelkeaniket/)
- **Email:** [aniketshelke554@gmail.com](mailto:aniketshelke554@gmail.com)

