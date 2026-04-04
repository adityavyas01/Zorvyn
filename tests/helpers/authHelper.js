import bcrypt from "bcrypt";
import User from "../../src/models/User.js";
import { generateAuthToken } from "../../src/utils/jwtHelper.js";

const SALT_ROUNDS = 10;

const randomSuffix = () => {
  return Math.random().toString(36).slice(2, 10);
};

export const buildTestEmail = (prefix = "user") => {
  return `${prefix}.${Date.now()}.${randomSuffix()}@test.com`;
};

export const createTestUser = async ({
  name = "Test User",
  email = buildTestEmail("user"),
  password = "Passw0rd!",
  role = "Viewer",
} = {}) => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  return User.create({
    name,
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role,
  });
};

export const createAuthTokenForUser = (user) => {
  return generateAuthToken({
    userId: user._id.toString(),
    role: user.role,
  });
};

export const createAuthHeaderForUser = (user) => {
  return `Bearer ${createAuthTokenForUser(user)}`;
};

export const createUserWithAuth = async (options = {}) => {
  const user = await createTestUser(options);
  const token = createAuthTokenForUser(user);

  return {
    user,
    token,
    authHeader: `Bearer ${token}`,
  };
};
