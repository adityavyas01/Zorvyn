import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import FinancialRecord from "../src/models/FinancialRecord.js";
import User from "../src/models/User.js";
import logger from "../src/utils/logger.js";

const SALT_ROUNDS = 10;

const DEMO_USERS = [
  {
    name: "Priya Sharma",
    email: "admin.demo@example.com",
    password: "AdminDemo123!",
    role: "Admin",
  },
  {
    name: "Rohan Mehta",
    email: "analyst.demo@example.com",
    password: "AnalystDemo123!",
    role: "Analyst",
  },
  {
    name: "Neha Verma",
    email: "viewer.demo@example.com",
    password: "ViewerDemo123!",
    role: "Viewer",
  },
];

const DEMO_RECORDS = [
  {
    ownerEmail: "analyst.demo@example.com",
    amount: "6200.00",
    type: "income",
    category: "Salary",
    note: "Monthly salary credit for March",
    date: "2026-03-01T09:00:00.000Z",
  },
  {
    ownerEmail: "analyst.demo@example.com",
    amount: "1850.00",
    type: "income",
    category: "Freelance",
    note: "Website optimization project payout",
    date: "2026-03-11T14:30:00.000Z",
  },
  {
    ownerEmail: "analyst.demo@example.com",
    amount: "249.75",
    type: "expense",
    category: "Groceries",
    note: "Weekly grocery run at FreshMart",
    date: "2026-03-05T18:10:00.000Z",
  },
  {
    ownerEmail: "analyst.demo@example.com",
    amount: "92.40",
    type: "expense",
    category: "Transport",
    note: "Fuel and toll charges",
    date: "2026-03-09T07:45:00.000Z",
  },
  {
    ownerEmail: "analyst.demo@example.com",
    amount: "1299.00",
    type: "expense",
    category: "Rent",
    note: "Studio apartment rent",
    date: "2026-03-02T08:30:00.000Z",
  },
  {
    ownerEmail: "analyst.demo@example.com",
    amount: "58.90",
    type: "expense",
    category: "Utilities",
    note: "Electricity bill payment",
    date: "2026-03-13T10:15:00.000Z",
  },
  {
    ownerEmail: "admin.demo@example.com",
    amount: "4100.00",
    type: "income",
    category: "Consulting",
    note: "Quarterly compliance consulting fee",
    date: "2026-03-07T12:00:00.000Z",
  },
  {
    ownerEmail: "admin.demo@example.com",
    amount: "320.00",
    type: "expense",
    category: "Software",
    note: "Team productivity tools renewal",
    date: "2026-03-15T16:20:00.000Z",
  },
];

const normalizeEmail = (email) => {
  return String(email || "").trim().toLowerCase();
};

const seedUsers = async () => {
  const usersByEmail = new Map();
  const summary = {
    inserted: 0,
    skipped: 0,
  };

  for (const demoUser of DEMO_USERS) {
    const normalizedEmail = normalizeEmail(demoUser.email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      usersByEmail.set(normalizedEmail, existingUser);
      summary.skipped += 1;
      continue;
    }

    const hashedPassword = await bcrypt.hash(demoUser.password, SALT_ROUNDS);

    const createdUser = await User.create({
      name: demoUser.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: demoUser.role,
      status: "active",
    });

    usersByEmail.set(normalizedEmail, createdUser);
    summary.inserted += 1;
  }

  return {
    usersByEmail,
    summary,
  };
};

const seedFinancialRecords = async (usersByEmail) => {
  const summary = {
    inserted: 0,
    skipped: 0,
  };

  for (const demoRecord of DEMO_RECORDS) {
    const ownerEmail = normalizeEmail(demoRecord.ownerEmail);
    const owner = usersByEmail.get(ownerEmail);

    if (!owner) {
      logger.warn("Skipping record seed because owner user is missing", {
        ownerEmail,
        category: demoRecord.category,
      });
      summary.skipped += 1;
      continue;
    }

    const recordDate = new Date(demoRecord.date);

    const existingRecord = await FinancialRecord.findOne({
      createdBy: owner._id,
      amount: demoRecord.amount,
      type: demoRecord.type,
      category: demoRecord.category,
      note: demoRecord.note,
      date: recordDate,
    });

    if (existingRecord) {
      summary.skipped += 1;
      continue;
    }

    await FinancialRecord.create({
      createdBy: owner._id,
      amount: demoRecord.amount,
      type: demoRecord.type,
      category: demoRecord.category,
      note: demoRecord.note,
      date: recordDate,
      deleted: false,
    });

    summary.inserted += 1;
  }

  return summary;
};

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};

const runSeed = async () => {
  await connectDB();

  const { usersByEmail, summary: userSummary } = await seedUsers();
  const recordSummary = await seedFinancialRecords(usersByEmail);

  logger.info("Demo seed completed", {
    usersInserted: userSummary.inserted,
    usersSkipped: userSummary.skipped,
    recordsInserted: recordSummary.inserted,
    recordsSkipped: recordSummary.skipped,
  });
};

const main = async () => {
  try {
    await runSeed();
  } catch (error) {
    logger.error("Demo seed failed", {
      errorMessage: error.message,
      stack: error.stack,
    });
    process.exitCode = 1;
  } finally {
    try {
      await disconnectDatabase();
    } catch (disconnectError) {
      logger.error("Failed to disconnect database after seed run", {
        errorMessage: disconnectError.message,
      });
      process.exitCode = 1;
    }
  }
};

void main();
