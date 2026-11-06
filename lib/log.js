import winston from "winston";

const simpleFormat = winston.format.printf((info) => {
  // console.log(info);
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

export function defaultLogger(options) {
  options = options || {};
  let colorize = options.color;
  if (colorize === undefined) {
    if (process.env.FORCE_COLOR) {
      colorize = process.env.FORCE_COLOR !== "0";
    } else if (process.env.NO_COLOR) {
      colorize = false;
    } else {
      colorize = process.stdin.isTTY;
    }
  }
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
