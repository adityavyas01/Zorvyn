import mongoose from "mongoose";
import { dbUrl } from "./index.js";
import logger from "../utils/logger.js";

export const connectDB = async (timeoutMs = 7000) => {
  if (!dbUrl) {
    throw new Error("DB_URL is not defined");
  }

  try {
    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: timeoutMs,
    });
    logger.info("MongoDB connected");
  } catch (error) {
    logger.error("MongoDB connection failed", {
      errorMessage: error.message,
    });
    throw error;
  }
};
