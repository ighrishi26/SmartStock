
const express = require('express')
const {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController')
const protect = require('../middleware/protect')
const authorize = require('../middleware/authorize')
const validate = require('../middleware/validate')
const { categorySchema } = require('../validators/categoryValidator')

const router = express.Router()

router.use(protect)

router.get('/', listCategories)
router.get('/:id', getCategory)

router.post(
  '/',
  authorize('admin', 'manager'),
  validate(categorySchema),
  createCategory
)

router.put(
  '/:id',
  authorize('admin', 'manager'),
  validate(categorySchema),
  updateCategory
)

router.delete('/:id', authorize('admin'), deleteCategory)

module.exports = router
