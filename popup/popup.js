// --- Timer DOM Elements ---
const timerMin = document.getElementById("timer-min");
const timerSec = document.getElementById("timer-sec");
const startBtn = document.getElementById("start-timer");
const resetBtn = document.getElementById("reset-timer");

// Add references to play and pause icons inside startBtn
const playIcon = startBtn.querySelector("svg path[d='M6.5 5.5v9l7-4.5-7-4.5z']").parentElement;
const stopIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
stopIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
stopIcon.setAttribute("class", "icon");
stopIcon.setAttribute("viewBox", "0 0 20 20");
stopIcon.setAttribute("fill", "currentColor");
stopIcon.setAttribute("width", "20");
stopIcon.setAttribute("height", "20");
stopIcon.setAttribute("aria-hidden", "true");
stopIcon.style.display = "none";
stopIcon.innerHTML = `<path d="M6 5h3v10H6zm5 0h3v10h-3z"/>`; // pause icon
startBtn.appendChild(stopIcon);

// --- Todo DOM Elements ---
const addTodoBtn = document.getElementById("add-todo");
const todoField = document.getElementById("todo-field");
const todoList = document.getElementById("todo-list");
const clearTodosBtn = document.getElementById("clear-todos");

const port = chrome.runtime.connect({ name: "popup" });

let isRunning = false;

// Helper: update start button UI based on isRunning
function updateStartButtonUI() {
  if (isRunning) {
    startBtn.style.backgroundColor = "#e53e3e"; // red
    startBtn.setAttribute("aria-label", "Pause Timer");
    playIcon.style.display = "none";
    stopIcon.style.display = "inline";
    timerMin.contentEditable = "false";
  } else {
    startBtn.style.backgroundColor = "#48bb78"; // green
    startBtn.setAttribute("aria-label", "Start Timer");
    playIcon.style.display = "inline";
    stopIcon.style.display = "none";
    timerMin.contentEditable = "true";
  }
}

// Save isRunning state persistently
function saveRunningState() {
  chrome.storage.local.set({ isRunning });
}

// --- Timer Button Handlers ---
startBtn.onclick = () => {
  if (!isRunning) {
    const minutes = parseInt(timerMin.textContent) || 25;
    const seconds = parseInt(timerSec.textContent) || 0;
    const totalSeconds = minutes * 60 + seconds;
    port.postMessage({ action: "start", duration: totalSeconds });
    isRunning = true;
    updateStartButtonUI();
    saveRunningState();
  } else {
    port.postMessage({ action: "pause" });
    isRunning = false;
    updateStartButtonUI();
    saveRunningState();
  }
};

resetBtn.onclick = () => {
  port.postMessage({ action: "reset" });
  timerMin.textContent = "25";
  timerSec.textContent = "00";
  isRunning = false;
  updateStartButtonUI();
  saveRunningState();
};

// --- Timer Status Check ---
window.onload = () => {
  loadTodos();

  chrome.storage.local.get(["isRunning"], (result) => {
    isRunning = result.isRunning || false;
    updateStartButtonUI();

    port.postMessage({ action: "status" });
  });
};

// --- Timer Message Listener ---
port.onMessage.addListener((msg) => {
  if (msg.type === "update") {
    const minutes = Math.floor(msg.timeRemaining / 60);
    const seconds = msg.timeRemaining % 60;
    timerMin.textContent = String(minutes);
    timerSec.textContent = seconds < 10 ? "0" + seconds : String(seconds);
  }
  if (msg.type === "stopped") {
    isRunning = false;
    updateStartButtonUI();
    saveRunningState();
  }
});

// --- TODO LIST FUNCTIONS ---

function loadTodos() {
  while (todoList.firstChild) todoList.removeChild(todoList.firstChild);

  chrome.storage.local.get("todos", (data) => {
    const todos = data.todos || [];

    // Sort todos: incomplete first, completed last
    todos.sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });

    todos.forEach((todo, index) => {
      const li = document.createElement("li");
      li.textContent = todo.title;
      li.style.fontSize = "16px"; // increase text size

      if (todo.completed) {
        li.classList.add("completed");
        li.textContent = "✅ " + li.textContent;
      }

      li.addEventListener("click", () => {
        todos[index].completed = !todos[index].completed;
        chrome.storage.local.set({ todos }, loadTodos);
      });

      todoList.appendChild(li);
    });

    todoField.value = "";
  });
}

addTodoBtn.onclick = () => {
  const title = todoField.value.trim();
  if (!title) return;

  chrome.storage.local.get("todos", (data) => {
    const todos = data.todos || [];
    todos.push({ title, completed: false });
    chrome.storage.local.set({ todos }, loadTodos);
  });
};

clearTodosBtn.onclick = () => {
  chrome.storage.local.set({ todos: [] }, loadTodos);
};
