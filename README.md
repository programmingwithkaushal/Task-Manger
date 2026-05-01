# TaskFlow — Team Task Manager

A full-stack Team Task Manager application with role-based access control, project management, task tracking, and a real-time dashboard.

## Tech Stack

| Layer          | Technology                     |
|----------------|--------------------------------|
| Frontend       | HTML, CSS, Vanilla JavaScript  |
| Backend        | Node.js + Express.js           |
| Database       | MongoDB + Mongoose             |
| Authentication | JWT + bcrypt                   |
| Deployment     | Railway-ready                  |

## Features

- **Authentication** — Signup, Login, JWT-based session, password hashing
- **Role-Based Access** — Admin (full CRUD) vs Member (view/update status)
- **Project Management** — Create, edit, delete projects; manage team members
- **Task Management** — Create, assign, prioritize, and track tasks with overdue detection
- **Dashboard** — Stats overview with total, completed, pending, in-progress, and overdue counts
- **Responsive UI** — Mobile-friendly sidebar, cards, modals, and modern design

## Installation

### Prerequisites
- Node.js v18+ 
- MongoDB (local or Atlas)

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd team-task-manager

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Edit .env with your values
# MONGODB_URI=mongodb://localhost:27017/team-task-manager
# JWT_SECRET=your_super_secret_key
# PORT=5000

# 5. Start the server
npm run dev
```

The app will be available at `http://localhost:5000`

## Environment Variables

| Variable      | Description                          | Example                                        |
|---------------|--------------------------------------|------------------------------------------------|
| `MONGODB_URI` | MongoDB connection string            | `mongodb://localhost:27017/team-task-manager`   |
| `JWT_SECRET`  | Secret key for signing JWT tokens    | `my_super_secret_key_123`                      |
| `PORT`        | Server port                          | `5000`                                         |

## API Endpoints

### Auth
| Method | Endpoint            | Access  | Description       |
|--------|---------------------|---------|--------------------|
| POST   | `/api/auth/signup`  | Public  | Register new user  |
| POST   | `/api/auth/login`   | Public  | Login user         |
| GET    | `/api/auth/me`      | Private | Get current user   |

### Projects
| Method | Endpoint              | Access       | Description         |
|--------|-----------------------|--------------|---------------------|
| GET    | `/api/projects`       | Private      | List projects       |
| GET    | `/api/projects/:id`   | Private      | Get single project  |
| POST   | `/api/projects`       | Admin only   | Create project      |
| PUT    | `/api/projects/:id`   | Admin only   | Update project      |
| DELETE | `/api/projects/:id`   | Admin only   | Delete project      |

### Tasks
| Method | Endpoint                     | Access       | Description         |
|--------|------------------------------|--------------|---------------------|
| GET    | `/api/tasks`                 | Private      | List tasks          |
| GET    | `/api/tasks/:id`             | Private      | Get single task     |
| POST   | `/api/tasks`                 | Admin only   | Create task         |
| PUT    | `/api/tasks/:id`             | Private*     | Update task         |
| DELETE | `/api/tasks/:id`             | Admin only   | Delete task         |
| GET    | `/api/tasks/dashboard/stats` | Private      | Dashboard stats     |

*Members can only update the `status` field of tasks assigned to them.

### Users
| Method | Endpoint       | Access  | Description      |
|--------|----------------|---------|------------------|
| GET    | `/api/users`   | Private | List all users   |

## Folder Structure

```
team-task-manager/
├── server.js
├── package.json
├── .env / .env.example
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── admin.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   └── routes/
│       ├── auth.js
│       ├── projects.js
│       ├── tasks.js
│       └── users.js
└── frontend/
    ├── css/style.css
    ├── js/
    │   ├── api.js
    │   ├── auth.js
    │   ├── sidebar.js
    │   ├── dashboard.js
    │   ├── projects.js
    │   ├── tasks.js
    │   └── profile.js
    └── pages/
        ├── login.html
        ├── signup.html
        ├── dashboard.html
        ├── projects.html
        ├── tasks.html
        └── profile.html
```

## Deployment to Railway

1. Push your code to a GitHub repository
2. Connect the repo to [Railway](https://railway.app)
3. Add a MongoDB plugin (or use MongoDB Atlas)
4. Set environment variables in Railway:
   - `MONGODB_URI` — your MongoDB connection string
   - `JWT_SECRET` — a strong random secret
   - `PORT` — Railway assigns this automatically
5. Deploy — Railway will run `npm start` automatically

## Internal Architecture

### JWT Authentication Flow
1. User submits credentials → server validates → returns signed JWT
2. Client stores token in `localStorage`
3. Every API request includes `Authorization: Bearer <token>` header
4. `auth` middleware decodes token → fetches user → attaches to `req.user`
5. On 401 response, client clears storage and redirects to login

### Mongoose Schema Relationships
- `project.createdBy` → references `User` (who created the project)
- `project.members[]` → array of `User` references (team members)
- `task.assignedTo` → references `User` (who the task is assigned to)
- `task.projectId` → references `Project` (which project the task belongs to)

### Role-Based Middleware
- `auth` middleware: verifies JWT, attaches user to request
- `admin` middleware: checks `req.user.role === 'Admin'`, returns 403 if not

### Overdue Task Detection
- A task is **overdue** if `status !== 'Completed'` AND `dueDate < now`
- Computed via a Mongoose virtual field `isOverdue` on the Task model
- Dashboard aggregates overdue count server-side

### Dashboard Logic
- Admin sees stats for **all** tasks across all projects
- Member sees stats only for tasks **assigned to them**
- "My Tasks" always shows the current user's assigned tasks
