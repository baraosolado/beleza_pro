import { prisma } from '../db/prisma/client.js';

type ServiceResult<T> =
  | { data: T; error?: never }
  | { error: string; code: string; statusCode: number; data?: never };

type ListInput = { search?: string };

type ProductOutput = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  costPrice: number | null;
  stockQuantity: number;
  lowStockAlert: boolean;
  lowStockThreshold: number | null;
  sku: string | null;
  imageUrl: string | null;
};

export async function getById(
  userId: string,
  id: string
): Promise<ServiceResult<ProductOutput>> {
  const product = await prisma.product.findFirst({
    where: { id, userId },
  });

  if (!product) {
    return {
      error: 'Produto não encontrado',
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  return {
    data: {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      stockQuantity: product.stockQuantity,
      lowStockAlert: product.lowStockAlert,
      lowStockThreshold: product.lowStockThreshold,
      sku: product.sku,
      imageUrl: product.imageUrl,
    },
  };
}

export async function list(
  userId: string,
  input: ListInput
): Promise<ServiceResult<{ items: ProductOutput[] }>> {
  const where: { userId: string; name?: { contains: string; mode: 'insensitive' } } = { userId };
  if (input.search && input.search.trim().length > 0) {
    where.name = { contains: input.search.trim(), mode: 'insensitive' };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return {
    data: {
      items: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: Number(p.price),
        costPrice: p.costPrice ? Number(p.costPrice) : null,
        stockQuantity: p.stockQuantity,
        lowStockAlert: p.lowStockAlert,
        lowStockThreshold: p.lowStockThreshold,
        sku: p.sku,
        imageUrl: p.imageUrl,
      })),
    },
  };
}

type CreateInput = {
  name: string;
  description?: string;
  category?: string;
  price: number;
  costPrice?: number | null;
  stockQuantity: number;
  lowStockAlert?: boolean;
  lowStockThreshold?: number | null;
  sku?: string | null;
  imageUrl?: string | null;
};

type UpdateInput = {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  costPrice?: number | null;
  stockQuantity?: number;
  lowStockAlert?: boolean;
  lowStockThreshold?: number | null;
  sku?: string | null;
  imageUrl?: string | null;
};

export async function create(
  userId: string,
  input: CreateInput
): Promise<ServiceResult<ProductOutput>> {
  const product = await prisma.product.create({
    data: {
      userId,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      price: input.price,
      costPrice: input.costPrice ?? null,
      stockQuantity: input.stockQuantity,
      lowStockAlert: input.lowStockAlert ?? false,
      lowStockThreshold: input.lowStockThreshold ?? null,
      sku: input.sku ?? null,
      imageUrl: input.imageUrl ?? null,
    },
  });

  return {
    data: {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      stockQuantity: product.stockQuantity,
      lowStockAlert: product.lowStockAlert,
      lowStockThreshold: product.lowStockThreshold,
      sku: product.sku,
      imageUrl: product.imageUrl,
    },
  };
}

export async function update(
  userId: string,
  id: string,
  input: UpdateInput
): Promise<ServiceResult<ProductOutput>> {
  const existing = await prisma.product.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return {
      error: 'Produto não encontrado',
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      description:
        input.description !== undefined ? input.description ?? null : existing.description,
      category: input.category !== undefined ? input.category ?? null : existing.category,
      price: input.price ?? existing.price,
      costPrice:
        input.costPrice !== undefined ? input.costPrice ?? null : existing.costPrice,
      stockQuantity: input.stockQuantity ?? existing.stockQuantity,
      lowStockAlert: input.lowStockAlert ?? existing.lowStockAlert,
      lowStockThreshold:
        input.lowStockThreshold !== undefined
          ? input.lowStockThreshold ?? null
          : existing.lowStockThreshold,
      sku: input.sku !== undefined ? input.sku ?? null : existing.sku,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl ?? null : existing.imageUrl,
    },
  });

  return {
    data: {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      stockQuantity: product.stockQuantity,
      lowStockAlert: product.lowStockAlert,
      lowStockThreshold: product.lowStockThreshold,
      sku: product.sku,
      imageUrl: product.imageUrl,
    },
  };
}

