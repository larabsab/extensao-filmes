import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:3000";
const ROOM_STATE_KEY = "ttddflixRoomState";
const APP_SESSION_KEY = "ttddflixAppSession";

let socket = null;
let roomState = null;

async function loadRoomState() {
  if (roomState) {
    return roomState;
  }

  const stored = await chrome.storage.local.get([ROOM_STATE_KEY]);
  roomState = stored[ROOM_STATE_KEY] || null;
  return roomState;
}

async function persistRoomState(nextRoomState) {
  roomState = nextRoomState;
  await chrome.storage.local.set({ [ROOM_STATE_KEY]: nextRoomState });
  return nextRoomState;
}

async function clearRoomState() {
  roomState = null;
  await chrome.storage.local.remove([ROOM_STATE_KEY]);
}

function sendMessageToTab(tabId, message) {
  if (!tabId) {
    return;
  }

  chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

async function getActiveRoomState() {
  return loadRoomState();
}

async function notifyRoomTab(tabId, message) {
  if (!tabId) {
    return;
  }

  sendMessageToTab(tabId, message);
}

function bindSocketListeners() {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();

  socket.on("connect", async () => {
    const activeRoom = await loadRoomState();

    if (!activeRoom?.roomId) {
      return;
    }

    socket.emit("join-room", activeRoom.roomId);
  });

  socket.on("force-play", async ({ timestamp }) => {
    const activeRoom = await loadRoomState();
    await notifyRoomTab(activeRoom?.activeTabId, { action: "play", time: timestamp });
  });

  socket.on("force-pause", async ({ timestamp }) => {
    const activeRoom = await loadRoomState();
    await notifyRoomTab(activeRoom?.activeTabId, { action: "pause", time: timestamp });
  });

  socket.on("force-seek", async ({ timestamp }) => {
    const activeRoom = await loadRoomState();
    await notifyRoomTab(activeRoom?.activeTabId, { action: "seek", time: timestamp });
  });
}

async function ensureSocketConnection() {
  const activeRoom = await loadRoomState();

  if (!activeRoom?.roomId) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_SERVER_URL, {
    autoConnect: true,
    transports: ["websocket"]
  });

  bindSocketListeners();
  return socket;
}

async function attachRoomToTab(tabId, tabUrl = "", openSidebar = false) {
  const activeRoom = await loadRoomState();

  if (!activeRoom?.roomId) {
    return null;
  }

  const previousTabId = activeRoom.activeTabId;
  const nextRoomState = await persistRoomState({
    ...activeRoom,
    activeTabId: tabId,
    activeTabUrl: tabUrl || activeRoom.activeTabUrl || "",
    sidebarOpen: openSidebar ?? activeRoom.sidebarOpen
  });

  if (previousTabId && previousTabId !== tabId) {
    sendMessageToTab(previousTabId, { type: "CLOSE_CHAT_SIDEBAR" });
  }

  if (nextRoomState.sidebarOpen && tabId) {
    sendMessageToTab(tabId, { type: "OPEN_CHAT_SIDEBAR" });
  }

  return nextRoomState;
}

async function startRoom({ roomId, roomCode, tabId, tabUrl, settings = {} }) {
  const existingRoom = await loadRoomState();

  if (existingRoom?.roomId) {
    if (roomId && existingRoom.roomId !== roomId) {
      await stopRoom();
    } else {
      await ensureSocketConnection();
      return attachRoomToTab(tabId, tabUrl, existingRoom.sidebarOpen);
    }
  }

  if (!roomId || !roomCode) {
    throw new Error("A sala ainda nao foi criada corretamente.");
  }

  const nextRoomState = await persistRoomState({
    roomId,
    roomCode,
    activeTabId: tabId || null,
    activeTabUrl: tabUrl || "",
    sidebarOpen: true,
    onlyHostControls: Boolean(settings.onlyHostControls),
    reactionsDisabled: Boolean(settings.reactionsDisabled),
    createdAt: Date.now()
  });

  await ensureSocketConnection();

  if (nextRoomState.activeTabId) {
    sendMessageToTab(nextRoomState.activeTabId, { type: "OPEN_CHAT_SIDEBAR" });
  }

  return nextRoomState;
}

async function saveAppSession(appSession) {
  await chrome.storage.local.set({ [APP_SESSION_KEY]: appSession });
  return appSession;
}

async function clearAppSession() {
  await chrome.storage.local.remove([APP_SESSION_KEY]);
}

async function propagateLogoutToWeb() {
  const tabs = await chrome.tabs.query({ url: ["http://localhost:5173/*"] });

  await Promise.all(
    tabs.map((tab) => {
      if (!tab.id) {
        return Promise.resolve();
      }

      return chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: () => {
          window.postMessage({ type: "TTDDFLIX_EXTENSION_LOGOUT" }, window.location.origin);
        }
      }).catch(() => {});
    })
  );
}

async function stopRoom() {
  const activeRoom = await loadRoomState();

  if (activeRoom?.activeTabId) {
    sendMessageToTab(activeRoom.activeTabId, { type: "CLOSE_CHAT_SIDEBAR" });
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  await clearRoomState();
  return null;
}

async function updateSidebarState(isOpen) {
  const activeRoom = await loadRoomState();

  if (!activeRoom?.roomId) {
    return null;
  }

  const nextRoomState = await persistRoomState({
    ...activeRoom,
    sidebarOpen: isOpen
  });

  if (activeRoom.activeTabId) {
    sendMessageToTab(activeRoom.activeTabId, {
      type: isOpen ? "OPEN_CHAT_SIDEBAR" : "CLOSE_CHAT_SIDEBAR"
    });
  }

  return nextRoomState;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "GET_ROOM_STATE": {
        const activeRoom = await getActiveRoomState();
        if (activeRoom?.roomId) {
          await ensureSocketConnection();
        }
        sendResponse({ roomState: activeRoom });
        return;
      }

      case "START_ROOM": {
        const nextRoomState = await startRoom({
          roomId: message.roomId,
          roomCode: message.roomCode,
          tabId: message.tabId,
          tabUrl: message.tabUrl,
          settings: {
            onlyHostControls: message.onlyHostControls,
            reactionsDisabled: message.reactionsDisabled
          }
        });
        sendResponse({ roomState: nextRoomState });
        return;
      }

      case "GET_APP_SESSION": {
        const stored = await chrome.storage.local.get([APP_SESSION_KEY]);
        sendResponse({ appSession: stored[APP_SESSION_KEY] || null });
        return;
      }

      case "LOGOUT_EXTENSION_SESSION": {
        await propagateLogoutToWeb();
        await clearAppSession();
        await stopRoom();
        sendResponse({ ok: true });
        return;
      }

      case "STOP_ROOM": {
        await stopRoom();
        sendResponse({ roomState: null });
        return;
      }

      case "ATTACH_ROOM_TAB": {
        const nextRoomState = await attachRoomToTab(
          message.tabId,
          message.tabUrl,
          message.openSidebar
        );
        sendResponse({ roomState: nextRoomState });
        return;
      }

      case "SET_SIDEBAR_OPEN": {
        const nextRoomState = await updateSidebarState(Boolean(message.isOpen));
        sendResponse({ roomState: nextRoomState });
        return;
      }

      case "VIDEO_EVENT": {
        const activeRoom = await loadRoomState();

        if (!activeRoom?.roomId) {
          sendResponse({ ok: false });
          return;
        }

        await attachRoomToTab(sender.tab?.id, sender.tab?.url, activeRoom.sidebarOpen);
        await ensureSocketConnection();

        const timestamp = Number(message.time || 0);

        if (message.action === "play") {
          socket?.emit("sync-play", { roomId: activeRoom.roomId, timestamp });
        }

        if (message.action === "pause") {
          socket?.emit("sync-pause", { roomId: activeRoom.roomId, timestamp });
        }

        if (message.action === "seek") {
          socket?.emit("sync-seek", { roomId: activeRoom.roomId, timestamp });
        }

        sendResponse({ ok: true });
        return;
      }

      default:
        sendResponse({ ok: false });
    }
  })().catch((error) => {
    console.error("Background message error:", error);
    sendResponse({
      ok: false,
      error: error?.message || "Nao foi possivel concluir a operacao da sala."
    });
  });

  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const activeRoom = await loadRoomState();

  if (!activeRoom?.roomId || activeRoom.activeTabId !== tabId) {
    return;
  }

  await persistRoomState({
    ...activeRoom,
    activeTabId: null,
    activeTabUrl: ""
  });
});

chrome.runtime.onStartup.addListener(() => {
  stopRoom().catch((error) => {
    console.error("Startup room cleanup error:", error);
  });
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === "LOGIN_SUCCESS") {
    saveAppSession({
      token: request.token,
      user: request.user || null
    })
      .then(() => {
        console.log("Sessao recebida da Web e salva na extensao!");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Erro ao salvar sessao da extensao:", error);
        sendResponse({ success: false });
      });
    return true;
  }

  if (request.type === "LOGOUT_SUCCESS") {
    clearAppSession()
      .then(() => stopRoom())
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  return false;
});
