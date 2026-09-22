import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";
import type { ORDER_STATUS } from "../../generated/prisma/browser";

const statuses: ORDER_STATUS[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];
const transitions: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};
const providerFor = async (userId: string) => {
  const provider = await prisma.pROVIDER.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
    },
  });
  if (!provider) throw new AppError("Provider profile not found", 404);
  return provider;
};
const getProfile = (userId: string) => providerFor(userId);
const updateProfile = async (
  userId: string,
  input: Record<string, unknown>,
) => {
  const provider = await providerFor(userId);
  const data: Record<string, string> = {};
  for (const field of [
    "restaurantName",
    "restaurantDescription",
    "restaurantAddress",
    "phone",
    "restaurantImage",
  ])
    if (input[field] !== undefined) {
      if (typeof input[field] !== "string" || !input[field].trim())
        throw new AppError(`Invalid ${field}`, 400);
      data[field] = input[field].trim();
    }
  if (!Object.keys(data).length)
    throw new AppError("No provider changes provided", 400);
  return prisma.pROVIDER.update({ where: { id: provider.id }, data });
};
const setOpen = async (userId: string, isOpen: unknown) => {
  if (typeof isOpen !== "boolean")
    throw new AppError("isOpen must be boolean", 400);
  const provider = await providerFor(userId);
  return prisma.pROVIDER.update({
    where: { id: provider.id },
    data: { isOpen },
  });
};
const getOrders = async (userId: string) => {
  const provider = await providerFor(userId);
  return prisma.oRDER.findMany({
    where: { providerId: provider.id },
    include: {
      customer: { include: { user: { select: { name: true, email: true } } } },
      orderItems: { include: { food: true } },
      reviews: true,
    },
    orderBy: { createdAt: "desc" },
  });
};
const updateOrderStatus = async (
  userId: string,
  orderId: string,
  status: unknown,
) => {
  if (typeof status !== "string" || !statuses.includes(status as ORDER_STATUS))
    throw new AppError("Invalid order status", 400);
  const provider = await providerFor(userId);
  const order = await prisma.oRDER.findUnique({ where: { id: orderId } });
  if (!order || order.providerId !== provider.id)
    throw new AppError("Order not found", 404);
  if (!(transitions[order.status] ?? []).includes(status))
    throw new AppError(
      `Cannot move order from ${order.status} to ${status}`,
      409,
    );
  return prisma.oRDER.update({
    where: { id: orderId },
    data: { status: status as ORDER_STATUS },
    include: { orderItems: { include: { food: true } } },
  });
};
export const providerService = {
  getProfile,
  updateProfile,
  setOpen,
  getOrders,
  updateOrderStatus,
};
