
const Product = require('../models/Product')

async function getDashboardSummary(req, res, next) {
  try {
    const activeFilter = { isActive: true }

    const [
      totalProducts,
      stockTotals,
      lowStockProducts,
      outOfStockProducts,
    ] = await Promise.all([
      Product.countDocuments(activeFilter),

      Product.aggregate([
        { $match: activeFilter },
        {
          $group: {
            _id: null,
            totalStockQuantity: { $sum: '$quantity' },
            inventoryValue: {
              $sum: {
                $multiply: ['$quantity', '$costPrice'],
              },
            },
          },
        },
      ]),

      Product.countDocuments({
        ...activeFilter,
        $expr: {
          $lte: ['$quantity', '$reorderLevel'],
        },
      }),

      Product.countDocuments({
        ...activeFilter,
        quantity: { $lte: 0 },
      }),
    ])

    const totals = stockTotals[0] || {
      totalStockQuantity: 0,
      inventoryValue: 0,
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalProducts,
        totalStockQuantity: totals.totalStockQuantity,
        inventoryValue: totals.inventoryValue,
        lowStockProducts,
        outOfStockProducts,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { getDashboardSummary }
