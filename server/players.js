// ===============================
// PLAYER MANAGER (PRO VERSION)
// ===============================

// Store all players globally
const players = {};

// ===============================
// ADD PLAYER
// ===============================
function addPlayer(id, name, roomId) {
  const player = {
    id,
    name,
    roomId,
    position: 0,        // starting position
    tokens: [0, 0, 0, 0], // 4 tokens for Ludo
    color: assignColor(roomId),
    isActive: true,
  };

  players[id] = player;

  return player;
}

// ===============================
// REMOVE PLAYER
// ===============================
function removePlayer(id) {
  if (players[id]) {
    delete players[id];
  }
}

// ===============================
// GET ALL PLAYERS (OPTIONAL)
// ===============================
function getAllPlayers() {
  return Object.values(players);
}

// ===============================
// GET PLAYERS BY ROOM
// ===============================
function getPlayersByRoom(roomId) {
  return Object.values(players).filter(
    (p) => p.roomId === roomId
  );
}

// ===============================
// GET PLAYER BY ID
// ===============================
function getPlayer(id) {
  return players[id] || null;
}

// ===============================
// GET NEXT PLAYER (TURN SYSTEM)
// ===============================
function getNextPlayer(currentId, roomPlayers) {
  if (!roomPlayers || roomPlayers.length === 0) return null;

  const currentIndex = roomPlayers.findIndex(
    (p) => p.id === currentId
  );

  if (currentIndex === -1) return roomPlayers[0];

  const nextIndex = (currentIndex + 1) % roomPlayers.length;

  return roomPlayers[nextIndex];
}

// ===============================
// ASSIGN UNIQUE COLOR PER ROOM
// ===============================
function assignColor(roomId) {
  const roomPlayers = getPlayersByRoom(roomId);

  const colors = ["red", "blue", "green", "yellow"];

  for (let color of colors) {
    const taken = roomPlayers.find(
      (p) => p.color === color
    );
    if (!taken) return color;
  }

  // fallback
  return "gray";
}

// ===============================
// UPDATE PLAYER POSITION
// ===============================
function updatePlayerPosition(id, newPosition) {
  if (players[id]) {
    players[id].position = newPosition;
    return players[id];
  }
  return null;
}

// ===============================
// EXPORT MODULE
// ===============================
module.exports = {
  addPlayer,
  removePlayer,
  getAllPlayers,
  getPlayersByRoom,
  getPlayer,
  getNextPlayer,
  updatePlayerPosition,
};
