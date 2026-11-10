import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";

import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { logger } from "./utils/logger";

// Routers
import { authRouter } from "./modules/auth/auth.routes";
import { aboutRouter } from "./modules/about/about.routes";
import { userRouter } from "@/modules/user";
import { schoolRouter } from "@/modules/school";
import { studentRouter } from "@/modules/student";
import { roundRouter } from "@/modules/round";
import { classRouter } from "@/modules/class";
import { questionTopicRoutes } from "@/modules/questionTopic";
import { questionPackageRouter } from "@/modules/questionPackage";
import { questionDetailRouter } from "@/modules/questionDetail";
import questionRoutes from "@/modules/question/question.routes";
import { rescueRoute } from "@/modules/rescues";
import { contestRoute } from "@/modules/contest";
import { matchRouter } from "@/modules/match";
import { screenRouter } from "@/modules/screen";
import { enumRouter } from "@/modules/enum";
import { awardRoutes } from "@/modules/award";
import { groupRouter } from "@/modules/group";
import { contestantRouter } from "@/modules/contestant";
import { groupDivisionRoutes } from "@/modules/groupDivision";
import { mediaRouter } from "@/modules/media";
import { resultRouter } from "@/modules/result";
import { sponsorRouter } from "@/modules/sponsor";
import { classVideoRouter } from "@/modules/classVideo";
import { excelRouter } from "@/modules/excel";

// Load environment variables
dotenv.config();

const app = express();

// ========== CORS setup ==========
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:5173",
];

// ========== CORS setup ==========
const corsOptions: CorsOptions = {
  origin: true, // Cho phép tất cả origin kết nối (Flutter Web, Mobile, React...)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

// ✅ GỌI CORS TRƯỚC KHI ROUTE
app.use(cors(corsOptions));

// ✅ GỌI CORS TRƯỚC KHI ROUTE
app.use(cors(corsOptions));

// Static file /uploads kèm CORS headers
app.use(
  "/uploads",
  (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }

    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control"
    );
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }

    next();
  },
  express.static(path.join(__dirname, "../uploads"))
);

// ========== Middleware ==========
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// ========== Routes ==========
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/about", aboutRouter);
app.use("/api/user", userRouter);
app.use("/api/school", schoolRouter);
app.use("/api/class", classRouter);
app.use("/api/round", roundRouter);
app.use("/api/student", studentRouter);
app.use("/api/question-topics", questionTopicRoutes);
app.use("/api/question-packages", questionPackageRouter);
app.use("/api/question-details", questionDetailRouter);
app.use("/api/contest", contestRoute);
app.use("/api/rescue", rescueRoute);
app.use("/api/enums", enumRouter);
app.use("/api/awards", awardRoutes);
app.use("/api/match", matchRouter);
app.use("/api/media", mediaRouter);
app.use("/api/group", groupRouter);
app.use("/api/screen", screenRouter);
app.use("/api/class-video", classVideoRouter);
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRouter);
app.use("/api/sponsors", sponsorRouter);
app.use("/api/contestant", contestantRouter);
app.use("/api/group-divisions", groupDivisionRoutes);
app.use("/api/group-division", groupDivisionRoutes);
app.use("/api/excel", excelRouter);

app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Contest Backend API v1",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      about: "/api/about",
      users: "/api/users",
      "question-topics": "/api/question-topics",
      "question-packages": "/api/question-packages",
      "question-details": "/api/question-details",
      enums: "/api/enums",
      health: "/health",
    },
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Contest Backend API",
    version: "1.0.0",
    api: "/api/v1",
    health: "/health",
  });
});

// ========== Error handlers ==========
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
