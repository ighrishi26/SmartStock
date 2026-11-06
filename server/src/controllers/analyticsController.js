
const Product = require('../models/Product')

const getInventoryAnalytics = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .select('name sku quantity reorderLevel costPrice sellingPrice category unit')

    const summary = {
      totalProducts: products.length,
      totalUnits: 0,
      inventoryValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      healthyStockCount: 0,
    }

    const categoryMap = new Map()
    const lowStockProducts = []
    const outOfStockProducts = []

    for (const product of products) {
      const quantity = Number(product.quantity) || 0
      const reorderLevel = Number(product.reorderLevel) || 0
      const costPrice = Number(product.costPrice) || 0

      summary.totalUnits += quantity
      summary.inventoryValue += quantity * costPrice

      let status = 'Healthy'

      if (quantity === 0) {
        status = 'Out of Stock'
        summary.outOfStockCount += 1
        outOfStockProducts.push(product)
      } else if (quantity <= reorderLevel) {
        status = 'Low Stock'
        summary.lowStockCount += 1
        lowStockProducts.push(product)
      } else {
        summary.healthyStockCount += 1
      }

      const categoryName = product.category?.name || 'Uncategorized'

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          productCount: 0,
          totalUnits: 0,
          inventoryValue: 0,
        })
      }

      const category = categoryMap.get(categoryName)
      category.productCount += 1
      category.totalUnits += quantity
      category.inventoryValue += quantity * costPrice

      product._doc.stockStatus = status
    }

    summary.inventoryValue = Number(summary.inventoryValue.toFixed(2))

    const categoryBreakdown = Array.from(categoryMap.values()).map(
      (category) => ({
        ...category,
        inventoryValue: Number(category.inventoryValue.toFixed(2)),
      })
    )

    res.status(200).json({
      success: true,
      data: {
        summary,
        categoryBreakdown,
        stockStatus: [
          { name: 'Healthy', value: summary.healthyStockCount },
          { name: 'Low Stock', value: summary.lowStockCount },
          { name: 'Out of Stock', value: summary.outOfStockCount },
        ],
        lowStockProducts,
        outOfStockProducts,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { getInventoryAnalytics }
