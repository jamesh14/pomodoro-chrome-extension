let timer = null;
let timeRemaining = 25 * 60;
let isRunning = false;
let port = null;

function sendTimeUpdate() {
  if (port) {
    port.postMessage({ type: "update", timeRemaining });
  }
}

function tick() {
  if (timeRemaining > 0) {
    timeRemaining--;
    sendTimeUpdate();
  } else {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    if (port) port.postMessage({ type: "stopped" });
  }
}

chrome.runtime.onConnect.addListener((p) => {
  port = p;
  port.onMessage.addListener((msg) => {
    if (msg.action === "start") {
      timeRemaining = msg.duration;
      if (timer) clearInterval(timer);
      timer = setInterval(tick, 1000);
      isRunning = true;
      sendTimeUpdate();
    } else if (msg.action === "pause") {
      // Pause timer by clearing interval
      if (timer) {
        clearInterval(timer);
        timer = null;
        isRunning = false;
        sendTimeUpdate();
        if (port) port.postMessage({ type: "stopped" });
      }
    } else if (msg.action === "reset") {
      if (timer) clearInterval(timer);
      timer = null;
      timeRemaining = 25 * 60;
      isRunning = false;
      sendTimeUpdate();
      if (port) port.postMessage({ type: "stopped" });
    } else if (msg.action === "status") {
      sendTimeUpdate();
      if (!isRunning && port) port.postMessage({ type: "stopped" });
    }
  });
  port.onDisconnect.addListener(() => {
    port = null;
  });
});
