# Fynix - Smart Expense Tracker

A streamlined finance management app built for simplicity and performance.

## 🏗 Project Architecture

```
Frontend (React — CRA)  <--->  API Server (Node.js + Express)  <--->  Database (Supabase PostgreSQL)
```

## 📂 Project Structure

- **`frontend-cra/`**: User interface built with React (CRA), GSAP for premium animations, and Recharts for spending insights.
- **`backend/`**: Node.js/Express API handling authentication, expense tracking, and database operations via Prisma.

---

## 🚀 Getting Started

### 1. Backend Setup
1. `cd backend`
2. `npm install`
3. Copy `backend/.env.example` to `.env` and set `DATABASE_URL`, `DIRECT_URL`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET` (use two different strong secrets, e.g. `openssl rand -hex 64` for each).
4. `npx prisma migrate deploy` (or `migrate dev` locally) then `npx prisma generate`
5. `npm run dev` (Runs on http://localhost:4000)

### 2. Frontend Setup
1. `cd frontend-cra`
2. `npm install`
3. Create a `.env` file with `REACT_APP_API_URL=http://localhost:4000`.
4. `npm start` (Runs on http://localhost:3000)

---

## 🛠 Tech Stack

- **Frontend**: React, GSAP, Recharts, React Router.
- **Backend API**: Node.js, Express.js, Prisma ORM.
- **Database**: Supabase (PostgreSQL).
- **Authentication**: Email/password with short-lived access JWT (Bearer) and HttpOnly refresh cookie; refresh tokens stored in PostgreSQL for revocation.
