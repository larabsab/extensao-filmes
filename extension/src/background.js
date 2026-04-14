import { io } from "socket.io-client";

let socket = null;
let currentRoom = null;

// Liga ao servidor quando uma sala é acedida
const connectSocket = (roomId) => {
  if (socket) socket.disconnect();

  socket = io("http://localhost:3000");
  currentRoom = roomId;

  socket.emit("join-room", roomId);

  // Quando recebe uma ação de uma amiga
  socket.on("video-update", (data) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, data);
      }
    });
  });
};

// Ouve mensagens vindas do Popup ou do Content Script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "JOIN_ROOM") {
    connectSocket(message.roomId);
  }

  if (message.type === "VIDEO_EVENT" && socket) {
    socket.emit("video-action", {
      roomId: currentRoom,
      action: message.action,
      time: message.time
    });
  }
});