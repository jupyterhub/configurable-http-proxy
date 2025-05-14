"use strict";
const winston = require("winston");

const simpleFormat = winston.format.printf((info) => {
  // console.log(info);
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

function defaultLogger(options) {
  options = options || {};
  options.format = winston.format.combine(
    winston.format.colorize(),
    winston.format.label({ label: "ConfigProxy" }),
    winston.format.splat(),
    winston.format.timestamp(),
    simpleFormat
  );
  options.transports = [new winston.transports.Console()];
  return winston.createLogger(options);
}

exports.defaultLogger = defaultLogger;
