
const express = require('express')
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController')
const protect = require('../middleware/protect')
const authorize = require('../middleware/authorize')
const validate = require('../middleware/validate')
const {
  productSchema,
  updateProductSchema,
} = require('../validators/productValidator')

const router = express.Router()

router.use(protect)

router.get('/', listProducts)
router.get('/:id', getProduct)

router.post(
  '/',
  authorize('admin', 'manager'),
  validate(productSchema),
  createProduct
)

router.put(
  '/:id',
  authorize('admin', 'manager'),
  validate(updateProductSchema),
  updateProduct
)

router.delete('/:id', authorize('admin'), deleteProduct)

module.exports = router
