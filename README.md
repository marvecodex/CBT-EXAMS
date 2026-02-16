# CBT Web Application (MVP)

Production-ready MVP for school Computer-Based Testing (CBT) over LAN or internet.

## Features
- Admin: create subjects/exams, upload questions, register students, view/export results.
- Student: login, start one timed attempt, autosave answers, submit manually/auto-submit on timeout, instant result.
- Security controls: JWT auth, one-session lock, per-attempt question shuffle, tab-switch logging, fullscreen request, right-click disabled during exam.

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express + JWT
- DB: PostgreSQL (relational schema + FK constraints)
- Deployment: Docker + Docker Compose

## Project Structure
- `backend/` Express API, migrations, seed scripts
- `frontend/` React app
- `docker-compose.yml` full stack orchestration
- `.env.example` environment template

## API Endpoints
### Auth
- `POST /auth/login`
- `POST /auth/register-student` (admin only)

### Admin
- `POST /admin/subjects`
- `GET /admin/subjects`
- `POST /admin/exams`
- `GET /admin/exams`
- `POST /admin/questions/bulk`
- `GET /admin/results/:examId`
- `GET /admin/results/:examId/export`

### Student
- `GET /student/exams/available`
- `POST /student/attempt/start`
- `POST /student/attempt/answer`
- `POST /student/attempt/submit`
- `GET /student/attempt/result?attemptId=...`
- `POST /student/attempt/log`

## Local Development (without Docker)
1. Start PostgreSQL and create DB `cbt_db`.
2. Backend:
   ```bash
   cd backend
   npm install
   cp ../.env.example .env
   npm run migrate
   npm run seed
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   VITE_API_URL=http://localhost:4000 npm run dev
   ```
4. Open `http://localhost:5173`.

## Docker Deployment (LAN / VPS)
```bash
docker compose up --build -d
```
- Frontend: `http://SERVER_IP:8080`
- Backend API: `http://SERVER_IP:4000`

Students on same LAN can connect via server IP and port 8080.

## Seed Credentials
- Admin: `admin@cbt.local`
- Password: `Admin@123`

## Sample Data
Seed creates:
- Subject: General Knowledge
- Published exam: Sample CBT Entrance Test
- 5 MCQ questions

## Exam Engine Guarantees
- Timer starts at attempt start and backend enforces timeout (auto-submits).
- Only one attempt per student per exam (`UNIQUE(exam_id, student_id)`).
- Attempt bound to `session_token` to prevent multi-session usage.
- Random question order saved per attempt (`attempt_question_order`).
- Autosave from frontend every 5 seconds.

## Production Notes
- Change `JWT_SECRET`.
- Use HTTPS and reverse proxy (Nginx/Caddy) on VPS.
- Restrict CORS to exact frontend domains.
