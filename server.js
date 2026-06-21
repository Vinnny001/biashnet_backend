import "dotenv/config";
import app from "./src/app.js";
import { PORT } from "./src/config/constants.js";
import { logger } from "./src/utils/logger.js";

const server = app.listen(PORT, () => {
  logger.info(`Biashnet API listening on port ${PORT}`);
});

function shutdown(signal) {
  logger.info(`${signal} received. Closing server.`);
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
