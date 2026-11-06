# ==============================================================================
# Layer: Database Access Layer (SQLite Database Helper)
# Description: Handles all direct database connections, schema creation,
#              data seeding, and raw SQL queries using Python's built-in sqlite3.
# ==============================================================================

import sqlite3
import os
from datetime import datetime

# Determine the absolute path to the database file in the same directory as db.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "todo.db")


def get_db_connection():
    """
    Establishes and returns a connection to the SQLite database.
    Configures row_factory to sqlite3.Row so query results can be accessed like dictionaries.
    """
    # Open or create the SQLite database file
    conn = sqlite3.connect(DATABASE_PATH)
    
    # sqlite3.Row allows column access by name (e.g., row['title']) instead of just index
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Initializes the database by creating the 'tasks' table if it doesn't exist,
    and seeds the database with sample tasks on the very first run.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create the 'tasks' table with raw SQL
    # - id: unique integer primary key with auto-increment
    # - title: text description of the task (required)
    # - done: integer flag (0 for false/active, 1 for true/done)
    # - due_date: optional ISO date string (YYYY-MM-DD) for task deadline
    # - created_at: timestamp string when the task was created
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            done INTEGER DEFAULT 0,
            due_date TEXT,
            created_at TEXT NOT NULL
        );
    """)
    conn.commit()

    # Check if the table is empty to seed initial sample records on first run
    cursor.execute("SELECT COUNT(*) AS count FROM tasks;")
    row = cursor.fetchone()
    
    if row["count"] == 0:
        # 4 realistic sample records showcasing done and active states with due dates
        sample_tasks = [
            ("Learn Flask & SQLite architecture", 1, "2026-10-22", "2026-10-22 09:00:00"),
            ("Build REST API endpoints for To-Do list", 1, "2026-10-23", "2026-10-23 10:15:00"),
            ("Design sleek glassmorphism UI with Vanilla CSS", 0, "2026-10-25", "2026-10-24 08:30:00"),
            ("Test task filters and complete project stretch goals", 0, "2026-10-26", "2026-10-24 09:00:00")
        ]
        
        # Insert sample tasks using parameterized queries to prevent SQL injection
        cursor.executemany("""
            INSERT INTO tasks (title, done, due_date, created_at)
            VALUES (?, ?, ?, ?);
        """, sample_tasks)
        conn.commit()
        print("[Database] Initialized and seeded 4 sample tasks.")

    cursor.close()
    conn.close()


def get_all_tasks(status=None):
    """
    Retrieves all tasks from the database, with an optional filter for completion status.
    
    Parameters:
        status (str, optional): 'active' (done=0), 'done' (done=1), or None/'all'
        
    Returns:
        list of dict: List of task records formatted as dictionaries.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if status == "active":
        cursor.execute("SELECT id, title, done, due_date, created_at FROM tasks WHERE done = 0 ORDER BY id DESC;")
    elif status == "done":
        cursor.execute("SELECT id, title, done, due_date, created_at FROM tasks WHERE done = 1 ORDER BY id DESC;")
    else:
        cursor.execute("SELECT id, title, done, due_date, created_at FROM tasks ORDER BY id DESC;")

    rows = cursor.fetchall()
    
    # Convert each sqlite3.Row object into a standard Python dictionary
    tasks = [dict(row) for row in rows]

    cursor.close()
    conn.close()
    return tasks


def get_task_by_id(task_id):
    """
    Retrieves a single task by its primary key ID.
    
    Parameters:
        task_id (int): The ID of the task to find.
        
    Returns:
        dict or None: Task dictionary if found, otherwise None.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, title, done, due_date, created_at FROM tasks WHERE id = ?;", (task_id,))
    row = cursor.fetchone()

    cursor.close()
    conn.close()

    return dict(row) if row else None


def create_task(title, due_date=None):
    """
    Inserts a new task into the database.
    
    Parameters:
        title (str): The description/title of the task.
        due_date (str, optional): Due date in YYYY-MM-DD format or None.
        
    Returns:
        dict: The newly created task record.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute("""
        INSERT INTO tasks (title, done, due_date, created_at)
        VALUES (?, 0, ?, ?);
    """, (title.strip(), due_date if due_date else None, created_at))
    
    conn.commit()
    new_id = cursor.lastrowid

    cursor.close()
    conn.close()

    # Fetch and return the newly created task
    return get_task_by_id(new_id)


def update_task(task_id, done=None, title=None, due_date=None):
    """
    Updates one or more fields of an existing task.
    
    Parameters:
        task_id (int): The ID of the task to update.
        done (int or bool, optional): 0 or 1 representing completion.
        title (str, optional): Updated task title.
        due_date (str, optional): Updated due date.
        
    Returns:
        dict or None: The updated task record, or None if the task does not exist.
    """
    # Verify task exists before updating
    existing = get_task_by_id(task_id)
    if not existing:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()

    # Build dynamic SQL update fields based on provided arguments
    fields_to_update = []
    values = []

    if done is not None:
        # Convert boolean to integer (True -> 1, False -> 0)
        done_int = 1 if done in [1, True, "1", "true", "True"] else 0
        fields_to_update.append("done = ?")
        values.append(done_int)

    if title is not None:
        fields_to_update.append("title = ?")
        values.append(title.strip())

    if due_date is not None:
        fields_to_update.append("due_date = ?")
        values.append(due_date if due_date != "" else None)

    # Only run UPDATE if there are fields to update
    if fields_to_update:
        query = f"UPDATE tasks SET {', '.join(fields_to_update)} WHERE id = ?;"
        values.append(task_id)
        cursor.execute(query, tuple(values))
        conn.commit()

    cursor.close()
    conn.close()

    return get_task_by_id(task_id)


def delete_task(task_id):
    """
    Deletes a task by its ID.
    
    Parameters:
        task_id (int): The ID of the task to remove.
        
    Returns:
        bool: True if a task was deleted, False if no task was found.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM tasks WHERE id = ?;", (task_id,))
    conn.commit()
    rows_affected = cursor.rowcount

    cursor.close()
    conn.close()

    return rows_affected > 0
