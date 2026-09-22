import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

const requireText = (value: unknown, field: string, max: number): string => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new AppError(`Invalid ${field}`, 400);
  return value.trim();
};

const requirePrice = (value: unknown): number => {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0)
    throw new AppError("Invalid price", 400);
  return Math.round(price * 100) / 100;
};

const getFoods = async (query: Record<string, unknown>) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 100);
  const search =
    typeof query.search === "string" ? query.search.trim() : undefined;
  const categoryId =
    typeof query.categoryId === "string" ? query.categoryId : undefined;
  const providerId =
    typeof query.providerId === "string" ? query.providerId : undefined;
  const isPopular = parseBoolean(query.isPopular);
  const where = {
    ...(search
      ? {
          OR: [
            { foodName: { contains: search, mode: "insensitive" as const } },
            {
              foodDescription: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(providerId ? { providerId } : {}),
    ...(isPopular === undefined ? {} : { isPopular }),
  };
  const [foods, total] = await prisma.$transaction([
    prisma.fOOD.findMany({
      where,
      include: {
        category: true,
        provider: { select: { id: true, restaurantName: true, isOpen: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fOOD.count({ where }),
  ]);
  return {
    foods,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getFood = async (id: string) => {
  const food = await prisma.fOOD.findUnique({
    where: { id },
    include: {
      category: true,
      provider: { select: { id: true, restaurantName: true, isOpen: true } },
    },
  });
  if (!food) throw new AppError("Food not found", 404);
  return food;
};

const createFood = async (userId: string, input: Record<string, unknown>) => {
  const provider = await prisma.pROVIDER.findUnique({ where: { userId } });
  if (!provider) throw new AppError("Provider profile not found", 404);
  const foodName = requireText(input.foodName, "food name", 100);
  const foodDescription = requireText(
    input.foodDescription,
    "food description",
    255,
  );
  const categoryId = requireText(input.categoryId, "category", 50);
  const price = requirePrice(input.price);
  if (!(await prisma.cATEGORY.findUnique({ where: { id: categoryId } })))
    throw new AppError("Category not found", 404);
  try {
    return await prisma.fOOD.create({
      data: {
        foodName,
        foodDescription,
        categoryId,
        price,
        providerId: provider.id,
        isPopular: input.isPopular === true,
      },
      include: { category: true },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      throw new AppError("Food name already exists for this provider", 409);
    throw error;
  }
};

const updateFood = async (
  userId: string,
  id: string,
  input: Record<string, unknown>,
) => {
  const provider = await prisma.pROVIDER.findUnique({ where: { userId } });
  if (!provider) throw new AppError("Provider profile not found", 404);
  const food = await prisma.fOOD.findUnique({ where: { id } });
  if (!food || food.providerId !== provider.id)
    throw new AppError("Food not found", 404);
  const data: {
    foodName?: string;
    foodDescription?: string;
    categoryId?: string;
    price?: number;
    isPopular?: boolean;
  } = {};
  if (input.foodName !== undefined)
    data.foodName = requireText(input.foodName, "food name", 100);
  if (input.foodDescription !== undefined)
    data.foodDescription = requireText(
      input.foodDescription,
      "food description",
      255,
    );
  if (input.categoryId !== undefined) {
    data.categoryId = requireText(input.categoryId, "category", 50);
    if (!(await prisma.cATEGORY.findUnique({ where: { id: data.categoryId } })))
      throw new AppError("Category not found", 404);
  }
  if (input.price !== undefined) data.price = requirePrice(input.price);
  if (input.isPopular !== undefined) {
    if (typeof input.isPopular !== "boolean")
      throw new AppError("Invalid popularity flag", 400);
    data.isPopular = input.isPopular;
  }
  if (!Object.keys(data).length)
    throw new AppError("No food changes provided", 400);
  return prisma.fOOD.update({
    where: { id },
    data,
    include: { category: true },
  });
};

const deleteFood = async (userId: string, id: string) => {
  const provider = await prisma.pROVIDER.findUnique({ where: { userId } });
  const food = provider
    ? await prisma.fOOD.findUnique({ where: { id } })
    : null;
  if (!provider || !food || food.providerId !== provider.id)
    throw new AppError("Food not found", 404);
  await prisma.fOOD.delete({ where: { id } });
  return { message: "Food deleted successfully" };
};

const getCategories = () =>
  prisma.cATEGORY.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { foods: true } } },
  });
const createCategory = async (input: Record<string, unknown>) => {
  const name = requireText(input.name, "category name", 50);
  try {
    return await prisma.cATEGORY.create({ data: { name } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      throw new AppError("Category already exists", 409);
    throw error;
  }
};
const updateCategory = async (id: string, input: Record<string, unknown>) => {
  const name = requireText(input.name, "category name", 50);
  try {
    return await prisma.cATEGORY.update({ where: { id }, data: { name } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025")
      throw new AppError("Category not found", 404);
    if ((error as { code?: string }).code === "P2002")
      throw new AppError("Category already exists", 409);
    throw error;
  }
};
const deleteCategory = async (id: string) => {
  const category = await prisma.cATEGORY.findUnique({
    where: { id },
    include: { _count: { select: { foods: true } } },
  });
  if (!category) throw new AppError("Category not found", 404);
  if (category._count.foods)
    throw new AppError("Cannot delete a category with foods", 409);
  await prisma.cATEGORY.delete({ where: { id } });
  return { message: "Category deleted successfully" };
};

export const foodService = {
  getFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
