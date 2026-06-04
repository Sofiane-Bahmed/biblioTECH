# Bibliotech 📚

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen.svg)](https://nodejs.org/)
[![Framework: Express](https://img.shields.io/badge/Framework-Express-lightgrey.svg)](https://expressjs.com/)

Bibliotech is a robust and scalable Library Management System API. Designed to streamline the operations of a modern library, it provides a comprehensive set of tools for managing books, users, borrowings, and engagement through comments.

## 🌟 Features

- **Role-Based Access Control (RBAC):** Distinct permissions for Users and Administrators.
- **Complete Book Management:** Admins can manage books, categories, and authors with full CRUD support.
- **Borrowing Lifecycle:** Users can borrow books, while admins track status, due dates, and returns.
- **User Engagement:** Integrated comment system for book reviews and discussions.
- **Automated Notifications:** Email alerts for registration, password resets, and library updates via Resend.
- **Secure Image Hosting:** Seamless integration with Cloudinary for high-performance book cover management.
- **Production-Ready Security:** Features rate limiting, Helmet security headers, and JWT-based authentication.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [Cloudinary](https://cloudinary.com/) Account
- [Resend](https://resend.com/) Account

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

3. **Configure environment variables:**
   Create a `.env` file in the root directory and add your credentials:
   ```env
   PORT=8080
   DBURI=mongodb+srv://your_uri
   JWT_SECRET=your_super_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   RESEND_API_KEY=your_resend_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:5000/api`.

---

## 🛠 API Architecture

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT cookie
- `POST /api/auth/forgot-password` - Request password reset

### Public Resources
- `GET /api/books` - List all books (paginated)
- `GET /api/books/:id` - Get detailed book information

### User Actions (Requires Authentication)
- `GET /api/user/profile` - View/Update personal profile
- `GET /api/user/borrows` - View personal borrowing history
- `POST /api/user/comments` - Add a comment to a book

### Admin Controls (Requires Admin Role)
- `GET /api/admin/users` - Manage library members
- `POST /api/admin/books` - Add new books (with image upload)
- `GET /api/admin/borrows` - Overview of all library borrowings
- `POST /api/admin/categories` - Organize library collections

---

## 🏗 Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Validation:** Zod
- **Authentication:** JWT (JSON Web Tokens) & Bcrypt
- **Storage:** Cloudinary (via Multer)
- **Email:** Resend
- **Security:** Helmet, Express-Rate-Limit

---

### Folder Structure
```text
├── config/         # Service configurations (Cloudinary, etc.)
├── controllers/    # Request handlers
├── db/             # Database connection logic
├── middlewares/    # Custom Express middlewares (Auth, Errors)
├── models/         # Mongoose schemas
├── routers/        # API endpoint definitions
├── utils/          # Helper functions and services
└── validations/    # Zod validation schemas
```


