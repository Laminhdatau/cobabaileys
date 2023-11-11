const fs = require("fs");
const baileys = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const socketIO = require("socket.io");
const path = require("path");
const logger = require("../logger");

const SESSIONS_FILE = "sessions/whatsapp.json";
console.log(SESSIONS_FILE);
const sock = {};
let state;
let io;

const setIO = (socketIOInstance) => {
  io = socketIOInstance;
};

const createSessionsFileIfNotExists = () => {
  if (!fs.existsSync(SESSIONS_FILE)) {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
      logger.info("Sessions file created successfully");
    } catch (err) {
      logger.error(`CREATE SESSION FILE : ${err.message}`);
      throw err;
    }
  }
};

const getSessionsFile = () => {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE).toString());
  } catch (error) {
    return [];
  }
};

const setSessionsFile = async (sessions) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), (err) => {
      if (err) {
        logger.error(`Failed to write sessions file: ${err.message}`);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const deleteFolderRecursive = (directoryPath) => {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
};

const handleConnectionUpdate = async (update, id) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    qrcode.toDataURL(qr, (err, url) => {
      if (err) {
        logger.error(`Failed to generate QR code: ${err.message}`);
      } else {
        io.emit("qr", { id, src: url });
      }
    });
  }

  if (connection === "close") {
    if (
      lastDisconnect &&
      lastDisconnect.error &&
      lastDisconnect.error.output &&
      lastDisconnect.error.output.statusCode !==
        baileys.DisconnectReason.loggedOut
    ) {
      setTimeout(() => {
        try {
          startSock(id);
        } catch (error) {
          logger.error(`Error restarting socket: ${error.message}`);
        }
      }, 15000);
    } else {
      if (fs.existsSync(`./sessions/${id}`)) {
        deleteFolderRecursive(`./sessions/${id}`);
        logger.info(`Successfully deleted session ${id}`);
        const savedSessions = getSessionsFile();
        const sessionIndex = savedSessions.findIndex((e) => e.id == id);
        savedSessions.splice(sessionIndex, 1);
        await setSessionsFile(savedSessions); // Tambahkan await untuk menunggu penulisan file selesai
      }
    }
  } else if (connection === "open") {
    io.emit("name", {
      id,
      name: state?.creds?.me?.name,
      status: "open",
    });
  }
};

const startSock = async (id) => {
  try {
    const { state, saveCreds } = await baileys.useMultiFileAuthState(
      `./sessions/${id}`
    );

    sock[id] = baileys.default({
      connectTimeoutMs: 10000,
      defaultQueryTimeoutMs: 10000000,
      keepAliveIntervalMs: 10000000,
      printQRInTerminal: true,
      auth: state,
    });

    sock[id].ev.on("connection.update", (update) => {
      try {
        handleConnectionUpdate(update, id);
      } catch (error) {
        logger.error(`Error handling connection update: ${error.message}`);
      }
    });

    sock[id].ev.on("creds.update", saveCreds);

    sock[id].ev.on("error", (error) => {
      // Tambahkan penanganan khusus untuk konflik
      if (error instanceof baileys.WAMError && error.code === 409) {
        logger.error(`Conflict detected: ${error.message}`);
        // Lakukan penanganan konflik di sini
      } else {
        logger.error(`Error in socket ${id}: ${error.message}`);
      }
    });

    const savedSessions = getSessionsFile();
    const sessionIndex = savedSessions.findIndex((sess) => sess.id == id);

    if (sessionIndex == -1) {
      savedSessions.push({ id });
      await setSessionsFile(savedSessions); // Tambahkan await untuk menunggu penulisan file selesai
    }

    return false;
  } catch (error) {
    logger.error(`Error starting socket: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
};

const init = async (socket) => {
  setIO(socket);
  createSessionsFileIfNotExists();
  const savedSessions = getSessionsFile();

  try {
    const startPromises = savedSessions.map((session) => {
      return startSock(session.id);
    });
    await Promise.all(startPromises);
  } catch (error) {
    logger.error(`Error initializing sessions: ${error.message}`);
    throw error;
  }

  savedSessions.forEach((session) => {
    try {
      startSock(session.id);
    } catch (error) {
      logger.error(
        `Error initializing session ${session.id}: ${error.message}`
      );
      throw error;
    }
  });
};

module.exports = {
  createSessionsFileIfNotExists,
  getSessionsFile,
  setSessionsFile,
  deleteFolderRecursive,
  startSock,
  init,
  setIO,
  state,
};
