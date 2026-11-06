// ==============================================================================
// Layer: Frontend Logic Layer (Vanilla JavaScript)
// Description: Manages client-side state, dispatches fetch requests to the
//              Flask REST API, handles user interactions, updates the DOM,
//              and manages task filters and counters without any external framework.
// ==============================================================================

// ------------------------------------------------------------------------------
// Global State & Configuration
// ------------------------------------------------------------------------------
// Holds the complete list of tasks loaded from the backend
let allTasks = [];

// Current active filter: 'all' | 'active' | 'done'
let currentFilter = 'all';

// DOM Element References
const taskListEl = document.getElementById('taskList');
const addTaskForm = document.getElementById('addTaskForm');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDueDateInput = document.getElementById('taskDueDateInput');
const taskCounterEl = document.getElementById('taskCounter');
const progressPercentageEl = document.getElementById('progressPercentage');
const progressBarFillEl = document.getElementById('progressBarFill');
const emptyStateEl = document.getElementById('emptyState');
const emptyStateTitleEl = document.getElementById('emptyStateTitle');
const emptyStateDescEl = document.getElementById('emptyStateDesc');
const toastContainer = document.getElementById('toastContainer');
const currentDateDisplay = document.getElementById('currentDateDisplay');

// Filter Tab Buttons
const filterTabs = {
    all: document.getElementById('filterAll'),
    active: document.getElementById('filterActive'),
    done: document.getElementById('filterDone')
};

// Filter Badges
const filterBadges = {
    all: document.getElementById('badgeAll'),
    active: document.getElementById('badgeActive'),
    done: document.getElementById('badgeDone')
};


// ------------------------------------------------------------------------------
// Initialization on Page Load
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 1. Format and display current date in header
    renderCurrentDate();

    // 2. Load initial tasks from the Flask REST API backend
    loadTasks();

    // 3. Attach form submission event for adding a new task
    addTaskForm.addEventListener('submit', handleAddTask);

    // 4. Attach click listeners to filter tabs
    Object.keys(filterTabs).forEach(filterKey => {
        filterTabs[filterKey].addEventListener('click', () => {
            setActiveFilter(filterKey);
        });
    });
});


// ------------------------------------------------------------------------------
// Helper: Display Formatted Header Date
// ------------------------------------------------------------------------------
function renderCurrentDate() {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    const today = new Date();
    currentDateDisplay.textContent = today.toLocaleDateString(undefined, options);
}


// ------------------------------------------------------------------------------
// API Request: Load all tasks (Feature 1)
// ------------------------------------------------------------------------------
async function loadTasks() {
    try {
        // Fetch all tasks from the Flask backend GET /api/tasks
        const response = await fetch('/api/tasks');
        
        if (!response.ok) {
            throw new Error(`Failed to load tasks: HTTP ${response.status}`);
        }

        const data = await response.json();
        // Update local state with tasks from database
        allTasks = data;

        // Render tasks and update stats
        renderUI();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showToast('Unable to connect to server. Please try again.', 'error');
    }
}


// ------------------------------------------------------------------------------
// API Request: Add a new task (Feature 2)
// ------------------------------------------------------------------------------
async function handleAddTask(event) {
    // Prevent default browser form refresh
    event.preventDefault();

    const title = taskTitleInput.value.trim();
    const dueDate = taskDueDateInput.value;

    // Client-side validation: title cannot be empty
    if (!title) {
        showToast('Please enter a task title.', 'error');
        taskTitleInput.focus();
        return;
    }

    try {
        // Send POST request with JSON payload to /api/tasks
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                due_date: dueDate ? dueDate : null
            })
        });

        const result = await response.json();

        if (response.status === 201) {
            // Task successfully created in SQLite database!
            // Prepend new task to local state
            allTasks.unshift(result.task);
            
            // Clear input fields
            taskTitleInput.value = '';
            taskDueDateInput.value = '';
            taskTitleInput.focus();

            // Refresh UI
            renderUI();
            showToast('Task added successfully!', 'success');
        } else {
            // Backend validation error (HTTP 400)
            showToast(result.error || 'Failed to add task.', 'error');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        showToast('Network error while adding task.', 'error');
    }
}


// ------------------------------------------------------------------------------
// API Request: Toggle task done / active (Feature 3)
// ------------------------------------------------------------------------------
async function toggleTaskDone(taskId, newDoneStatus) {
    try {
        // Send PATCH request with updated done status to /api/tasks/<id>
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                done: newDoneStatus
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Update the task item in our local state
            const taskIndex = allTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                allTasks[taskIndex] = result.task;
            }

            // Re-render UI to update strike-through style and counters
            renderUI();
            
            const message = newDoneStatus ? 'Task marked as done!' : 'Task reopened!';
            showToast(message, 'info');
        } else {
            showToast(result.error || 'Failed to update task status.', 'error');
            // Re-render to revert checkbox state if failed
            renderUI();
        }
    } catch (error) {
        console.error('Error toggling task:', error);
        showToast('Network error while updating task.', 'error');
        renderUI();
    }
}


// ------------------------------------------------------------------------------
// API Request: Delete task (Feature 4)
// ------------------------------------------------------------------------------
async function deleteTask(taskId) {
    try {
        // Send DELETE request to /api/tasks/<id>
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            // Remove task from local state
            allTasks = allTasks.filter(t => t.id !== taskId);

            // Re-render task list and counter
            renderUI();
            showToast('Task deleted successfully.', 'info');
        } else {
            showToast(result.error || 'Failed to delete task.', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Network error while deleting task.', 'error');
    }
}


// ------------------------------------------------------------------------------
// Filter Switching (Stretch Goal)
// ------------------------------------------------------------------------------
function setActiveFilter(filterName) {
    currentFilter = filterName;

    // Update active tab styles and accessibility attributes
    Object.keys(filterTabs).forEach(key => {
        const tab = filterTabs[key];
        const isActive = (key === filterName);
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Re-render list with selected filter applied
    renderUI();
}


// ------------------------------------------------------------------------------
// Core UI Render Function (Features 1, 3, 5, Stretch Filters)
// ------------------------------------------------------------------------------
function renderUI() {
    // 1. Calculate statistics
    const totalCount = allTasks.length;
    const completedCount = allTasks.filter(t => t.done === 1 || t.done === true).length;
    const activeCount = totalCount - completedCount;

    // 2. Feature 5: Update counter text "3 of 5 tasks done"
    taskCounterEl.textContent = `${completedCount} of ${totalCount} tasks done`;

    // 3. Update Progress Bar
    const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    progressPercentageEl.textContent = `${percentage}%`;
    progressBarFillEl.style.width = `${percentage}%`;

    // 4. Update Filter Badges
    filterBadges.all.textContent = totalCount;
    filterBadges.active.textContent = activeCount;
    filterBadges.done.textContent = completedCount;

    // 5. Filter tasks for current view
    let visibleTasks = allTasks;
    if (currentFilter === 'active') {
        visibleTasks = allTasks.filter(t => !t.done);
    } else if (currentFilter === 'done') {
        visibleTasks = allTasks.filter(t => t.done);
    }

    // 6. Clear task list DOM
    taskListEl.innerHTML = '';

    // 7. Check if visible task list is empty
    if (visibleTasks.length === 0) {
        emptyStateEl.classList.remove('hidden');
        if (currentFilter === 'active') {
            emptyStateTitleEl.textContent = 'All caught up!';
            emptyStateDescEl.textContent = 'You have no pending active tasks. Great job!';
        } else if (currentFilter === 'done') {
            emptyStateTitleEl.textContent = 'No completed tasks yet';
            emptyStateDescEl.textContent = 'Complete a task to see it here.';
        } else {
            emptyStateTitleEl.textContent = 'No tasks yet';
            emptyStateDescEl.textContent = 'Add your first task using the input above!';
        }
    } else {
        emptyStateEl.classList.add('hidden');

        // 8. Render each task item
        visibleTasks.forEach(task => {
            const taskItemEl = createTaskElement(task);
            taskListEl.appendChild(taskItemEl);
        });
    }
}


// ------------------------------------------------------------------------------
// Create DOM element for a single task item
// ------------------------------------------------------------------------------
function createTaskElement(task) {
    const isDone = (task.done === 1 || task.done === true);

    const li = document.createElement('li');
    li.className = `task-item ${isDone ? 'is-done' : ''}`;
    li.id = `task-${task.id}`;

    // Feature 3: Checkbox container with custom animated checkmark
    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'task-checkbox-label';
    checkboxLabel.title = isDone ? 'Mark as active' : 'Mark as done';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = isDone;
    checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${isDone ? 'active' : 'done'}`);

    // Listen to checkbox toggle event
    checkbox.addEventListener('change', () => {
        toggleTaskDone(task.id, checkbox.checked);
    });

    const customCheckbox = document.createElement('span');
    customCheckbox.className = 'custom-checkbox';
    customCheckbox.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    `;

    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(customCheckbox);

    // Task text and metadata container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'task-content';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    contentDiv.appendChild(titleSpan);

    // Stretch goal: Render due date badge if set
    if (task.due_date) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'task-meta';

        const dueBadge = document.createElement('span');
        const dueDateInfo = formatDueDate(task.due_date, isDone);
        dueBadge.className = `due-badge ${dueDateInfo.badgeClass}`;
        dueBadge.innerHTML = `
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${dueDateInfo.label}
        `;
        metaDiv.appendChild(dueBadge);
        contentDiv.appendChild(metaDiv);
    }

    // Feature 4: Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete task';
    deleteBtn.setAttribute('aria-label', `Delete task "${task.title}"`);
    deleteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
    `;

    // Listen to delete click
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });

    // Assemble the complete task item
    li.appendChild(checkboxLabel);
    li.appendChild(contentDiv);
    li.appendChild(deleteBtn);

    return li;
}


// ------------------------------------------------------------------------------
// Helper: Format Due Date & Calculate Urgency
// ------------------------------------------------------------------------------
function formatDueDate(dueDateStr, isDone) {
    if (isDone) {
        return { label: `Due ${dueDateStr}`, badgeClass: 'completed-due' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse date parts (YYYY-MM-DD)
    const [year, month, day] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: `Overdue (${Math.abs(diffDays)}d)`, badgeClass: 'overdue' };
    } else if (diffDays === 0) {
        return { label: 'Due Today', badgeClass: 'today' };
    } else if (diffDays === 1) {
        return { label: 'Due Tomorrow', badgeClass: 'upcoming' };
    } else {
        return { label: `Due in ${diffDays}d`, badgeClass: 'upcoming' };
    }
}


// ------------------------------------------------------------------------------
// UI Feedback: Toast Notification Manager
// ------------------------------------------------------------------------------
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}
