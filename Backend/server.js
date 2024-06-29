import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import Actions from "./Actions.js";
// import Actions from './Actions';
// import Actions from '../frontend/src/Actions';
dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server);

const userSockets = {};
app.get("/", (req, res) => {
  res.send("Welcome");
});

const getlAllconnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSockets[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  socket.on(Actions.JOIN, ({ roomId, username }) => {
    // console.log(username+"is Joining Room : "+roomId + " with SocketId : "+socket.id)
    userSockets[socket.id] = username;
    socket.join(roomId);
    const clients = getlAllconnectedClients(roomId);
    // console.log(clients);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(Actions.JOINED, {
        clients,
        username: username,
        socketId: socket.id,
      });
    });

    console.log(socket.rooms);
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];

    rooms.forEach((roomId) => {
      socket.in(roomId).emit(Actions.DISCONNECT, {
        socketId: socket.id,
        username: userSockets[socket.id],
      });
    });

    delete userSockets[socket.id];
    socket.leave();
  });
  socket.on(
    "change",
    ({ code, roomId, username, output, language, theme, font }) => {
      console.log({ code, roomId, username, output, language, theme, font });
      const clients = getlAllconnectedClients(roomId);
      clients.forEach(({ socketId }) => {
        socket.in(socketId).emit(Actions.SYNC_CODE, {
          code,
          name: username,
          out: output,
          lang: language,
          them: theme,
          fonts: font,
        });
      });
    }
  );
});

const port = process.env.PORT || 7000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
