import winston from "winston";

const logLevel = process.env.LOG_LEVEL || "info";
const isTestEnvironment = process.env.NODE_ENV === "test";

const logger = winston.createLogger({
  level: logLevel,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: "zorvyn-api",
    environment: process.env.NODE_ENV || "development",
  },
  silent: isTestEnvironment,
  transports: [new winston.transports.Console()],
});

export const morganStream = {
  write: (message) => {
    const sanitizedMessage = message.trim();

    if (!sanitizedMessage) {
      return;
    }

    logger.info(sanitizedMessage, {
      event: "http_request",
    });
  },
};

export default logger;
