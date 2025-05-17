(() => {
    // Utilities
    const PRIORITY_COLORS = {
        High: 'priority-high',
        Medium: 'priority-medium',
        Low: 'priority-low',
    };

    // Elements
    const loginSection = document.getElementById('login-section');
    const loginButton = document.getElementById('login-button');
    const usernameInput = document.getElementById('username-input');
    const loginError = document.getElementById('login-error');

    const appSection = document.getElementById('app-section');
    const welcomeUser = document.getElementById('welcome-user');
    const logoutButton = document.getElementById('logout-button');

    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskPrioritySelect = document.getElementById('task-priority');
    const taskDeadlineInput = document.getElementById('task-deadline');
    const taskRecurringSelect = document.getElementById('task-recurring');
    const taskListElem = document.getElementById('task-list');

    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    const themeToggle = document.getElementById('theme-toggle');

    // State
    let currentUser = null;
    let tasks = [];
    let dragSrcEl = null;
    let calendarDate = new Date();

    // LocalStorage Helpers
    const STORAGE_KEY_USERS = 'atm_users';

    function saveUsers(users) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }

    function loadUsers() {
        const users = localStorage.getItem(STORAGE_KEY_USERS);
        return users ? JSON.parse(users) : {};
    }

    function saveTasksForUser(username, tasks) {
        const users = loadUsers();
        users[username] = tasks;
        saveUsers(users);
    }

    function loadTasksForUser(username) {
        const users = loadUsers();
        return users[username] || [];
    }

    // Authentication
    function login(username) {
        username = username.trim().toLowerCase();
        if (!username) {
            loginError.textContent = 'Please enter a valid username.';
            return false;
        }
        currentUser = username;
        loginError.textContent = '';
        loginSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        welcomeUser.textContent = `Welcome, ${username}`;
        tasks = loadTasksForUser(username);
        taskDeadlineInput.min = new Date().toISOString().split('T')[0];
        renderTaskList();
        renderCalendar();
        requestNotificationPermission();
        return true;
    }

    function logout() {
        currentUser = null;
        tasks = [];
        appSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        usernameInput.value = '';
        taskListElem.innerHTML = '';
        calendarGrid.innerHTML = '';
    }

    // Notifications
    function requestNotificationPermission() {
        if (!("Notification" in window)) {
            return;
        }
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    function notifyTask(task) {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            new Notification("Task Reminder", {
                body: `Task: "${task.title}" is due soon!`,
                icon: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
            });
        }
    }

    // Task Helpers
    function addTask(title, priority, deadline, recurring) {
        const id = Date.now().toString();
        const task = {
            id,
            title,
            priority,
            deadline: deadline || null,
            recurring: recurring || '',
            completed: false,
            createdAt: Date.now(),
            order: tasks.length,
        };
        tasks.push(task);
        saveTasksForUser(currentUser, tasks);
        renderTaskList();
        renderCalendar();
        if (task.deadline) scheduleNotification(task);
    }

    function editTask(id, updates) {
        const index = tasks.findIndex(t => t.id === id);
        if (index >= 0) {
            tasks[index] = { ...tasks[index], ...updates };
            saveTasksForUser(currentUser, tasks);
            renderTaskList();
            renderCalendar();
        }
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasksForUser(currentUser, tasks);
        renderTaskList();
        renderCalendar();
    }

    function toggleCompleteTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveTasksForUser(currentUser, tasks);
            renderTaskList();
        }
    }

    // Drag and Drop reorder
    function reorderTasks(newOrders) {
        newOrders.forEach(({ id, order }) => {
            const index = tasks.findIndex(t => t.id === id);
            if (index >= 0) {
                tasks[index].order = order;
            }
        });
        tasks.sort((a,b) => a.order - b.order);
        saveTasksForUser(currentUser, tasks);
        renderTaskList();
    }

    // Recurring tasks helper
    function getNextRecurringDate(currentDateStr, frequency) {
        if (!currentDateStr) return null;
        const currentDate = new Date(currentDateStr);
        switch (frequency) {
            case 'Daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'Weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'Monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            default:
                return null;
        }
        return currentDate.toISOString().split('T')[0];
    }

    // Schedule notification for deadline 1 hour before or immediately if less than 1 hour left
    let notificationTimeouts = {};
    function scheduleNotification(task) {
        if (!task.deadline || task.completed) return;
        const deadlineTime = new Date(task.deadline + 'T23:59:59').getTime();
        const now = Date.now();
        const diff = deadlineTime - now;
        if (diff <= 0) return;
        if (notificationTimeouts[task.id]) clearTimeout(notificationTimeouts[task.id]);
        const notifyTime = diff > 3600000 ? diff - 3600000 : 0;
        notificationTimeouts[task.id] = setTimeout(() => {
            notifyTask(task);
        }, notifyTime);
    }

    // Render task list
    function renderTaskList() {
        tasks.sort((a,b) => a.order - b.order);
        taskListElem.innerHTML = '';
        if (tasks.length === 0) {
            const noTasksElem = document.createElement('li');
            noTasksElem.textContent = 'No tasks available. Add some tasks!';
            noTasksElem.style.textAlign = 'center';
            noTasksElem.style.color = '#777';
            taskListElem.appendChild(noTasksElem);
            return;
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.setAttribute('draggable', 'true');
            li.dataset.taskId = task.id;
            li.className = task.completed ? 'completed' : '';
            li.classList.remove('dragging');

            const infoDiv = document.createElement('div');
            infoDiv.className = 'task-info';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'task-title';
            titleSpan.textContent = task.title;
            infoDiv.appendChild(titleSpan);

            const metaDiv = document.createElement('div');
            metaDiv.className = 'task-meta';

            const prioritySpan = document.createElement('span');
            prioritySpan.textContent = `Priority: ${task.priority || 'None'}`;
            prioritySpan.className = PRIORITY_COLORS[task.priority] || '';
            metaDiv.appendChild(prioritySpan);

            if (task.deadline) {
                const deadlineSpan = document.createElement('span');
                const deadlineDate = new Date(task.deadline);
                deadlineSpan.textContent = `Due: ${deadlineDate.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})}`;
                metaDiv.appendChild(deadlineSpan);
            }

            if (task.recurring) {
                const recSpan = document.createElement('span');
                recSpan.textContent = `Recurring: ${task.recurring}`;
                metaDiv.appendChild(recSpan);
            }

            infoDiv.appendChild(metaDiv);
            li.appendChild(infoDiv);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';

            const completeBtn = document.createElement('button');
            completeBtn.title = task.completed ? 'Mark as Incomplete' : 'Mark as Completed';
            completeBtn.setAttribute('aria-label', completeBtn.title);
            completeBtn.innerHTML = task.completed ? '↺' : '&#10003;';
            completeBtn.style.color = task.completed ? '#ff9800' : '#28a745';
            completeBtn.addEventListener('click', e => {
                e.stopPropagation();
                toggleCompleteTask(task.id);
                if (!task.completed && task.recurring) {
                    const nextDate = getNextRecurringDate(task.deadline, task.recurring);
                    if (nextDate) addTask(task.title, task.priority, nextDate, task.recurring);
                }
            });
            actionsDiv.appendChild(completeBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.title = 'Delete Task';
            deleteBtn.setAttribute('aria-label', 'Delete Task');
            deleteBtn.innerHTML = '&#x1F5D1;';
            deleteBtn.style.color = '#d9534f';
            deleteBtn.addEventListener('click', e => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this task?')) deleteTask(task.id);
            });
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(actionsDiv);

            li.addEventListener('dragstart', dragStart);
            li.addEventListener('dragover', dragOver);
            li.addEventListener('dragenter', dragEnter);
            li.addEventListener('dragleave', dragLeave);
            li.addEventListener('drop', drop);
            li.addEventListener('dragend', dragEnd);

            taskListElem.appendChild(li);
        });
    }

    // Drag and Drop handlers
    function dragStart(e) {
        dragSrcEl = e.currentTarget;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSrcEl.dataset.taskId);
        dragSrcEl.classList.add('dragging');
    }

    function dragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function dragEnter(e) {
        if (e.currentTarget !== dragSrcEl) e.currentTarget.style.backgroundColor = '#e0f0ff';
    }

    function dragLeave(e) {
        e.currentTarget.style.backgroundColor = '';
    }

    function drop(e) {
        e.stopPropagation();
        e.currentTarget.style.backgroundColor = '';
        const draggedId = e.dataTransfer.getData('text/plain');
        const droppedId = e.currentTarget.dataset.taskId;
        if (draggedId === droppedId) return;
        const draggedIndex = tasks.findIndex(t => t.id === draggedId);
        const droppedIndex = tasks.findIndex(t => t.id === droppedId);
        tasks.splice(droppedIndex, 0, tasks.splice(draggedIndex, 1)[0]);
        tasks.forEach((task, idx) => task.order = idx);
        saveTasksForUser(currentUser, tasks);
        renderTaskList();
    }

    function dragEnd(e) {
        if (dragSrcEl) dragSrcEl.classList.remove('dragging');
        dragSrcEl = null;
    }

    // Calendar rendering
    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        calendarMonthYear.textContent = calendarDate.toLocaleDateString(undefined, {year: 'numeric', month: 'long'});

        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(wd => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day';
            dayHeader.style.fontWeight = '700';
            dayHeader.style.backgroundColor = 'var(--calendar-header-bg)';
            dayHeader.style.color = 'var(--calendar-header-text)';
            dayHeader.textContent = wd;
            calendarGrid.appendChild(dayHeader);
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month +1, 0);
        const firstDayWeekday = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const prevMonthLastDate = new Date(year, month, 0).getDate();

        for (let i=firstDayWeekday-1; i>=0; i--) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day other-month';
            dayDiv.textContent = prevMonthLastDate - i;
            calendarGrid.appendChild(dayDiv);
        }

        for (let day=1; day<=daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            if (day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear()) {
                dayDiv.classList.add('today');
            }
            dayDiv.innerHTML = `<span class="date-number">${day}</span>`;
            const dateIso = new Date(year, month, day).toISOString().split('T')[0];
            const tasksDue = tasks.filter(t => t.deadline === dateIso);
            if (tasksDue.length > 0) {
                const countSpan = document.createElement('span');
                countSpan.className = 'task-count';
                countSpan.textContent = tasksDue.length;
                dayDiv.appendChild(countSpan);
            }
            calendarGrid.appendChild(dayDiv);
        }

        const totalCells = calendarGrid.childElementCount;
        const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i=1; i<=remainder; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day other-month';
            dayDiv.textContent = i;
            calendarGrid.appendChild(dayDiv);
        }
    }

    // Theme toggle
    function loadTheme() {
        const theme = localStorage.getItem('atm_theme') || 'light';
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.checked = false;
        }
    }

    function saveTheme(theme) {
        localStorage.setItem('atm_theme', theme);
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
            saveTheme('dark');
        } else {
            document.body.classList.remove('dark-mode');
            saveTheme('light');
        }
    });

    // Event Listeners for login/logout and form submit
    loginButton.addEventListener('click', () => login(usernameInput.value));

    usernameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') login(usernameInput.value);
    });

    logoutButton.addEventListener('click', logout);

    taskForm.addEventListener('submit', e => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        const priority = taskPrioritySelect.value;
        const deadline = taskDeadlineInput.value || null;
        const recurring = taskRecurringSelect.value || '';
        if (!title || !priority) {
            alert('Please enter a task title and select priority.');
            return;
        }
        addTask(title, priority, deadline, recurring);
        taskForm.reset();
    });

    prevMonthBtn.addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Initialize theme on load
    loadTheme();

})();
