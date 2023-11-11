const express = require("express");
const socketController = require("../controllers/socketController");
const socketModel = require("../models/socketModel");
const logger = require("../logger");
const router = express.Router();

router.get("/", (req, res) => {
  res.sendFile("views/index.html", {
    root: __dirname + "/../",
  });
});

router.post("/send-message", async (req, res) => {
  try {
    const sender = req.body.sender;
    const number = `${req.body.number}@s.whatsapp.net`;
    const message = req.body.message;
    let timeout = 5000;

    setTimeout(async () => {
      try {
        const sendMessage = await socketModel.sock[sender].sendMessage(number, {
          text: message,
        });

        timeout = 5000;
        res.status(200).json({
          status: true,
          response: sendMessage,
        });
      } catch (error) {
        logger.error(`Error sending message: ${error.message}`);
        timeout = 10000;
        res.status(500).json({
          status: false,
          response: "Failed to send message",
        });
      }
    }, timeout);
  } catch (error) {
    logger.error(`Error in /send-message route : ${error.message}`);
    console.error("Error in /send-message route:", error);
    res.status(500).json({
      status: false,
      response: "Internal server error",
    });
  }
});

module.exports = router;
