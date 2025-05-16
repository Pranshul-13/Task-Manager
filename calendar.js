// app.js

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const tasksContainer = document.getElementById('tasks');
    const newTaskInput = document.getElementById('new-task');
    const addTaskButton = document.getElementById('add-task');
    const taskDateInput = document.getElementById('task-date');
    const taskTimeInput = document.getElementById('task-time');
    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        editable: true,
        selectable: true,
        events: JSON.parse(localStorage.getItem('tasks') || '[]')
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark');
        if (body.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = 'Light Mode';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = 'Dark Mode';
        }
    });

    // Load Theme from Local Storage
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark');
        themeToggle.textContent = 'Light Mode';
    }

    // Add Task
    addTaskButton.addEventListener('click', () => {
        const taskText = newTaskInput.value.trim();
        const taskDate = taskDateInput.value;
        const taskTime = taskTimeInput.value;

        if (taskText !== '' && taskDate !== '' && taskTime !== '') {
            const taskDateTime = `${taskDate}T${taskTime}`;
            const task = {
                title: taskText,
                start: taskDateTime
            };

            // Add to localStorage
            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            tasks.push(task);
            localStorage.setItem('tasks', JSON.stringify(tasks));

            // Add to calendar
            calendar.addEvent(task);

            // Add to task list
            const taskItem = document.createElement('li');
            taskItem.textContent = `${taskText} - ${taskDate} ${taskTime}`;
            tasksContainer.appendChild(taskItem);

            newTaskInput.value = '';
            taskDateInput.value = '';
            taskTimeInput.value = '';
        }
    });

    // Render Calendar
    calendar.render();
});
