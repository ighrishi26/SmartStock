
const express = require('express')
const protect = require('../middleware/protect')
const authorize = require('../middleware/authorize')
const { getUsers, updateUser } = require('../controllers/userController')

const router = express.Router()

router.use(protect, authorize('admin'))

router.get('/', getUsers)
router.patch('/:id', updateUser)

module.exports = router
