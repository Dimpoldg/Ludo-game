// ===============================
// IMPORTS
// ===============================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const gameLogic = require("./server/gameLogic");
const playersManager = require("./server/players");

// ===============================
// APP SETUP
// ===============================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Serve frontend
app.use(express.static("public"));

// ===============================
// GAME STATE (ROOM BASED)
// ===============================
const rooms = {}; 
// Example:
// rooms = {
//   roomId: {
//     players: [],
//     currentTurn: socketId
//   }
// }

// ===============================
// SOCKET CONNECTION
// ===============================
io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  // ===============================
  // JOIN ROOM
  // ===============================
  socket.on("joinGame", ({ playerName, roomId }) => {
    try {
      if (!playerName || !roomId) return;

      socket.join(roomId);

      // Create room if not exist
      if (!rooms[roomId]) {
        rooms[roomId] = {
          players: [],
          currentTurn: null,
        };
      }

      const room = rooms[roomId];

      // Add player
      const player = playersManager.addPlayer(
        socket.id,
        playerName,
        roomId
      );

      room.players.push(player);

      // Set first turn
      if (!room.currentTurn) {
        room.currentTurn = socket.id;
      }

      // Send updates
      io.to(roomId).emit("playersUpdate", room.players);
      io.to(roomId).emit("turnUpdate", room.currentTurn);

    } catch (err) {
      console.error("Join Error:", err);
    }
  });

  // ===============================
  // ROLL DICE
  // ===============================
  socket.on("rollDice", ({ roomId }) => {
    try {
      const room = rooms[roomId];
      if (!room) return;

      if (socket.id !== room.currentTurn) return;

      const dice = gameLogic.rollDice();

      io.to(roomId).emit("diceRolled", {
        playerId: socket.id,
        dice,
      });

    } catch (err) {
      console.error("Dice Error:", err);
    }
  });

  // ===============================
  // MOVE TOKEN
  // ===============================
  socket.on("moveToken", ({ roomId, steps }) => {
    try {
      const room = rooms[roomId];
      if (!room) return;

      if (socket.id !== room.currentTurn) return;

      const updatedPlayer = gameLogic.moveToken(
        socket.id,
        steps,
        roomId
      );

      io.to(roomId).emit("playerMoved", updatedPlayer);

      // Next Turn
      const nextPlayer = playersManager.getNextPlayer(
        socket.id,
        room.players
      );

      room.currentTurn = nextPlayer ? nextPlayer.id : null;

      io.to(roomId).emit("turnUpdate", room.currentTurn);

    } catch (err) {
      console.error("Move Error:", err);
    }
  });

  // ===============================
  // DISCONNECT
  // ===============================
  socket.on("disconnect", () => {
    console.log("🔴 User Disconnected:", socket.id);

    try {
      for (let roomId in rooms) {
        let room = rooms[roomId];

        // Remove player
        room.players = room.players.filter(
          (p) => p.id !== socket.id
        );

        // If room empty → delete
        if (room.players.length === 0) {
          delete rooms[roomId];
          continue;
        }

        // Fix turn if needed
        if (room.currentTurn === socket.id) {
          room.currentTurn = room.players[0].id;
        }

        io.to(roomId).emit("playersUpdate", room.players);
        io.to(roomId).emit("turnUpdate", room.currentTurn);
      }
    } catch (err) {
      console.error("Disconnect Error:", err);
    }
  });
});

// ===============================
// SERVER START
// ===============================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
