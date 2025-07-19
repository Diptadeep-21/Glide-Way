| Best Bus Booking Platform for Smart Travel |
|-------------------------------------------|
| ![GlideWay UI](screenshots/glideway-main.png) |

## 📑 Table of Contents
- [🌟 Introduction](#-introduction)
- [✨ Features](#-features)
  - [👥 Passenger Experience](#-passenger-experience)
  - [🧑‍✈️ Driver Tools](#-driver-tools)
  - [🛡️ Admin Dashboard](#-admin-dashboard)
  - [🚀 Unique Functionalities](#-unique-functionalities)
- [📸 Screenshots](#-screenshots)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [🛠️ Tech Stack](#-tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
- [📈 Future Enhancements](#-future-enhancements)
- [🙋‍♂️ About the Developer](#-about-the-developer)

---

## 🌟 Introduction

**GlideWay** is a modern full-stack bus booking system developed to streamline bus travel for passengers, drivers, and admins. Built by a passionate developer from KIIT University, this project demonstrates expertise in real-time systems, full-stack architecture, and user-first design.

> A smart travel platform enabling effortless booking, real-time tracking, group chats, and personalized travel experiences.

---

## ✨ Features

### 👥 Passenger Experience
- View buses, availability, and detailed trip info
- Book seats with responsive layouts
- Cancel/manage bookings and rate trips
- Chat live with assigned drivers
- Get notified of any delays instantly

### 🧑‍✈️ Driver Tools
- Manage assigned trips and schedules
- View confirmed passengers
- Upload bus images and live status
- Communicate with passengers in real-time

### 🛡️ Admin Dashboard
- Manage buses, routes, and all users
- Monitor real-time revenue and booking stats
- Assign trips, analyze system metrics
- Handle issues and data centrally

### 📡 Unique Functionalities
- ✅ Live group chat between co-passengers
- ✅ Delay alerts via email + dashboard updates
- ✅ Group booking with smart fare splitting
- ✅ Amenity-wise feedback (WiFi, cleanliness, comfort)

---

## 📸 Screenshots

<details>
<summary><b>🔽 Click to View Screenshots</b></summary>

### 🏠 Home Page

| Hero Banner | Role Selector |
|-------------|---------------|
| ![Hero](screenshots/home.png) | ![Roles](screenshots/roles.png) |

### 🎟️ Booking Flow

| Seat Layout | Booking Confirmation |
|-------------|----------------------|
| ![Seats](screenshots/seats.png) | ![Confirm](screenshots/confirm.png) |

### 🗣️ Real-Time Chat

| Passenger Chat | Driver View |
|----------------|-------------|
| ![Passenger Chat](screenshots/chat-passenger.png) | ![Driver Chat](screenshots/chat-driver.png) |

### 📊 Admin Panel

| Overview Dashboard | Revenue Trends |
|--------------------|----------------|
| ![Admin Panel](screenshots/admin-dashboard.png) | ![Revenue](screenshots/revenue.png) |

</details>

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** + **npm** (for frontend and backend)
- **Express.js** (for backend API framework, installed via npm)
- **MongoDB** (Atlas or local)
- **Cloudinary** (for image storage) or local file storage
- **Mapbox API Key** (for live tracking maps)

### Installation

#### 📁 Backend Setup
```bash
cd bus-auth-backend
npm install
npm run dev
