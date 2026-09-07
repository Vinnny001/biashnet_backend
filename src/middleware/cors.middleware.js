import cors from "cors";

const allowedOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:3000,http://localhost:5173,https://golden-biashnet.web.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow requests without an Origin header
    // such as server-to-server requests.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `❌ CORS blocked origin: ${origin}`
    );

    return callback(
      new Error(`Not allowed by CORS: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
});