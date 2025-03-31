import { createLogger, format, transports } from 'winston';
import path from 'path';

const logDir = path.resolve(__dirname, '../../logs');

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
      ),
    }),
    new transports.File({ filename: path.join(logDir, 'app.log') }),
  ],
});
