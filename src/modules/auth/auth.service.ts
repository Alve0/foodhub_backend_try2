import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../config/prisma";
import type { ROLE } from "../../generated/prisma/browser";
import { createAccessToken } from "../../middleware/jwt";
import { AppError } from "../../utils/app-error";

const BCRYPT_ROUNDS = 12;
const PUBLIC_ROLES = ["customer", "provider"] as const;

type AuthInput = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
};
type PasswordInput = { currentPassword?: unknown; newPassword?: unknown };

const cleanEmail = (email: unknown): string =>
  typeof email === "string" ? email.trim().toLowerCase() : "";
const requirePassword = (password: unknown, field = "password"): string => {
  if (typeof password !== "string" || password.length < 8)
    throw new AppError(`${field} must be at least 8 characters`, 400);
  return password;
};
const publicUser = (user: { password: string; [key: string]: unknown }) => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};
const userFromToken = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isActive === false)
    throw new AppError("User not found or inactive", 401);
  return user;
};

const createUser = async (input: AuthInput) => {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = cleanEmail(input.email);
  const password = requirePassword(input.password);
  const role = input.role;
  if (!name || !email || !role)
    throw new AppError("Missing required fields", 400);
  if (!email.includes("@") || name.length > 50 || email.length > 50)
    throw new AppError("Invalid user data", 400);
  if (!PUBLIC_ROLES.includes(role as (typeof PUBLIC_ROLES)[number]))
    throw new AppError(
      "Only customer or provider accounts can be registered",
      403,
    );
  if (await prisma.user.findUnique({ where: { email } }))
    throw new AppError("User already exists", 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { createdUser, token } = await prisma.$transaction(
    async (transaction) => {
      const createdUser = await transaction.user.create({
        data: { name, email, password: passwordHash, role: role as ROLE },
      });
      const token = createAccessToken({
        sub: createdUser.id,
        role: createdUser.role,
      });
      await transaction.session.create({
        data: { userId: createdUser.id, token },
      });
      return { createdUser, token };
    },
  );
  return { user: publicUser(createdUser), token };
};

const login = async (input: AuthInput) => {
  const email = cleanEmail(input.email);
  const password = requirePassword(input.password);
  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    user.isActive === false ||
    !(await bcrypt.compare(password, user.password))
  )
    throw new AppError("Invalid email or password", 401);
  const token = createAccessToken({ sub: user.id, role: user.role });
  await prisma.session.create({ data: { userId: user.id, token } });
  return { user: publicUser(user), token };
};

const changePassword = async (userId: string, input: PasswordInput) => {
  const user = await userFromToken(userId);
  const currentPassword = requirePassword(
    input.currentPassword,
    "currentPassword",
  );
  const newPassword = requirePassword(input.newPassword, "newPassword");
  if (!(await bcrypt.compare(currentPassword, user.password)))
    throw new AppError("Current password is incorrect", 401);
  if (currentPassword === newPassword)
    throw new AppError("New password must be different", 400);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return { message: "Password changed successfully. Please log in again." };
};

const updateProfile = async (
  userId: string,
  input: { name?: unknown; email?: unknown },
) => {
  await userFromToken(userId);
  const data: { name?: string; email?: string } = {};
  if (input.name !== undefined) {
    if (
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.trim().length > 50
    )
      throw new AppError("Invalid name", 400);
    data.name = input.name.trim();
  }
  if (input.email !== undefined) {
    const email = cleanEmail(input.email);
    if (!email.includes("@") || email.length > 50)
      throw new AppError("Invalid email", 400);
    data.email = email;
  }
  if (!Object.keys(data).length)
    throw new AppError("No profile changes provided", 400);
  try {
    return publicUser(
      await prisma.user.update({ where: { id: userId }, data }),
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      throw new AppError("Email already exists", 409);
    throw error;
  }
};

const forgotPassword = async (input: { email?: unknown }) => {
  const email = cleanEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return {
      message: "If the account exists, a reset link has been requested.",
    };
  const resetToken = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: createHash("sha256").update(resetToken).digest("hex"),
      resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const response: { message: string; resetToken?: string } = {
    message: "If the account exists, a reset link has been requested.",
  };
  if (process.env.NODE_ENV !== "production") response.resetToken = resetToken;
  return response;
};

const resetPassword = async (input: {
  token?: unknown;
  newPassword?: unknown;
}) => {
  if (typeof input.token !== "string" || !input.token)
    throw new AppError("Reset token is required", 400);
  const newPassword = requirePassword(input.newPassword, "newPassword");
  const user = await prisma.user.findFirst({
    where: {
      resetTokenHash: createHash("sha256").update(input.token).digest("hex"),
      resetTokenExpiresAt: { gt: new Date() },
    },
  });
  if (!user) throw new AppError("Invalid or expired reset token", 400);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return { message: "Password reset successfully. Please log in." };
};

const getAllUsers = () =>
  prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
const getAllProviders = () =>
  prisma.pROVIDER.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
const getAllCustomers = () =>
  prisma.cUSTOMER.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

export const authService = {
  createUser,
  login,
  changePassword,
  updateProfile,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getAllProviders,
  getAllCustomers,
};
