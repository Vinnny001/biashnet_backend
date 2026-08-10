import cors from "cors";

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin(origin, callback) {
    //console.log("Request Origin:", origin);
    //console.log("Allowed Origins:", allowedOrigins);

    if (!origin || allowedOrigins.includes(origin)) {
     // console.log("✅ CORS Allowed");
      return callback(null, true);
    }

    console.log("❌ CORS Blocked");
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
});