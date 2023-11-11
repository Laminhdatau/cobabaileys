"use strict";
const logger = require("./logger");
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const socketController = require("./controllers/socketController");
const routes = require("./routes");
const port = 3000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use("/assets", express.static(path.join(__dirname, "/assets/")));
app.use("/", routes);

server.listen(port, () => {
  logger.info(
    `Server is listening on http://localhost:${port}/?id=123&as=noname`
  );
});

io.on("connection", (socket) => {
  socketController.init(socket);

  socket.on("create-session", (data) => {
    try {
      if (data.id) {
        logger.debug("io connection: " + data.id);
        socketController.createSession(data);
      } else {
        throw new Error("Invalid data format or missing 'id' property.");
      }
    } catch (error) {
      logger.error(`ION CONNECTION : ${error.message}`);
    }
  });
});
