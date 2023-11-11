const winston = require("winston");

const fileTransport = new winston.transports.File({
  filename: "error.log",
  level: "error",
});


const logger = winston.createLogger({
  transports: [
    fileTransport,
    new winston.transports.Console(), 
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
});

module.exports = logger;
