import { prisma } from '../db/prisma/client.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type CategoryOutput = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
};

export async function list(userId: string): Promise<ServiceResult<{ items: CategoryOutput[] }>> {
  const categories = await prisma.productCategory.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
  return {
    data: {
      items: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color,
        icon: c.icon,
      })),
    },
  };
}

type CreateInput = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
};

export async function create(
  userId: string,
  input: CreateInput
): Promise<ServiceResult<CategoryOutput>> {
  const category = await prisma.productCategory.create({
    data: {
      userId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
    },
  });

  return {
    data: {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
    },
  };
}

