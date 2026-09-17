# Task Management System

A full-stack team workflow application with authentication, role-based access control, project/task management, filtering, dashboard analytics, Docker, and CI.

## Stack
- React 19 + Vite
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Docker Compose
- GitHub Actions

## Demo features
- Register/login
- Roles: `admin`, `manager`, `member`
- Create projects (admin/manager)
- Create, assign, edit, and delete tasks
- Status workflow: Todo → In Progress → Review → Done
- Priority and due-date tracking
- Dashboard summary counts
- Search/filter tasks
- Secure API middleware and ownership/team checks

## Quick start
```bash
cp .env.example .env
docker compose up --build
```
Open `http://localhost:5174`.

A demo admin is seeded automatically:
- Email: `admin@example.com`
- Password: `Demo123!`

Change the seed credentials before any real deployment.

## Local development
### API
```bash
cd server
npm install
npm run dev
```
### Client
```bash
cd client
npm install
npm run dev
```

## GitHub
The included workflow installs dependencies and builds the client on pushes and pull requests. Push this folder as a standalone repository.
