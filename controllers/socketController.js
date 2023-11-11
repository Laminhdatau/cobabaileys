const socketModel = require("../models/socketModel");
const logger = require("../logger");

const init = async (socket) => {
  try {
    await socketModel.init(socket);

    const savedSessions = socketModel.getSessionsFile();
    savedSessions.forEach((session) => {
      try {
        handleSessionInitialization(session);
      } catch (error) {
        logger.error(`Error initializing session: ${error.message}`);
        throw error;
      }
    });
  } catch (error) {
    logger.error("Error in socketController.init:", error.message);
  }
};

const handleSessionInitialization = (session) => {
  const { id } = session;

  console.log({ id });

  if (id) {
    try {
      socketModel.startSock(id);
      initializeMessageListener(id);
    } catch (error) {
      logger.error(`Error starting socket for session ${id}: ${error.message}`);
      throw error;
    }
  }
};

const initializeMessageListener = (sessionId) => {
  const client = socketModel.sock[sessionId]; // Menggunakan sock dari socketModel
  const WELCOME_MESSAGE = "Halo! Selamat datang di bot WhatsApp. Ada yang bisa saya bantu?";

  client.ev.on("message.new", async (message) => {
    try {
      if (!message.sender.isMe) {
        // Kirim pesan selamat datang sebagai respons
        await client.sendMessage(message.jid, {
          text: WELCOME_MESSAGE,
        });

        console.log(`Ucapan selamat datang terkirim ke ${message.sender.jid}`);
      }
    } catch (error) {
      logger.error(`Failed to respond to message: ${error.message}`);
    }
  });
};

const createSession = (data) => {
  try {
    const { id } = data;

    console.log({ id });

    if (id) {
      socketModel.startSock(id);
      initializeMessageListener(id);
    }
  } catch (error) {
    logger.error("Error in socketController.createSession:", error.message);
  }
};

module.exports = {
  init,
  createSession,
};
