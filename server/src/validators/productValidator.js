
const { z } = require('zod')

const productFields = {
  name: z.string().trim().min(2).max(150),
  sku: z.string().trim().min(1).max(50),
  description: z.string().trim().max(1000).optional().default(''),
  category: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid category ID'),
  quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().default(0),
  unit: z.string().trim().min(1).max(30).optional().default('pcs'),
  costPrice: z.number().finite().min(0),
  sellingPrice: z.number().finite().min(0),
  reorderLevel: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().default(10),
  location: z.string().trim().max(150).optional().default(''),
}

const productSchema = z.object(productFields)

const updateProductSchema = z.object({
  name: productFields.name.optional(),
  sku: productFields.sku.optional(),
  description: productFields.description,
  category: productFields.category.optional(),
  quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  unit: productFields.unit,
  costPrice: productFields.costPrice.optional(),
  sellingPrice: productFields.sellingPrice.optional(),
  reorderLevel: productFields.reorderLevel,
  location: productFields.location,
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' }
)

module.exports = {
  productSchema,
  updateProductSchema,
}
