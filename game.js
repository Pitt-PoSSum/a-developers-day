// Game State - separate column position for each board
const gameState = {
    tasks: [
        { id: 1, title: "Login Bug fixen", board1Column: "todo", board2Column: "todo", board1Locked: false, board2Locked: false, board1LockTimeout: null, board2LockTimeout: null, accountedTime: 0 },
        { id: 2, title: "API Endpoint implementieren", board1Column: "todo", board2Column: "todo", board1Locked: false, board2Locked: false, board1LockTimeout: null, board2LockTimeout: null, accountedTime: 0 },
        { id: 3, title: "Datenbank Migration", board1Column: "todo", board2Column: "todo", board1Locked: false, board2Locked: false, board1LockTimeout: null, board2LockTimeout: null, accountedTime: 0 },
        { id: 4, title: "UI Komponente refactoring", board1Column: "todo", board2Column: "todo", board1Locked: false, board2Locked: false, board1LockTimeout: null, board2LockTimeout: null, accountedTime: 0 },
        { id: 5, title: "Performance optimieren", board1Column: "todo", board2Column: "todo", board1Locked: false, board2Locked: false, board1LockTimeout: null, board2LockTimeout: null, accountedTime: 0 }
    ]
};

let draggedTask = null;
const LOCK_DURATION = 10000; // 10 seconds
const GAME_DURATION = 120000; // 120 seconds = 2 minutes
const WORK_DAY_HOURS = 8; // 8 hour workday (9:00 - 17:00)

let gameStartTime = null;
let gameRunning = false;
let gameAnimationFrame = null;
let messageInterval = null;
let unreadMessages = 0;

// Update bubble state
let bubbleStartTime = null;
let bubbleAnimationFrame = null;
let bubbleGrowing = false;
const BUBBLE_GROWTH_DURATION = 90000; // 90 seconds (slower growth)
const UPDATE_DURATION = 10000; // 10 seconds

// Private life bubble state
let privateBubbleStartTime = null;
let privateBubbleAnimationFrame = null;
let privateBubbleGrowing = false;
const PRIVATE_BUBBLE_DELAY = 15000; // 15 seconds delay
const PRIVATE_BUBBLE_GROWTH_DURATION = 60000; // 60 seconds

// Accounting bubble state
let accountingBubbleStartTime = null;
let accountingBubbleAnimationFrame = null;
let accountingBubbleGrowing = false;
const ACCOUNTING_BUBBLE_DELAY = 20000; // 20 seconds delay
const ACCOUNTING_BUBBLE_GROWTH_DURATION = 75000; // 75 seconds (slower than private)

// Initialize the game
function initGame() {
    renderAllBoards();
    setupDragAndDrop();
    setupMessenger();
    setupUpdateBubble();
    setupPrivateBubble();
    setupAccountingBubble();
    startGame();
}

// Start the game timer
function startGame() {
    gameStartTime = Date.now();
    gameRunning = true;
    updateGameTime();
}

// Update game time and timeline
function updateGameTime() {
    if (!gameRunning) return;

    const elapsed = Date.now() - gameStartTime;
    const progress = Math.min((elapsed / GAME_DURATION) * 100, 100);

    // Update timeline progress bar
    const progressBar = document.getElementById('timeline-progress');
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }

    // Calculate current time (9:00 AM + elapsed time)
    const totalMinutes = (elapsed / GAME_DURATION) * (WORK_DAY_HOURS * 60); // 8 hours in minutes
    const hours = Math.floor(totalMinutes / 60) + 9; // Start at 9:00
    const minutes = Math.floor(totalMinutes % 60);
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const timeDisplay = document.getElementById('current-time');
    if (timeDisplay) {
        timeDisplay.textContent = timeString;
    }

    // Check for game end
    if (elapsed >= GAME_DURATION) {
        endGame(false); // Lost - time ran out
        return;
    }

    // Check for win condition
    if (checkWinCondition()) {
        endGame(true); // Won - all tasks done
        return;
    }

    // Continue animation
    gameAnimationFrame = requestAnimationFrame(updateGameTime);
}

// Check if all tasks are in done column on both boards
function checkWinCondition() {
    return gameState.tasks.every(task =>
        task.board1Column === 'done' && task.board2Column === 'done'
    );
}

// End the game
function endGame(won) {
    gameRunning = false;
    if (gameAnimationFrame) {
        cancelAnimationFrame(gameAnimationFrame);
    }

    // Show game over message
    setTimeout(() => {
        if (won) {
            alert('🎉 Gewonnen! Du hast alle Tasks rechtzeitig erledigt!');
        } else {
            alert('⏰ Verloren! Die Zeit ist abgelaufen. Nicht alle Tasks wurden fertiggestellt.');
        }
    }, 100);
}

// Render all boards
function renderAllBoards() {
    const boards = document.querySelectorAll('.kanban-board');

    boards.forEach(board => {
        const boardId = board.dataset.board;
        const columns = board.querySelectorAll('.kanban-column');

        columns.forEach(column => {
            const columnName = column.dataset.column;
            const taskList = column.querySelector('.task-list');
            taskList.innerHTML = '';

            // Find tasks for this column on this specific board
            const columnKey = `board${boardId}Column`;
            const tasksInColumn = gameState.tasks.filter(task => task[columnKey] === columnName);

            tasksInColumn.forEach(task => {
                const taskElement = createTaskElement(task, boardId);
                taskList.appendChild(taskElement);
            });
        });
    });
}

// Create task element
function createTaskElement(task, boardId) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task';

    // Check if locked on this specific board
    const lockedKey = `board${boardId}Locked`;
    const isLocked = task[lockedKey];

    taskDiv.draggable = !isLocked;
    taskDiv.dataset.taskId = task.id;
    taskDiv.dataset.board = boardId;

    if (isLocked) {
        taskDiv.classList.add('locked');
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    taskDiv.appendChild(titleSpan);

    // Add progress bar if locked
    if (isLocked) {
        const progressBar = document.createElement('div');
        progressBar.className = 'task-progress';
        const progressFill = document.createElement('div');
        progressFill.className = 'task-progress-fill';
        progressBar.appendChild(progressFill);
        taskDiv.appendChild(progressBar);
    }

    return taskDiv;
}

// Setup drag and drop
function setupDragAndDrop() {
    // Drag events for tasks
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task')) {
            draggedTask = {
                id: parseInt(e.target.dataset.taskId),
                board: e.target.dataset.board
            };
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task')) {
            e.target.classList.remove('dragging');
            draggedTask = null;
        }
    });

    // Drop zones (task lists)
    const taskLists = document.querySelectorAll('.task-list');

    taskLists.forEach(taskList => {
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            taskList.classList.add('drag-over');
        });

        taskList.addEventListener('dragleave', (e) => {
            if (e.target === taskList) {
                taskList.classList.remove('drag-over');
            }
        });

        taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            taskList.classList.remove('drag-over');

            if (draggedTask) {
                const newColumn = taskList.parentElement.dataset.column;
                const board = taskList.closest('.kanban-board').dataset.board;

                // Only update if dropped on the same board
                if (board === draggedTask.board) {
                    moveTask(draggedTask.id, newColumn, board);
                }
            }
        });
    });
}

// Define column order
const COLUMN_ORDER = ['todo', 'doing', 'qa', 'customer-qa', 'done'];

// Check if columns are neighbors
function areNeighborColumns(fromColumn, toColumn) {
    const fromIndex = COLUMN_ORDER.indexOf(fromColumn);
    const toIndex = COLUMN_ORDER.indexOf(toColumn);

    // Columns are neighbors if they differ by exactly 1
    return Math.abs(fromIndex - toIndex) === 1;
}

// Move task to new column on specific board
function moveTask(taskId, newColumn, boardId) {
    const task = gameState.tasks.find(t => t.id === taskId);
    const lockedKey = `board${boardId}Locked`;
    const columnKey = `board${boardId}Column`;

    if (task && !task[lockedKey]) {
        const currentColumn = task[columnKey];

        // Check if the move is to a neighboring column
        if (!areNeighborColumns(currentColumn, newColumn)) {
            // Invalid move - not a neighbor column
            return;
        }

        task[columnKey] = newColumn;

        // Lock the task on this specific board
        lockTask(task, boardId);

        renderAllBoards();
    }
}

// Lock a task for 10 seconds on specific board
function lockTask(task, boardId) {
    const lockedKey = `board${boardId}Locked`;
    const timeoutKey = `board${boardId}LockTimeout`;
    const startTimeKey = `board${boardId}LockStartTime`;

    // Clear any existing timeout
    if (task[timeoutKey]) {
        clearTimeout(task[timeoutKey]);
    }

    task[lockedKey] = true;
    task[startTimeKey] = Date.now();

    // Set timeout to unlock
    task[timeoutKey] = setTimeout(() => {
        task[lockedKey] = false;
        task[timeoutKey] = null;
        renderAllBoards();
    }, LOCK_DURATION);

    // Update progress bar animation
    updateTaskProgress(task, boardId);
}

// Update task progress bar
function updateTaskProgress(task, boardId) {
    const lockedKey = `board${boardId}Locked`;
    const startTimeKey = `board${boardId}LockStartTime`;

    if (!task[lockedKey]) return;

    const elapsed = Date.now() - task[startTimeKey];
    const progress = (elapsed / LOCK_DURATION) * 100;

    if (progress < 100) {
        // Find the task on this specific board
        const taskElements = document.querySelectorAll(`[data-task-id="${task.id}"][data-board="${boardId}"]`);
        taskElements.forEach(el => {
            const progressFill = el.querySelector('.task-progress-fill');
            if (progressFill) {
                progressFill.style.width = progress + '%';
            }
        });

        // Continue updating
        requestAnimationFrame(() => updateTaskProgress(task, boardId));
    }
}

// Setup messenger
function setupMessenger() {
    const messengerIcon = document.getElementById('messenger-icon');
    const messengerDialog = document.getElementById('messenger-dialog');
    const messengerClose = document.getElementById('messenger-close');

    // Toggle messenger dialog
    messengerIcon.addEventListener('click', () => {
        messengerDialog.classList.toggle('hidden');
        // Reset unread messages when opened
        if (!messengerDialog.classList.contains('hidden')) {
            unreadMessages = 0;
            updateMessengerBadge();
        }
    });

    // Close messenger dialog
    messengerClose.addEventListener('click', () => {
        messengerDialog.classList.add('hidden');
    });

    // Send first message immediately
    setTimeout(() => {
        if (gameRunning) {
            sendRandomTaskMessage();
        }
    }, 1000);

    // Start sending messages every 20 seconds
    messageInterval = setInterval(() => {
        if (gameRunning) {
            sendRandomTaskMessage();
        }
    }, 20000);
}

// Get column name in German
function getColumnNameDE(column) {
    const names = {
        'todo': 'To Do',
        'doing': 'Doing',
        'qa': 'QA',
        'customer-qa': 'Customer QA',
        'done': 'Done'
    };
    return names[column] || column;
}

// Get next column
function getNextColumn(currentColumn) {
    const index = COLUMN_ORDER.indexOf(currentColumn);
    if (index >= 0 && index < COLUMN_ORDER.length - 1) {
        return COLUMN_ORDER[index + 1];
    }
    return null;
}

// Send random task message
function sendRandomTaskMessage() {
    // Find tasks that are not in done column on either board
    const movableTasks = gameState.tasks.filter(task => {
        const board1NotDone = task.board1Column !== 'done';
        const board2NotDone = task.board2Column !== 'done';
        return board1NotDone || board2NotDone;
    });

    if (movableTasks.length === 0) return;

    // Pick a random task
    const randomTask = movableTasks[Math.floor(Math.random() * movableTasks.length)];

    // Decide which board to reference (prefer the one that's further behind)
    let boardId, currentColumn, nextColumn;
    const board1Index = COLUMN_ORDER.indexOf(randomTask.board1Column);
    const board2Index = COLUMN_ORDER.indexOf(randomTask.board2Column);

    if (board1Index <= board2Index) {
        boardId = 1;
        currentColumn = randomTask.board1Column;
    } else {
        boardId = 2;
        currentColumn = randomTask.board2Column;
    }

    nextColumn = getNextColumn(currentColumn);

    if (!nextColumn) return; // Task is already in done

    // Create message
    const messages = [
        `Hey, kannst du bitte "${randomTask.title}" auf Board ${boardId} von ${getColumnNameDE(currentColumn)} nach ${getColumnNameDE(nextColumn)} schieben?`,
        `Board ${boardId}: "${randomTask.title}" bitte weiter nach ${getColumnNameDE(nextColumn)} bewegen!`,
        `Könntest du mal "${randomTask.title}" auf Board ${boardId} in ${getColumnNameDE(nextColumn)} packen?`,
        `"${randomTask.title}" wartet auf Board ${boardId} - bitte nach ${getColumnNameDE(nextColumn)}!`,
        `Reminder: "${randomTask.title}" muss noch nach ${getColumnNameDE(nextColumn)} auf Board ${boardId}!`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Pass task data for the checkmark button
    const taskData = {
        taskId: randomTask.id,
        boardId: boardId,
        targetColumn: nextColumn
    };

    addMessage(randomMessage, taskData);
}

// Add message to messenger
function addMessage(text, taskData = null) {
    const messagesContainer = document.getElementById('messenger-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message colleague';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;

    messageDiv.appendChild(contentDiv);

    // Add checkmark button if task data is provided
    if (taskData) {
        const checkButton = document.createElement('button');
        checkButton.className = 'message-check-btn';
        checkButton.innerHTML = '✓ Erledigt';
        checkButton.onclick = () => markMessageAsDone(messageDiv, taskData);
        messageDiv.appendChild(checkButton);

        // Store task data in the message
        messageDiv.dataset.taskId = taskData.taskId;
        messageDiv.dataset.boardId = taskData.boardId;
        messageDiv.dataset.targetColumn = taskData.targetColumn;
    }

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Update unread count if dialog is hidden
    const messengerDialog = document.getElementById('messenger-dialog');
    if (messengerDialog.classList.contains('hidden')) {
        unreadMessages++;
        updateMessengerBadge();
    }
}

// Mark message as done
function markMessageAsDone(messageDiv, taskData) {
    // Find the task
    const task = gameState.tasks.find(t => t.id === taskData.taskId);
    if (!task) return;

    // Check if the task is in the correct column on the correct board
    const columnKey = `board${taskData.boardId}Column`;
    const currentColumn = task[columnKey];

    if (currentColumn !== taskData.targetColumn) {
        // Task not in the correct column - show error
        alert(`❌ Task noch nicht erledigt!\n\nDu solltest "${task.title}" auf Board ${taskData.boardId} nach ${getColumnNameDE(taskData.targetColumn)} verschieben.\n\nAktuell ist der Task in: ${getColumnNameDE(currentColumn)}`);
        return;
    }

    // Check if at least 15 minutes have been accounted for this task
    if (task.accountedTime < 15) {
        alert(`⏰ Zeit nicht gebucht!\n\nDu musst mindestens 15 Minuten für "${task.title}" im Accounting buchen.\n\nAktuell gebucht: ${formatTime(task.accountedTime)}`);
        return;
    }

    // Task is in correct position and time is accounted - mark as complete
    messageDiv.classList.add('completed');

    // Disable the button
    const button = messageDiv.querySelector('.message-check-btn');
    if (button) {
        button.disabled = true;
        button.innerHTML = '✓ Erledigt';
    }
}

// Update messenger badge
function updateMessengerBadge() {
    const badge = document.getElementById('messenger-badge');
    if (unreadMessages > 0) {
        badge.textContent = unreadMessages;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Setup update bubble
function setupUpdateBubble() {
    const bubble = document.getElementById('update-bubble');
    const updateModal = document.getElementById('update-modal');
    const updateAccept = document.getElementById('update-accept');

    // Click on bubble
    bubble.addEventListener('click', () => {
        if (bubbleGrowing) {
            pauseBubbleGrowth();
            updateModal.classList.remove('hidden');
        }
    });

    // Accept update
    updateAccept.addEventListener('click', () => {
        updateModal.classList.add('hidden');
        startUpdateInstallation();
    });

    // Start bubble growth
    startBubbleGrowth();
}

// Start bubble growth
function startBubbleGrowth() {
    bubbleStartTime = Date.now();
    bubbleGrowing = true;
    const bubble = document.getElementById('update-bubble');
    bubble.style.display = 'flex';
    animateBubbleGrowth();
}

// Pause bubble growth
function pauseBubbleGrowth() {
    bubbleGrowing = false;
    if (bubbleAnimationFrame) {
        cancelAnimationFrame(bubbleAnimationFrame);
    }
}

// Animate bubble growth
function animateBubbleGrowth() {
    if (!bubbleGrowing) return;

    const elapsed = Date.now() - bubbleStartTime;
    const progress = Math.min(elapsed / BUBBLE_GROWTH_DURATION, 1);

    // Calculate size based on progress (50px to full screen)
    const minSize = 50;
    const maxSize = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const currentSize = minSize + (maxSize - minSize) * progress;

    const bubble = document.getElementById('update-bubble');
    if (bubble) {
        bubble.style.width = currentSize + 'px';
        bubble.style.height = currentSize + 'px';
        bubble.style.opacity = 0.3 + (progress * 0.5); // Increase opacity as it grows
    }

    if (progress < 1) {
        bubbleAnimationFrame = requestAnimationFrame(animateBubbleGrowth);
    }
}

// Start update installation
function startUpdateInstallation() {
    const overlay = document.getElementById('update-overlay');
    const progressFill = document.getElementById('update-progress-fill');

    // Hide bubble
    const bubble = document.getElementById('update-bubble');
    bubble.style.display = 'none';

    // Show overlay
    overlay.classList.remove('hidden');

    // Note: gameRunning stays true - time keeps ticking during deployment!

    // Animate progress bar
    const startTime = Date.now();

    function updateProgress() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / UPDATE_DURATION) * 100, 100);

        progressFill.style.width = progress + '%';

        if (progress < 100) {
            requestAnimationFrame(updateProgress);
        } else {
            // Finish update
            finishUpdate();
        }
    }

    updateProgress();
}

// Finish update
function finishUpdate() {
    const overlay = document.getElementById('update-overlay');

    setTimeout(() => {
        overlay.classList.add('hidden');
        // Note: gameRunning stays true, no need to set it

        // Reset and restart bubble
        const bubble = document.getElementById('update-bubble');
        bubble.style.width = '50px';
        bubble.style.height = '50px';
        bubble.style.opacity = '0.3';

        startBubbleGrowth();
    }, 500);
}

// Setup private life bubble
function setupPrivateBubble() {
    const bubble = document.getElementById('private-bubble');
    const privateModal = document.getElementById('private-modal');
    const privateDismiss = document.getElementById('private-dismiss');

    // Click on bubble
    bubble.addEventListener('click', () => {
        if (privateBubbleGrowing) {
            pausePrivateBubbleGrowth();
            privateModal.classList.remove('hidden');
        }
    });

    // Dismiss private life notification
    privateDismiss.addEventListener('click', () => {
        privateModal.classList.add('hidden');
        resetPrivateBubble();
    });

    // Start bubble growth after delay
    setTimeout(() => {
        startPrivateBubbleGrowth();
    }, PRIVATE_BUBBLE_DELAY);
}

// Start private bubble growth
function startPrivateBubbleGrowth() {
    privateBubbleStartTime = Date.now();
    privateBubbleGrowing = true;
    const bubble = document.getElementById('private-bubble');
    bubble.style.display = 'flex';
    animatePrivateBubbleGrowth();
}

// Pause private bubble growth
function pausePrivateBubbleGrowth() {
    privateBubbleGrowing = false;
    if (privateBubbleAnimationFrame) {
        cancelAnimationFrame(privateBubbleAnimationFrame);
    }
}

// Animate private bubble growth
function animatePrivateBubbleGrowth() {
    if (!privateBubbleGrowing) return;

    const elapsed = Date.now() - privateBubbleStartTime;
    const progress = Math.min(elapsed / PRIVATE_BUBBLE_GROWTH_DURATION, 1);

    // Calculate size based on progress (50px to full screen)
    const minSize = 50;
    const maxSize = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const currentSize = minSize + (maxSize - minSize) * progress;

    const bubble = document.getElementById('private-bubble');
    if (bubble) {
        bubble.style.width = currentSize + 'px';
        bubble.style.height = currentSize + 'px';
        bubble.style.opacity = 0.3 + (progress * 0.5); // Increase opacity as it grows
    }

    if (progress < 1) {
        privateBubbleAnimationFrame = requestAnimationFrame(animatePrivateBubbleGrowth);
    }
}

// Reset private bubble and restart after delay
function resetPrivateBubble() {
    const bubble = document.getElementById('private-bubble');
    bubble.style.display = 'none';
    bubble.style.width = '50px';
    bubble.style.height = '50px';
    bubble.style.opacity = '0.3';

    // Restart after delay
    setTimeout(() => {
        startPrivateBubbleGrowth();
    }, PRIVATE_BUBBLE_DELAY);
}

// Setup accounting bubble
function setupAccountingBubble() {
    const bubble = document.getElementById('accounting-bubble');
    const accountingModal = document.getElementById('accounting-modal');
    const accountingClose = document.getElementById('accounting-close');

    // Click on bubble to open modal
    bubble.addEventListener('click', () => {
        if (accountingBubbleGrowing) {
            pauseAccountingBubbleGrowth();
        }
        renderAccountingModal();
        accountingModal.classList.remove('hidden');
    });

    // Close accounting modal
    accountingClose.addEventListener('click', () => {
        accountingModal.classList.add('hidden');
        resetAccountingBubble();
    });

    // Start bubble growth after delay
    setTimeout(() => {
        startAccountingBubbleGrowth();
    }, ACCOUNTING_BUBBLE_DELAY);
}

// Start accounting bubble growth
function startAccountingBubbleGrowth() {
    accountingBubbleStartTime = Date.now();
    accountingBubbleGrowing = true;
    const bubble = document.getElementById('accounting-bubble');
    bubble.style.display = 'flex';
    animateAccountingBubbleGrowth();
}

// Pause accounting bubble growth
function pauseAccountingBubbleGrowth() {
    accountingBubbleGrowing = false;
    if (accountingBubbleAnimationFrame) {
        cancelAnimationFrame(accountingBubbleAnimationFrame);
    }
}

// Animate accounting bubble growth
function animateAccountingBubbleGrowth() {
    if (!accountingBubbleGrowing) return;

    const elapsed = Date.now() - accountingBubbleStartTime;
    const progress = Math.min(elapsed / ACCOUNTING_BUBBLE_GROWTH_DURATION, 1);

    // Calculate size based on progress (80px to full screen)
    const minSize = 80;
    const maxSize = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const currentSize = minSize + (maxSize - minSize) * progress;

    const bubble = document.getElementById('accounting-bubble');
    if (bubble) {
        bubble.style.width = currentSize + 'px';
        bubble.style.height = currentSize + 'px';
        bubble.style.opacity = 0.8 + (progress * 0.2); // Increase opacity as it grows
    }

    if (progress < 1) {
        accountingBubbleAnimationFrame = requestAnimationFrame(animateAccountingBubbleGrowth);
    }
}

// Reset accounting bubble and restart after delay
function resetAccountingBubble() {
    const bubble = document.getElementById('accounting-bubble');
    bubble.style.display = 'none';
    bubble.style.width = '80px';
    bubble.style.height = '80px';
    bubble.style.opacity = '0.8';

    // Restart after delay
    setTimeout(() => {
        startAccountingBubbleGrowth();
    }, ACCOUNTING_BUBBLE_DELAY);
}

// Render accounting modal with all tasks
function renderAccountingModal() {
    const container = document.getElementById('accounting-tasks');
    container.innerHTML = '';

    gameState.tasks.forEach(task => {
        const taskRow = document.createElement('div');
        taskRow.className = 'accounting-task-row';

        const taskTitle = document.createElement('div');
        taskTitle.className = 'accounting-task-title';
        taskTitle.textContent = task.title;

        const taskControls = document.createElement('div');
        taskControls.className = 'accounting-task-controls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'accounting-btn minus';
        minusBtn.textContent = '−';
        minusBtn.onclick = () => adjustTaskTime(task.id, -15);

        const timeDisplay = document.createElement('span');
        timeDisplay.className = 'accounting-time';
        timeDisplay.textContent = formatTime(task.accountedTime);
        timeDisplay.id = `accounting-time-${task.id}`;

        const plusBtn = document.createElement('button');
        plusBtn.className = 'accounting-btn plus';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => adjustTaskTime(task.id, 15);

        taskControls.appendChild(minusBtn);
        taskControls.appendChild(timeDisplay);
        taskControls.appendChild(plusBtn);

        taskRow.appendChild(taskTitle);
        taskRow.appendChild(taskControls);

        container.appendChild(taskRow);
    });
}

// Adjust task time by minutes
function adjustTaskTime(taskId, minutes) {
    const task = gameState.tasks.find(t => t.id === taskId);
    if (task) {
        task.accountedTime += minutes;
        // Prevent negative time
        if (task.accountedTime < 0) {
            task.accountedTime = 0;
        }

        // Update display
        const timeDisplay = document.getElementById(`accounting-time-${taskId}`);
        if (timeDisplay) {
            timeDisplay.textContent = formatTime(task.accountedTime);
        }
    }
}

// Format time in hours and minutes
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
}

// Start the game
initGame();