import bcrypt from "bcrypt";
import User from "../models/User.js";
import { createHttpError } from "../utils/httpError.js";
import { generateAuthToken } from "../utils/jwtHelper.js";

const SALT_ROUNDS = 10;

const normalizeEmail = (email) => email.trim().toLowerCase();

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw createHttpError(400, "Name, email, and password are required");
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw createHttpError(409, "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return sanitizeUser(user);
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, "Email already registered");
    }

    throw error;
  }
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw createHttpError(400, "Email and password are required");
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw createHttpError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid email or password");
  }

  const token = generateAuthToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    token,
    user: sanitizeUser(user),
  };
};
