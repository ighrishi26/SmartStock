
const { z } = require('zod')

const stockMovementSchema = z.object({
  type: z.enum(['stock_in', 'stock_out', 'adjustment']),
  quantity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  note: z.string().trim().max(500).optional().default(''),
})

module.exports = { stockMovementSchema }
