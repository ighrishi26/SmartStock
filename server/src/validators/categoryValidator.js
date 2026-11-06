
const { z } = require('zod')

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().default(''),
})

module.exports = { categorySchema }
