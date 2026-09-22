import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";
import type { ORDER_STATUS } from "../../generated/prisma/browser";

const getCustomer = async (userId: string) => {
  const customer = await prisma.cUSTOMER.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isActive: true,
        },
      },
      cart: true,
    },
  });
  if (!customer) throw new AppError("Customer profile not found", 404);
  return customer;
};
const getCart = async (userId: string) => {
  const customer = await getCustomer(userId);
  const cart =
    customer.cart ??
    (await prisma.cART.create({ data: { customerId: customer.id } }));
  return prisma.cART.findUnique({
    where: { id: cart.id },
    include: {
      cartItems: {
        include: {
          food: {
            include: {
              provider: {
                select: { id: true, restaurantName: true, isOpen: true },
              },
              category: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
};
const updateProfile = async (
  userId: string,
  input: Record<string, unknown>,
) => {
  const customer = await getCustomer(userId);
  const data: { address?: string; phone?: string } = {};
  if (input.address !== undefined) {
    if (
      typeof input.address !== "string" ||
      !input.address.trim() ||
      input.address.trim().length > 500
    )
      throw new AppError("Invalid address", 400);
    data.address = input.address.trim();
  }
  if (input.phone !== undefined) {
    if (
      typeof input.phone !== "string" ||
      !input.phone.trim() ||
      input.phone.trim().length > 20
    )
      throw new AppError("Invalid phone", 400);
    data.phone = input.phone.trim();
  }
  if (!Object.keys(data).length)
    throw new AppError("No customer changes provided", 400);
  return prisma.cUSTOMER.update({
    where: { id: customer.id },
    data,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};
const positiveQuantity = (value: unknown) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    throw new AppError("Quantity must be an integer from 1 to 100", 400);
  return quantity;
};
const addItem = async (
  userId: string,
  foodId: unknown,
  quantityInput: unknown,
) => {
  if (typeof foodId !== "string" || !foodId)
    throw new AppError("Food id is required", 400);
  const quantity = positiveQuantity(quantityInput);
  const customer = await getCustomer(userId);
  const food = await prisma.fOOD.findUnique({
    where: { id: foodId },
    include: { provider: true },
  });
  if (!food) throw new AppError("Food not found", 404);
  if (!food.provider.isOpen)
    throw new AppError("This provider is currently closed", 409);
  const cart =
    customer.cart ??
    (await prisma.cART.create({ data: { customerId: customer.id } }));
  const current = await prisma.cARTITEMS.findFirst({
    where: { cartId: cart.id },
    include: { food: true },
  });
  if (current && current.food.providerId !== food.providerId)
    throw new AppError("A cart can contain food from one provider only", 409);
  return prisma.cARTITEMS.upsert({
    where: { cartId_foodId: { cartId: cart.id, foodId } },
    create: { cartId: cart.id, foodId, quantity, discountedPrice: food.price },
    update: { quantity: { increment: quantity }, discountedPrice: food.price },
    include: { food: true },
  });
};
const updateItem = async (
  userId: string,
  itemId: string,
  quantityInput: unknown,
) => {
  const quantity = positiveQuantity(quantityInput);
  const customer = await getCustomer(userId);
  const item = await prisma.cARTITEMS.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });
  if (!item || item.cart.customerId !== customer.id)
    throw new AppError("Cart item not found", 404);
  return prisma.cARTITEMS.update({
    where: { id: itemId },
    data: { quantity },
    include: { food: true },
  });
};
const removeItem = async (userId: string, itemId: string) => {
  const customer = await getCustomer(userId);
  const item = await prisma.cARTITEMS.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });
  if (!item || item.cart.customerId !== customer.id)
    throw new AppError("Cart item not found", 404);
  await prisma.cARTITEMS.delete({ where: { id: itemId } });
  return { message: "Cart item removed successfully" };
};
const clearCart = async (userId: string) => {
  const customer = await getCustomer(userId);
  if (customer.cart)
    await prisma.cARTITEMS.deleteMany({ where: { cartId: customer.cart.id } });
  return { message: "Cart cleared successfully" };
};
const checkout = async (userId: string, addressInput: unknown) => {
  const customer = await getCustomer(userId);
  const address =
    typeof addressInput === "string" && addressInput.trim()
      ? addressInput.trim()
      : customer.address?.trim();
  if (!address) throw new AppError("Delivery address is required", 400);
  const cart = await prisma.cART.findUnique({
    where: { customerId: customer.id },
    include: {
      cartItems: { include: { food: { include: { provider: true } } } },
    },
  });
  if (!cart || !cart.cartItems.length) throw new AppError("Cart is empty", 400);
  const providerId = cart.cartItems[0].food.providerId;
  if (cart.cartItems.some((item) => item.food.providerId !== providerId))
    throw new AppError("A cart can contain food from one provider only", 409);
  if (!cart.cartItems[0].food.provider.isOpen)
    throw new AppError("This provider is currently closed", 409);
  const total = cart.cartItems.reduce(
    (sum, item) => sum + Number(item.food.price) * item.quantity,
    0,
  );
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.oRDER.create({
      data: {
        customerId: customer.id,
        providerId,
        address,
        status: "pending",
        totalAmount: Math.round(total * 100) / 100,
        orderItems: {
          create: cart.cartItems.map((item) => ({
            foodId: item.foodId,
            quantity: item.quantity,
            price: item.food.price,
          })),
        },
      },
      include: { orderItems: { include: { food: true } }, provider: true },
    });
    await transaction.cARTITEMS.deleteMany({ where: { cartId: cart.id } });
    return order;
  });
};
const getOrders = async (userId: string) => {
  const customer = await getCustomer(userId);
  return prisma.oRDER.findMany({
    where: { customerId: customer.id },
    include: {
      provider: true,
      orderItems: { include: { food: true } },
      reviews: true,
    },
    orderBy: { createdAt: "desc" },
  });
};
const getOrder = async (userId: string, orderId: string) => {
  const customer = await getCustomer(userId);
  const order = await prisma.oRDER.findUnique({
    where: { id: orderId },
    include: {
      provider: true,
      orderItems: { include: { food: true } },
      reviews: true,
    },
  });
  if (!order || order.customerId !== customer.id)
    throw new AppError("Order not found", 404);
  return order;
};
const cancelOrder = async (userId: string, orderId: string) => {
  const order = await getOrder(userId, orderId);
  if (!(["pending", "accepted"] as string[]).includes(order.status))
    throw new AppError("This order can no longer be cancelled", 409);
  return prisma.oRDER.update({
    where: { id: order.id },
    data: { status: "cancelled" },
  });
};
const createReview = async (
  userId: string,
  orderId: string,
  input: Record<string, unknown>,
) => {
  const order = await getOrder(userId, orderId);
  if (order.status !== "completed")
    throw new AppError("Reviews are available after order completion", 409);
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new AppError("Rating must be an integer from 1 to 5", 400);
  if (
    typeof input.reviewText !== "string" ||
    !input.reviewText.trim() ||
    input.reviewText.length > 2000
  )
    throw new AppError("Invalid review text", 400);
  try {
    return await prisma.rEVIEW.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        rating,
        reviewText: input.reviewText.trim(),
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      throw new AppError("This order already has a review", 409);
    throw error;
  }
};
const listReviews = (foodId?: string) =>
  prisma.rEVIEW.findMany({
    where: foodId ? { order: { orderItems: { some: { foodId } } } } : undefined,
    include: {
      customer: { include: { user: { select: { name: true, image: true } } } },
      order: { select: { id: true, providerId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
export const customerService = {
  getCustomer,
  updateProfile,
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  checkout,
  getOrders,
  getOrder,
  cancelOrder,
  createReview,
  listReviews,
};
