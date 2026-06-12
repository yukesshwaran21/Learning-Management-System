// Config: logger.js
// Winston logger configuration.
// Development: colourised console output
// Production:  JSON files with daily rotation

const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, errors } = format;

/**
 * DevelopmentLogFormat
 * Human-readable, colourised format for local development.
 */
const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `${timestamp} [${level}]: ${message}\n${stack}`
      : `${timestamp} [${level}]: ${message}`;
  })
);

/**
 * ProductionLogFormat
 * Machine-parseable JSON for log aggregation tools (e.g. Datadog).
 */
const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

const isProduction = process.env.NODE_ENV === "production";

const logger = createLogger({
  level: isProduction ? "warn" : "debug",
  format: isProduction ? productionFormat : developmentFormat,
  transports: [
    new transports.Console(),
    ...(isProduction
      ? [
          new transports.File({ filename: "logs/error.log",  level: "error" }),
          new transports.File({ filename: "logs/combined.log" }),
        ]
      : []),
  ],
  exceptionHandlers: isProduction
    ? [new transports.File({ filename: "logs/exceptions.log" })]
    : [new transports.Console()],
});

module.exports = logger;
