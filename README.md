# TaskFlow

TaskFlow is a full-stack task management platform for organizing projects, assigning work, and tracking team progress.

## Live Demo

https://task-management-system-three-blush.vercel.app

## Features

- User authentication with JWT
- Role-based access control
- Create and manage projects
- Create tasks with priority and status
- Update task status in real time
- Filter tasks by project and status
- Dashboard metrics for task progress
- Persistent MongoDB storage
- Responsive React interface
- Docker configuration
- GitHub Actions CI/CD workflow

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt

### Database
- MongoDB
- Mongoose
- MongoDB Atlas

### Deployment
- Vercel
- Render
- Docker
- GitHub Actions

## Architecture

```text
React / Vite Frontend
        |
        | REST API
        v
Node.js / Express Backend
        |
        v
MongoDB Atlas
