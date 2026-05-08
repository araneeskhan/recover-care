<div align="center">

# 🏥 RecoverCare

**Bridging the gap between surgical discharge and full recovery.**

A hospital-deployed mobile application that turns the post-surgery period — traditionally a blind spot for hospitals — into a continuously monitored, digitally managed care journey.

[![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-52-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Alert Engine](#-alert-engine)
- [Database Schema](#-database-schema)

---

## 🌟 Overview

Once a patient leaves the hospital after surgery, **RecoverCare** ensures they are never in a blind spot. The app enables patients to:

- 📊 Submit **daily health check-ins** — reporting pain levels, fever, fatigue, and symptoms through guided forms
- 💬 Communicate via **secure, encrypted two-way messaging** with their assigned nurses and doctors
- 💊 Stay on track with **automated medication and appointment reminders**
- 🚨 Get flagged by an **intelligent alert engine** that detects dangerous symptom combinations and notifies healthcare staff in real-time

On the hospital side, nurses and doctors gain **real-time visibility** into every patient's recovery progress, enabling proactive intervention before situations escalate.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🏠 **Recovery Dashboard** | Recovery progress ring, vitals strip, and upcoming tasks at a glance |
| 📋 **Daily Check-In** | 4-step guided form: Mood → Pain & Symptoms → Vitals → Review |
| 💬 **Encrypted Messaging** | Two-way chat with care team, read receipts, online status |
| 💊 **Medication Tracker** | Daily dose schedule, mark-taken, progress bars, PRN support |
| 👤 **Patient Profile** | Surgery info, care team contacts, notification preferences |
| 🚨 **Smart Alerts** | 4-tier severity engine (Critical/High/Medium/Low) auto-flags dangerous symptoms |
| 🔐 **JWT Authentication** | Secure token-based auth with bcrypt password hashing |
| 🐳 **Dockerized Backend** | One-command setup with Docker Compose |

---

## 📱 Screenshots

<div align="center">
<table>
  <tr>
    <td align="center"><b>Home Dashboard</b></td>
    <td align="center"><b>Daily Check-In</b></td>
    <td align="center"><b>Messages</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/home.png" width="250"/></td>
    <td><img src="docs/screenshots/checkin.png" width="250"/></td>
    <td><img src="docs/screenshots/messages.png" width="250"/></td>
  </tr>
  <tr>
    <td align="center"><b>Medications</b></td>
    <td align="center"><b>Profile</b></td>
    <td align="center"><b>Login</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/medications.png" width="250"/></td>
    <td><img src="docs/screenshots/profile.png" width="250"/></td>
    <td><img src="docs/screenshots/login.png" width="250"/></td>
  </tr>
</table>
</div>

> 💡 *Add your own screenshots to `docs/screenshots/` and they'll appear above!*

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    📱 Mobile App (Expo)                     │
│   React Native · Expo Router · TypeScript · Expo Go        │
│                                                            │
│  ┌──────┐ ┌─────────┐ ┌──────────┐ ┌─────┐ ┌─────────┐   │
│  │ Home │ │Check-In │ │ Messages │ │ Meds│ │ Profile │   │
│  └──┬───┘ └────┬────┘ └────┬─────┘ └──┬──┘ └────┬────┘   │
│     └──────────┼───────────┼──────────┼─────────┘         │
│                │     Axios + JWT      │                    │
└────────────────┼───────────┼──────────┼────────────────────┘
                 │           │          │
                 ▼           ▼          ▼
┌────────────────────────────────────────────────────────────┐
│              ⚙️  Express API Server (:3001)                │
│   Node.js · TypeScript · JWT · Helmet · CORS               │
│                                                            │
│  ┌──────┐ ┌─────────┐ ┌────────┐ ┌──────┐ ┌───────────┐  │
│  │ Auth │ │Patients │ │CheckIns│ │ Msgs │ │   Meds    │  │
│  └──────┘ └─────────┘ └───┬────┘ └──────┘ └───────────┘  │
│                            │                               │
│                    ┌───────▼────────┐                      │
│                    │  Alert Engine  │                      │
│                    │  (4-tier rules)│                      │
│                    └───────┬────────┘                      │
│                            │                               │
│                     Prisma ORM                             │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│              🐘 PostgreSQL 17 (:5432)                      │
│   10 tables · Seeded demo data · Docker volume             │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Mobile App
| Technology | Purpose |
|-----------|---------|
| **React Native 0.76** | Cross-platform mobile framework |
| **Expo SDK 52** | Managed workflow, OTA updates |
| **Expo Router** | File-based navigation with tabs |
| **TypeScript** | Type safety |
| **Axios** | HTTP client with JWT interceptor |
| **Expo SecureStore** | Encrypted credential storage |
| **React Native SVG** | Recovery progress ring |
| **Expo Linear Gradient** | Premium gradient UI |

### Backend API
| Technology | Purpose |
|-----------|---------|
| **Node.js 22** | Runtime |
| **Express** | REST API framework |
| **Prisma 6** | Type-safe ORM |
| **PostgreSQL 17** | Relational database |
| **JWT (jsonwebtoken)** | Token-based authentication |
| **bcryptjs** | Password hashing |
| **Helmet** | HTTP security headers |
| **Docker Compose** | Container orchestration |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop))
- **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/araneeskhan/recover-care.git
cd recover-care
```

### 2️⃣ Set Up Environment Variables

Create a `.env` file in the project root:

```env
POSTGRES_USER=recovercare
POSTGRES_PASSWORD=recovercare_secret_2026
POSTGRES_DB=recovercare
DATABASE_URL=postgresql://recovercare:recovercare_secret_2026@db:5432/recovercare
API_PORT=3001
JWT_SECRET=rc-jwt-super-secret-key-change-in-production
NODE_ENV=development
```

### 3️⃣ Start the Backend (Docker)

Make sure Docker Desktop is running, then:

```bash
docker-compose up --build
```

Wait until you see:
```
🏥 RecoverCare API running on port 3001
✅ Seed data created successfully!
```

### 4️⃣ Start the Mobile App

Open a new terminal:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

### 5️⃣ Login

Use the demo credentials:

| Field | Value |
|-------|-------|
| **Email** | `sarah.chen@email.com` |
| **Password** | `password123` |

> **📝 Note:** If running on a physical device, the app auto-detects your machine's IP from Expo's dev server. No manual configuration needed!

---

## 📁 Project Structure

```
recover-care/
├── 📱 mobile/                      # Expo React Native App
│   ├── app/
│   │   ├── _layout.tsx             # Root layout (AuthProvider)
│   │   ├── index.tsx               # Entry redirect
│   │   ├── login.tsx               # Login screen
│   │   ├── chat.tsx                # Chat conversation screen
│   │   ├── medications.tsx         # Medications tracker
│   │   └── (tabs)/
│   │       ├── _layout.tsx         # Tab navigator (4 tabs)
│   │       ├── index.tsx           # 🏠 Home dashboard
│   │       ├── checkin.tsx         # 📋 Daily check-in form
│   │       ├── messages.tsx        # 💬 Conversations list
│   │       └── profile.tsx         # 👤 Patient profile
│   ├── constants/
│   │   └── Colors.ts               # 🎨 Design system tokens
│   ├── hooks/
│   │   └── useAuth.tsx             # 🔐 Auth context provider
│   ├── services/
│   │   └── api.ts                  # 🔗 Axios API client
│   ├── app.json                    # Expo configuration
│   └── package.json
│
├── ⚙️ server/                       # Express API Backend
│   ├── src/
│   │   ├── index.ts                # Server entry point
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.ts             # Login / Register
│   │   │   ├── patients.ts         # Profile & Dashboard
│   │   │   ├── checkins.ts         # Daily check-ins
│   │   │   ├── messages.ts         # Messaging
│   │   │   ├── medications.ts      # Medication tracking
│   │   │   └── appointments.ts     # Appointments
│   │   └── services/
│   │       └── alertEngine.ts      # 🚨 Intelligent alert rules
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema (10 models)
│   │   └── seed.ts                 # Demo data seeder
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml              # 🐳 PostgreSQL + API orchestration
├── .env                            # Environment variables (not in repo)
└── README.md
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/login` | Authenticate user, returns JWT | ❌ |
| `POST` | `/auth/register` | Create new account | ❌ |

### Patient
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/patients/me` | Get patient profile + care team | ✅ |
| `GET` | `/patients/me/dashboard` | Home screen aggregated data | ✅ |

### Check-Ins
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/checkins` | Submit daily check-in (triggers alerts) | ✅ |
| `GET` | `/checkins` | Get check-in history | ✅ |
| `GET` | `/checkins/latest` | Get most recent check-in | ✅ |

### Messages
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/messages/conversations` | List all conversations | ✅ |
| `GET` | `/messages/:staffId` | Get messages in a thread | ✅ |
| `POST` | `/messages` | Send a message | ✅ |

### Medications
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/medications` | Get all medications + logs | ✅ |
| `POST` | `/medications/:id/take` | Mark medication as taken | ✅ |
| `GET` | `/medications/schedule` | Today's medication schedule | ✅ |

### Appointments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/appointments` | Get upcoming appointments | ✅ |

### Health
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/health` | API health check | ❌ |

---

## 🚨 Alert Engine

The intelligent alert system evaluates every check-in submission against clinical rules:

| Severity | Trigger Condition | Response |
|----------|-------------------|----------|
| 🔴 **CRITICAL** | Pain ≥ 8 **AND** fever > 38.5°C | Immediate staff notification — possible post-surgical infection |
| 🟠 **HIGH** | Pain ≥ 8 **OR** fever > 38.5°C **OR** (fever > 38°C + pain ≥ 6) | Priority clinical review |
| 🟡 **MEDIUM** | 3+ symptoms reported **OR** pain spike ≥ 3 from previous check-in | Increased monitoring recommended |
| 🔵 **LOW** | Dizziness + Nausea combination | Possible medication side effect — review at next check-in |

---

## 🗄 Database Schema

```mermaid
erDiagram
    User ||--o| Patient : has
    User ||--o| Staff : has
    Patient ||--o{ CheckIn : submits
    Patient ||--o{ Medication : prescribed
    Patient ||--o{ Appointment : has
    Patient ||--o{ Message : sends
    Patient ||--o{ Alert : triggers
    Patient ||--o{ CareTeamAssignment : assigned
    Staff ||--o{ CareTeamAssignment : assigned
    Staff ||--o{ Message : receives
    Medication ||--o{ MedicationLog : logs

    User {
        uuid id PK
        string email UK
        string password
        enum role
    }
    Patient {
        uuid id PK
        string firstName
        string lastName
        string mrn UK
        int age
        string surgeryType
        date surgeryDate
        string hospital
        int recoveryDays
    }
    Staff {
        uuid id PK
        string firstName
        string lastName
        enum staffRole
        string specialty
    }
    CheckIn {
        uuid id PK
        int painLevel
        float temperature
        array symptoms
        string notes
        string mood
    }
    Medication {
        uuid id PK
        string name
        string dosage
        string frequency
        int totalDoses
        int takenDoses
        boolean isActive
    }
    Alert {
        uuid id PK
        enum severity
        string message
        boolean isResolved
    }
```

---

## 👥 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| 🧑‍🤝‍🧑 Patient | `sarah.chen@email.com` | `password123` |
| 👨‍⚕️ Doctor | `dr.patel@mercygeneral.com` | `password123` |
| 👩‍⚕️ Nurse | `emilie.laurent@mercygeneral.com` | `password123` |

---

<div align="center">

**Built with ❤️ for better post-surgical care**

*RecoverCare — Your recovery, continuously monitored.*

</div>
