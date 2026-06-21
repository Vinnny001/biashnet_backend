import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { apiLimiter } from "./middleware/rateLimit.js";
import { corsMiddleware } from "./middleware/cors.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logging.js";
import routes from "./routes/index.js";

const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(requestLogger);
app.use(apiLimiter);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Biashnet API is running.",
    health: "/api/health"
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
