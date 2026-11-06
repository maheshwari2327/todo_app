# TaskFlow - Simple To-Do List Web App

A clean, responsive, single-user To-Do List web application built with **Flask**, **SQLite** (using Python's built-in `sqlite3` module with raw SQL), and **Vanilla HTML/CSS/JavaScript** (no frontend frameworks).

---

## 🏗️ Architecture & 3-Layer Separation

This project strictly separates concerns across three distinct layers, with an explicit layer comment at the very top of each file:

```
todo_app/
│
├── db.py                 # [DATABASE LAYER] SQLite schema, seed data, and raw SQL queries
├── app.py                # [BACKEND LAYER] Flask REST API routes, controllers, and input validation
│
├── templates/
│   └── index.html        # [FRONTEND VIEW] Semantic HTML5 template served by Flask
│
├── static/
│   ├── style.css         # [FRONTEND STYLES] Modern glassmorphism CSS, animations & responsive design
│   └── script.js         # [FRONTEND LOGIC] Vanilla JavaScript client, DOM updates & fetch calls
│
├── requirements.txt      # Pinned Python package dependencies
└── README.md             # Documentation, setup guide, and API reference
```

### 1. Database Access Layer (`db.py`)
- Uses Python's built-in `sqlite3` module (zero external ORMs).
- Implements hand-written, parameterized SQL queries (`?` placeholders) to prevent SQL injection.
- Manages connection lifecycle (`get_db_connection()`), table creation, and initial sample data seeding.

### 2. Backend API Layer (`app.py`)
- Flask web server providing RESTful endpoints.
- Validates request payloads and returns standardized JSON responses with proper HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`).
- Serves the frontend single-page interface at `/`.

### 3. Frontend Presentation & Logic Layer (`templates/index.html`, `static/style.css`, `static/script.js`)
- **HTML**: Accessible, semantic structure.
- **CSS**: Dark-theme aesthetics with vibrant gradients, custom animated checkboxes, strike-through transitions, and a completion progress bar.
- **JavaScript**: Pure Vanilla JS handling DOM manipulation, asynchronous `fetch()` API calls, task filter switching, and toast feedback.

---

## 📋 Features

1. **View All Tasks**: Displays the complete task list with titles, completion status, and optional due dates.
2. **Add New Task**: Simple text input and "Add Task" button with instant UI updates.
3. **Toggle Completion**: Click any task's checkbox to mark it done with smooth strike-through styling.
4. **Delete Task**: Dedicated delete button with hover highlight to remove any task.
5. **Real-time Counter & Progress**: Shows `"X of Y tasks done"` alongside a dynamic percentage bar.
6. **Stretch Goal — Status Filters**: Tab buttons to switch between **All**, **Active**, and **Done** tasks with live item counts.
7. **Stretch Goal — Due Dates**: Optional task deadline picker with badges for **Overdue**, **Due Today**, or countdown days.

---

## 🛠️ Prerequisites

- **Python 3.8+** (Python 3.12 recommended)
- **pip** (Python package installer)
- A modern web browser (Google Chrome, Firefox, Safari, Edge)

---

## 🚀 Installation & Setup

### 1. Open Terminal and Navigate to the Project Folder
```powershell
cd "c:\Users\HP\Desktop\gen ai exercises\day7\todo_app"
```

### 2. (Optional but recommended) Create a Virtual Environment
```powershell
# Create a virtual environment named .venv
python -m venv .venv

# Activate on Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# (If using Command Prompt instead of PowerShell):
# .venv\Scripts\activate.bat
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

---

## ▶️ Running the Application

Start the Flask development server:
```powershell
python app.py
```

You should see output similar to:
```
[Database] Initialized and seeded 4 sample tasks.
[Flask] Starting To-Do application at http://127.0.0.1:5000
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### 🌐 Open in Your Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000
```
*(or `http://localhost:5000`)*

---

## 📡 REST API Reference

All API routes return JSON and accept JSON request bodies.

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/tasks` | Get all tasks (supports `?status=all\|active\|done`) | _None_ | `200 OK`, `400 Bad Request` |
| `POST` | `/api/tasks` | Create a new task | `{"title": "Buy groceries", "due_date": "2026-10-31"}` | `201 Created`, `400 Bad Request` |
| `PATCH` | `/api/tasks/<id>` | Update task completion status, title, or due date | `{"done": true}` | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `DELETE` | `/api/tasks/<id>` | Permanently delete a task by ID | _None_ | `200 OK`, `404 Not Found` |

### Sample curl Commands:

- **List all tasks**:
  ```bash
  curl -X GET http://127.0.0.1:5000/api/tasks
  ```

- **Filter active tasks**:
  ```bash
  curl -X GET "http://127.0.0.1:5000/api/tasks?status=active"
  ```

- **Create a task**:
  ```bash
  curl -X POST http://127.0.0.1:5000/api/tasks \
       -H "Content-Type: application/json" \
       -d "{\"title\": \"Complete project report\", \"due_date\": \"2026-10-28\"}"
  ```

- **Mark task #1 as done**:
  ```bash
  curl -X PATCH http://127.0.0.1:5000/api/tasks/1 \
       -H "Content-Type: application/json" \
       -d "{\"done\": true}"
  ```

- **Delete task #1**:
  ```bash
  curl -X DELETE http://127.0.0.1:5000/api/tasks/1
  ```

---

## 🗄️ Database Schema & First Run Seeding

The SQLite database file `todo.db` is automatically created in `todo_app/` upon application startup.

### Schema:
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    due_date TEXT,
    created_at TEXT NOT NULL
);
```

### Seed Data:
On the very first launch, if the table is empty, 4 sample tasks are inserted automatically so the user can immediately interact with active, completed, and due-dated tasks.
