import winston from "winston";

const simpleFormat = winston.format.printf((info) => {
  // console.log(info);
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

export function defaultLogger(options) {
  options = options || {};
  const colorize = options.color !== false && !process.env.NO_COLOR;
  options.format = winston.format.combine(
    ...(colorize ? [winston.format.colorize()] : []),
    winston.format.label({ label: "ConfigProxy" }),
    winston.format.splat(),
    winston.format.timestamp(),
    simpleFormat
  );
  options.transports = [new winston.transports.Console()];
  return winston.createLogger(options);
}
