const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const QUESTIONS = [
  { q: "¿En qué país surgieron los Juegos Olímpicos de la Antigüedad?", options: ["Roma", "Grecia", "Egipto", "Persia"], answer: 1, fact: "Los Juegos Olímpicos antiguos se celebraban en Olimpia, Grecia." },
  { q: "¿Qué civilización construyó las pirámides de Guiza?", options: ["Los mayas", "Los romanos", "Los egipcios", "Los fenicios"], answer: 2, fact: "Las grandes pirámides de Guiza fueron construidas en el antiguo Egipto." },
  { q: "¿Quién fue el primer emperador de Roma?", options: ["Julio César", "Augusto", "Nerón", "Constantino"], answer: 1, fact: "Augusto se convirtió en el primer emperador romano en el año 27 a. C." },
  { q: "¿En qué año llegó Cristóbal Colón a América?", options: ["1492", "1453", "1519", "1607"], answer: 0, fact: "La expedición de Colón llegó al Caribe en 1492." },
  { q: "¿Qué muro cayó en 1989 y se convirtió en símbolo del fin de la Guerra Fría?", options: ["La Gran Muralla", "El Muro de Adriano", "El Muro de Berlín", "La muralla de Troya"], answer: 2, fact: "La apertura del Muro de Berlín ocurrió en noviembre de 1989." },
  { q: "¿Qué revolución comenzó en Francia en 1789?", options: ["La Revolución Industrial", "La Revolución Francesa", "La Revolución Rusa", "La Revolución Gloriosa"], answer: 1, fact: "La Revolución Francesa transformó la política y la sociedad de Francia." },
  { q: "¿Cuál fue la principal ruta comercial que conectó durante siglos Asia y Europa?", options: ["Ruta del Ámbar", "Ruta de la Seda", "Camino Real", "Ruta del Oro"], answer: 1, fact: "La Ruta de la Seda fue una red de rutas comerciales entre Asia, Oriente Medio y Europa." },
  { q: "¿En qué país comenzó la Revolución Industrial?", options: ["Gran Bretaña", "España", "Japón", "México"], answer: 0, fact: "La Revolución Industrial comenzó en Gran Bretaña en el siglo XVIII." },
  { q: "¿Qué civilización desarrolló la escritura cuneiforme en Mesopotamia?", options: ["Los sumerios", "Los incas", "Los vikingos", "Los aztecas"], answer: 0, fact: "Los sumerios utilizaron la escritura cuneiforme hace más de 5,000 años." },
  { q: "¿En qué año terminó la Segunda Guerra Mundial?", options: ["1939", "1942", "1945", "1950"], answer: 2, fact: "La guerra terminó en 1945, tras la rendición de Alemania y Japón." }
];

const rooms = new Map();
const LETTERS = ["A", "B", "C", "D"];

function makeCode() {
  let code;
  do { code = Math.random().toString(36).slice(2, 6).toUpperCase(); }
  while (rooms.has(code));
  return code;
}
function publicPlayers(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .map(p => ({ id: p.id, name: p.name, score: p.score, answered: p.answered }));
}
function sendLobby(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit("lobby-update", { code, players: publicPlayers(room), hostName: room.hostName });
}
function cleanRoom(code) {
  const room = rooms.get(code);
  if (room && room.timer) clearInterval(room.timer);
  rooms.delete(code);
}

io.on("connection", socket => {
  socket.on("create-room", ({ name }) => {
    const code = makeCode();
    const hostName = String(name || "Anfitrión").trim().slice(0, 18) || "Anfitrión";
    const room = {
      code, hostId: socket.id, hostName,
      players: new Map(),
      questionIndex: -1, phase: "lobby", timeLeft: 20, timer: null
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.isHost = true;
    socket.emit("room-created", { code, hostName });
    sendLobby(code);
  });

  socket.on("join-room", ({ code, name }) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    const playerName = String(name || "Jugador").trim().slice(0, 18) || "Jugador";
    if (!room) return socket.emit("join-error", "No encontramos esa sala. Revisa el código.");
    if (room.phase !== "lobby") return socket.emit("join-error", "La partida ya comenzó. Pide un código de una sala nueva.");
    if (room.players.size >= 40) return socket.emit("join-error", "La sala está llena (máximo 40 jugadores).");
    if ([...room.players.values()].some(p => p.name.toLowerCase() === playerName.toLowerCase()))
      return socket.emit("join-error", "Ese nombre ya está en uso en esta sala. Prueba otro.");
    room.players.set(socket.id, { id: socket.id, name: playerName, score: 0, answered: false });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.isHost = false;
    socket.emit("joined-room", { code, name: playerName });
    sendLobby(code);
  });

  socket.on("start-game", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId || room.phase !== "lobby") return;
    if (room.players.size === 0) return socket.emit("host-notice", "Necesitas al menos un jugador para comenzar.");
    room.phase = "question";
    room.questionIndex = 0;
    startQuestion(code);
  });

  socket.on("submit-answer", ({ answer }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.phase !== "question") return;
    const player = room.players.get(socket.id);
    if (!player || player.answered) return;
    player.answered = true;
    const q = QUESTIONS[room.questionIndex];
    if (Number(answer) === q.answer) {
      const speedBonus = Math.max(0, Math.floor((room.timeLeft / 20) * 500));
      player.score += 500 + speedBonus;
    }
    socket.emit("answer-accepted");
    io.to(code).emit("answer-count", {
      answered: [...room.players.values()].filter(p => p.answered).length,
      total: room.players.size
    });
    if ([...room.players.values()].every(p => p.answered)) revealQuestion(code);
  });

  socket.on("next-question", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId || room.phase !== "reveal") return;
    if (room.questionIndex >= QUESTIONS.length - 1) {
      room.phase = "finished";
      io.to(code).emit("game-finished", { leaderboard: publicPlayers(room) });
      return;
    }
    room.questionIndex += 1;
    room.phase = "question";
    startQuestion(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    if (socket.id === room.hostId) {
      io.to(code).emit("room-closed", "El anfitrión salió de la partida.");
      cleanRoom(code);
      return;
    }
    room.players.delete(socket.id);
    if (room.players.size === 0 && room.phase === "lobby") {
      cleanRoom(code);
      return;
    }
    sendLobby(code);
    if (room.phase === "question") {
      io.to(code).emit("answer-count", {
        answered: [...room.players.values()].filter(p => p.answered).length,
        total: room.players.size
      });
      if (room.players.size && [...room.players.values()].every(p => p.answered)) revealQuestion(code);
    }
  });
});

function startQuestion(code) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.timer) clearInterval(room.timer);
  room.phase = "question";
  room.timeLeft = 20;
  for (const player of room.players.values()) player.answered = false;
  const q = QUESTIONS[room.questionIndex];
  io.to(code).emit("new-question", {
    index: room.questionIndex,
    total: QUESTIONS.length,
    question: q.q,
    options: q.options,
    timeLeft: room.timeLeft,
    leaderboard: publicPlayers(room)
  });
  room.timer = setInterval(() => {
    if (!rooms.has(code)) return;
    room.timeLeft -= 1;
    io.to(code).emit("timer-tick", { timeLeft: room.timeLeft });
    if (room.timeLeft <= 0) revealQuestion(code);
  }, 1000);
}
function revealQuestion(code) {
  const room = rooms.get(code);
  if (!room || room.phase !== "question") return;
  room.phase = "reveal";
  if (room.timer) clearInterval(room.timer);
  const q = QUESTIONS[room.questionIndex];
  io.to(code).emit("question-reveal", {
    correctAnswer: q.answer,
    fact: q.fact,
    leaderboard: publicPlayers(room),
    index: room.questionIndex,
    total: QUESTIONS.length
  });
}

server.listen(PORT, () => console.log(`Historia Quiz escuchando en el puerto ${PORT}`));
