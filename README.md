# BiblioTECH 📚

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen.svg)](https://nodejs.org/)
[![Framework: Express](https://img.shields.io/badge/Framework-Express-lightgrey.svg)](https://expressjs.com/)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Database: MongoDB](https://img.shields.io/badge/Database-MongoDB-green.svg)](https://www.mongodb.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

BiblioTECH is a robust, production-ready **Library Management System API** built with Express, TypeScript, and MongoDB. Designed for modern libraries, it facilitates operations across members, front-desk staff, and system administrators. It incorporates automated notifications, secure media uploading, automated waiting queues, background jobs, audit logs, and strict library business rules.

---

## 🌟 Key Capabilities & Advanced Systems

### 👥 Role-Based Access Control (RBAC)
The API supports three distinct user roles with strict middleware-enforced authorization levels:
- **Patron (`user`)**: Can search books, request to borrow books, cancel their requests, renew active loans, write reviews, and manage their profile.
- **Librarian (`librarian`)**: Staff-desk agents who manage books, handle checkouts and manual queue placements, approve/reject borrows, record returns with condition assessments, receive fine payments, and manage reservations.
- **Administrator (`admin`)**: Accesses all librarian privileges, system configuration, member blocking/unblocking, role promotion, category curation, comment moderation, audit logs, and analytics dashboard.

---

### ⏱️ Automated Waiting List (FIFO Reservation Queue)
When high-demand books run out of stock, patrons don't get turned away. BiblioTECH implements a **FIFO Reservation Queue**:
1. **Joining the Queue**: If `copies_available === 0`, users requesting a borrow are placed into a `PENDING` reservation queue.
2. **Duplicate Prevention**: Database indexes prevent users from joining a book's queue multiple times concurrently.
3. **Queue Reordering**: Staff desks can manually force queue positioning (`/librarian/reservations/:id/reorder`) for special priorities.
4. **FIFO Allocation**: When a book is returned (`/librarian/borrows/:borrowId/return-book`), the system checks the queue, automatically reserves the copy for the first user in line, transitions the reservation status to `READY_FOR_PICKUP`, and sets a **48-hour pickup window**.

---

### ⚖️ Fine & Suspension Penalty Engine
To ensure books return to the shelves promptly, the system enforces configurable limits defined in `library-rules.ts`:
- **Loan Durations**: Standard borrow period is **7 days**.
- **Renewals Limit**: Max **1 renewal** allowed per borrow (extends the loan by **7 days**).
- **Monthly Caps**: Users are restricted to **3 borrows**, **5 pending requests**, and **5 cancels** per month.
- **Fine System**: Librarians can assess fines for overdue returns or damaged items, and process payments directly at the front desk (`/librarian/borrows/:userId/pay-fine`).
- **Suspensions**: Users who return books damaged/ruined or fail to pay outstanding fines are flagged and suspended for **10 days**, during which borrowing is blocked.

---

### ⏰ Background Tasks (Cron Job)
A scheduler runs in the background using `node-cron` every **15 minutes** to keep the library running smoothly:
- **Pickup Expirations**: Scans for borrow requests approved for pickup but not collected before their `pickup_deadline`.
- **Restocking**: Automatically transitions expired holds to `EXPIRED` status and returns the book back to the available physical inventory.

---

### 📑 Audit Trail & System Analytics
- **Audit Logging**: Major actions (user blocking, staff creation, manual overrides, role updates) are recorded in the `AuditLog` collection, tracking the action performed, performer ID, target resource, and the administrative reason.
- **Real-Time Analytics**: Admin dashboard provides key statistics including total user count, total books, active borrows, and category distributions.

---

## 🛠 Technology Stack

- **Runtime**: Node.js & TypeScript
- **Framework**: Express.js
- **Database & ODM**: MongoDB with Mongoose
- **Input Validation**: Zod (type-safe body, params, and query schemas)
- **Authentication**: JWT (Access and Refresh token rotation) & Bcrypt
- **Image Cloud Storage**: Cloudinary (integrated via Multer & Multer-Storage-Cloudinary)
- **Emails**: Resend & SendGrid (for notifications on registration, passwords, holds)
- **Security**: Helmet, Express-Rate-Limit, CORS

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher)
- [MongoDB](https://www.mongodb.com/) (Local server or Atlas cluster)
- [Cloudinary](https://cloudinary.com/) Account (for uploading cover covers)
- [Resend](https://resend.com/) Account (for sending transactional emails)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/bibliotech.git
   cd bibliotech
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory. Use the template below:
   ```env
   PORT=8080
   NODE_ENV=development
   
   # MongoDB Connection String
   DBURI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bibliotech
   
   # JWT Configuration
   JWT_SECRET=your_jwt_signing_secret_key
   JWT_ACCESS_SECRET=your_jwt_access_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
   
   # Transactional Email Key
   RESEND_API_KEY=re_your_resend_api_key
   
   # Cloudinary Media Storage Configurations
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Book Information Sourcing
   GOOGLE_BOOKS_API_KEY=your_google_books_key
   ```

4. **Seed the Database (Populate with mock data):**
   ```bash
   npm run db:seed
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The API will start and listen at `http://localhost:8080`.

6. **Build for Production:**
   ```bash
   npm run build
   ```

7. **Run Tests:**
   ```bash
   npm run test
   ```

---

## 🏗 Project Architecture

```text
├── config/             # Service adapters (Cloudinary, Resend configurations)
├── constants/          # Business limits and rule values (library-rules.ts)
├── controllers/        # Request handlers (separated into admin, common, librarian, user)
├── db/                 # Database initialization and seeding logic
├── jobs/               # Background schedulers (Cron jobs for loan expirations)
├── middlewares/        # Express handlers (authenticate, authorize, validation, file upload)
├── models/             # Mongoose schemas (Book, User, Borrow, Reservation, AuditLog, etc.)
├── routers/            # API Route managers (versioned structure matching roles)
├── services/           # Business logic layers (segmented by modules and roles)
├── tests/              # Automated tests (unit and integration tests matching controllers/services roles)
├── types/              # TypeScript type definitions and interfaces
├── utils/              # Help services (custom exceptions, emails, loggers)
└── validations/        # Zod input schemas enforcing validation
```

---

## 🌐 API Endpoint Reference

### 🔐 Public & Authentication Endpoints (`/api/auth`, `/api/books`)

<details>
  <summary>Click to view Public & Authentication Endpoints</summary>
  <br>

| Method | Endpoint | Access | Description | Input Highlights (JSON Body / Query) |
|:---|:---|:---|:---|:---|
| **POST** | `/api/auth/register` | Public | Register as a new patron | `fullName`, `email`, `password`, `phone` (optional), `role` |
| **POST** | `/api/auth/login` | Public | Log in to obtain tokens | `email`, `password` |
| **POST** | `/api/auth/logout` | Public | Terminate session | None (clears auth cookies) |
| **POST** | `/api/auth/refresh` | Public | Rotate expired access tokens | Refresh token in cookies |
| **POST** | `/api/auth/forgot-password` | Public | Request a password reset link | `email` |
| **PATCH** | `/api/auth/reset-password/:token` | Public | Submit new password | `password` (params: `:token`) |
| **GET** | `/api/books` | Public | List paginated catalog | Query params: `page`, `limit` |
| **GET** | `/api/books/search` | Public | Flexible catalog search | Query params: `title`, `author`, `category`, `language`, etc. |
| **GET** | `/api/books/:bookId` | Public | Fetch book details | Params: `:bookId` |
| **GET** | `/api/health` | Public | Healthcheck endpoint | None |

</details>

### 📖 Patron Actions (Authenticated - `/api/user`)

Requires JWT Bearer authentication.

<details>
  <summary>Click to view Patron Actions</summary>
  <br>

| Method | Endpoint | Access | Description | Key Details |
|:---|:---|:---|:---|:---|
| **GET** | `/api/user/profile/me` | User | Get current user profile | Returns patron metadata and debt info |
| **PUT** | `/api/user/profile/me/update-me` | User | Update profile metadata | Body: `fullName`, `phone` |
| **GET** | `/api/user/profile/me/borrows` | User | Get personal borrowing list | Query: pagination params |
| **POST** | `/api/user/borrows/:bookId/request`| User | Place request to borrow book | Body: `request_date` |
| **PATCH** | `/api/user/borrows/:borrowId/cancel`| User | Cancel pending borrow request | Body: `canceled_message` |
| **PATCH** | `/api/user/borrows/:borrowId/renew` | User | Request 7-day loan extension | Evaluates renewal constraints |
| **POST** | `/api/user/comments/book/:bookId` | User | Post comment/review on book | Body: `content`, `rating` |
| **GET** | `/api/user/comments/book/:bookId` | User | Fetch comments on a book | Paginated |
| **GET** | `/api/user/comments/:commentId` | User | Get comment by ID | Params: `:commentId` |
| **PUT** | `/api/user/comments/:commentId` | User | Edit personal comment | Body: `content`, `rating` |
| **DELETE** | `/api/user/comments/:commentId` | User | Delete personal comment | Params: `:commentId` |

</details>

### 🛠 Librarian Operations (Authenticated - `/api/librarian`)

Requires role `librarian` or `admin`.

<details>
  <summary>Click to view Librarian Operations</summary>
  <br>

| Method | Endpoint | Access | Description | Key Details |
|:---|:---|:---|:---|:---|
| **GET** | `/api/librarian/borrows` | Staff | List and filter all borrows | Query: `status`, `overdue` |
| **POST** | `/api/librarian/borrows/bypass-queue` | Staff | Issue book bypassing queue | Body: `userId`, `bookId`, `reason` |
| **PATCH** | `/api/librarian/borrows/:borrowId/approve` | Staff | Approve borrow request | Body: `approved_message` |
| **PATCH** | `/api/librarian/borrows/:borrowId/reject` | Staff | Reject borrow request | Body: `rejected_message` |
| **PATCH** | `/api/librarian/borrows/:borrowId/cancel` | Staff | Cancel borrow hold | Body: `canceled_message` |
| **PATCH** | `/api/librarian/borrows/:borrowId/confirm-handover` | Staff | Log book pickup handover | Activates loan status |
| **PATCH** | `/api/librarian/borrows/:borrowId/return-book` | Staff | Log returned book / check queue | Body: `condition` (`GOOD`, `DAMAGED`, `RUINED`) |
| **PATCH** | `/api/librarian/borrows/:userId/pay-fine` | Staff | Record cash fine payment | Body: `amountPaid` |
| **GET** | `/api/librarian/borrows/:userId/history` | Staff | View patron loan history | Query: pagination |
| **GET** | `/api/librarian/borrows/:borrowId` | Staff | View specific loan record | Params: `:borrowId` |
| **DELETE**| `/api/librarian/borrows/:borrowId` | Staff | Delete borrow log record | Params: `:borrowId` |
| **POST** | `/api/librarian/books` | Staff | Add book manually | Multipart form: `cover_image` (file) + metadata |
| **POST** | `/api/librarian/books/auto-import` | Staff | Automatic ISBN look-up import | Body: `isbn` (fetches cover & data via Google Books) |
| **PUT** | `/api/librarian/books/:bookId` | Staff | Edit book metadata / cover image | Multipart upload support |
| **DELETE**| `/api/librarian/books/:bookId` | Staff | Delete book from catalog | Params: `:bookId` |
| **POST** | `/api/librarian/reservations/manual` | Staff | Place queue wait hold manually | Body: `userId`, `bookId`, `reason` |
| **PATCH** | `/api/librarian/reservations/:reservationId/extend` | Staff | Extend pickup hold deadline | Body: `extensionHours`, `reason` |
| **PATCH** | `/api/librarian/reservations/:reservationId/reorder` | Staff | Reposition user in FIFO queue | Body: `newPosition`, `reason` |

</details>

### 👑 System Administration (Authenticated - `/api/admin`)

Requires role `admin`.

<details>
  <summary>Click to view System Administration</summary>
  <br>

| Method | Endpoint | Access | Description | Key Details |
|:---|:---|:---|:---|:---|
| **POST** | `/api/admin/users/create-staff` | Admin | Register new librarian/admin | Body: full details, role selection |
| **GET** | `/api/admin/users/get-all` | Admin | List all registered members | Paginated |
| **GET** | `/api/admin/users/:userId` | Admin | Get member detail profile | Params: `:userId` |
| **PUT** | `/api/admin/users/:id/role` | Admin | Modify a member's role | Body: `role` (`user`, `admin`, `librarian`) |
| **PUT** | `/api/admin/users/:userId/block` | Admin | Block user accounts | Disables borrowing privileges |
| **PUT** | `/api/admin/users/:userId/unblock` | Admin | Unblock accounts | Restores privileges |
| **DELETE**| `/api/admin/users/:userId` | Admin | Purge member account | Params: `:userId` |
| **POST** | `/api/admin/categories` | Admin | Add book category schema | Body: `name`, `description` |
| **GET** | `/api/admin/categories` | Admin | List all library categories | None |
| **GET** | `/api/admin/categories/:categoryId` | Admin | Fetch category detail | Params: `:categoryId` |
| **PATCH** | `/api/admin/categories/:categoryId` | Admin | Edit category metadata | Body: `name`, `description` |
| **DELETE**| `/api/admin/categories/:categoryId` | Admin | Remove category from system | Params: `:categoryId` |
| **GET** | `/api/admin/comments` | Admin | Moderation feed of all reviews | Query: pagination parameters |
| **GET** | `/api/admin/stats` | Admin | Library health & inventory metrics | Analytics dashboard aggregation |

</details>

---

## 📜 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for more details.
