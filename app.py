# ==============================================================================
# Layer: Backend API Layer (Flask Controller & Routing)
# Description: Serves the single-page frontend from templates/ and static/,
#              defines REST API endpoints, validates incoming JSON payloads,
#              and coordinates with the database layer (db.py).
# ==============================================================================

from flask import Flask, request, jsonify, render_template
import db

# Initialize the Flask application
# Flask will automatically serve templates from the 'templates' folder
# and static assets (CSS, JS) from the 'static' folder.
app = Flask(__name__)


# ------------------------------------------------------------------------------
# Frontend Page Route
# ------------------------------------------------------------------------------
@app.route("/", methods=["GET"])
def index():
    """
    Renders the main single-page application interface.
    The HTML template pulls in static/style.css and static/script.js.
    """
    return render_template("index.html")


# ------------------------------------------------------------------------------
# REST API Endpoints
# ------------------------------------------------------------------------------

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """
    GET /api/tasks
    Retrieves all tasks or filters by status (?status=all|active|done).
    Returns:
        JSON array of task objects with HTTP 200 OK.
    """
    # Read optional 'status' filter query parameter (stretch goal support)
    status_filter = request.args.get("status", "all").lower()

    if status_filter not in ["all", "active", "done"]:
        return jsonify({
            "error": "Invalid status query parameter. Allowed values: 'all', 'active', 'done'."
        }), 400

    tasks = db.get_all_tasks(status=status_filter)
    return jsonify(tasks), 200


@app.route("/api/tasks", methods=["POST"])
def add_task():
    """
    POST /api/tasks
    Creates a new task.
    Request body (JSON):
        {
            "title": "Buy groceries",
            "due_date": "2026-10-30"  (optional)
        }
    Returns:
        HTTP 201 Created with the created task object on success,
        or HTTP 400 Bad Request on invalid input.
    """
    # Ensure request payload contains valid JSON
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({
            "error": "Request body must be a valid JSON object."
        }), 400

    title = data.get("title")
    # Backend input validation: title must be a non-empty string
    if not title or not isinstance(title, str) or not title.strip():
        return jsonify({
            "error": "Task 'title' is required and cannot be empty."
        }), 400

    # Optional due date validation (stretch goal)
    due_date = data.get("due_date")
    if due_date is not None and not isinstance(due_date, str):
        return jsonify({
            "error": "Field 'due_date' must be a string (e.g., 'YYYY-MM-DD')."
        }), 400

    # Clean inputs
    cleaned_title = title.strip()
    cleaned_due_date = due_date.strip() if due_date else None

    # Call database layer to insert the new record
    new_task = db.create_task(title=cleaned_title, due_date=cleaned_due_date)

    return jsonify({
        "message": "Task created successfully.",
        "task": new_task
    }), 201


@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    """
    PATCH /api/tasks/<id>
    Updates an existing task's status (done: true/false), title, or due_date.
    Request body (JSON):
        {
            "done": true,              (optional)
            "title": "Updated Title",   (optional)
            "due_date": "2026-11-01"   (optional)
        }
    Returns:
        HTTP 200 OK with updated task,
        HTTP 404 Not Found if task ID does not exist,
        or HTTP 400 Bad Request if input is invalid.
    """
    # Verify task existence
    existing_task = db.get_task_by_id(task_id)
    if not existing_task:
        return jsonify({
            "error": f"Task with ID {task_id} not found."
        }), 404

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({
            "error": "Request body must be a valid JSON object."
        }), 400

    has_update = False
    done_val = None
    title_val = None
    due_date_val = None

    # Validate and extract 'done'
    if "done" in data:
        done_raw = data["done"]
        if not isinstance(done_raw, (bool, int)):
            return jsonify({
                "error": "Field 'done' must be a boolean or integer (true/false, 1/0)."
            }), 400
        done_val = done_raw
        has_update = True

    # Validate and extract 'title'
    if "title" in data:
        title_raw = data["title"]
        if not isinstance(title_raw, str) or not title_raw.strip():
            return jsonify({
                "error": "Field 'title' cannot be empty."
            }), 400
        title_val = title_raw.strip()
        has_update = True

    # Validate and extract 'due_date'
    if "due_date" in data:
        due_raw = data["due_date"]
        if due_raw is not None and not isinstance(due_raw, str):
            return jsonify({
                "error": "Field 'due_date' must be a string or null."
            }), 400
        due_date_val = due_raw.strip() if due_raw else ""
        has_update = True

    if not has_update:
        return jsonify({
            "error": "No valid fields provided for update. Supply 'done', 'title', or 'due_date'."
        }), 400

    # Perform update in database layer
    updated_task = db.update_task(
        task_id=task_id,
        done=done_val,
        title=title_val,
        due_date=due_date_val
    )

    return jsonify({
        "message": "Task updated successfully.",
        "task": updated_task
    }), 200


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    """
    DELETE /api/tasks/<id>
    Permanently deletes a task by its ID.
    Returns:
        HTTP 200 OK on success,
        or HTTP 404 Not Found if task ID does not exist.
    """
    # Verify task existence
    existing_task = db.get_task_by_id(task_id)
    if not existing_task:
        return jsonify({
            "error": f"Task with ID {task_id} not found."
        }), 404

    # Delete task in database layer
    db.delete_task(task_id)

    return jsonify({
        "message": f"Task {task_id} deleted successfully."
    }), 200


# ------------------------------------------------------------------------------
# JSON Error Handlers for API
# ------------------------------------------------------------------------------
@app.errorhandler(404)
def not_found_error(error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Resource not found."}), 404
    return render_template("index.html"), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error occurred."}), 500


# ------------------------------------------------------------------------------
# Application Startup
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    # Ensure database table and sample records exist before accepting traffic
    db.init_db()

    # Run local development server
    # Accessible at http://127.0.0.1:5000 or http://localhost:5000
    print("[Flask] Starting To-Do application at http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
