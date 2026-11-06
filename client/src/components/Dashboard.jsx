
import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Package,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const money = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)

const compactMoney = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(amount) || 0)

const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: '12px',
  boxShadow: '0 12px 30px rgba(2, 8, 23, 0.4)',
  color: '#f8fafc',
}

const dateFormat = (date) => {
  if (!date) return '—'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return '—'

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const emptySummary = {
  totalProducts: 0,
  totalStockQuantity: 0,
  inventoryValue: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
}

function Dashboard() {
  const { user } = useAuth()

  const [products, setProducts] = useState([])
  const [tableProducts, setTableProducts] = useState([])
  const [tablePagination, setTablePagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [tableLoading, setTableLoading] = useState(true)
  const [movements, setMovements] = useState([])
  const [movementPagination, setMovementPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [movementLoading, setMovementLoading] = useState(true)
  const [summary, setSummary] = useState(emptySummary)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [summaryError, setSummaryError] = useState(false)
  const [search, setSearch] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      const [productResult, summaryResult] = await Promise.allSettled([
        api.get('/products', {
          params: { page: 1, limit: 100 },
        }),
        api.get('/dashboard/summary'),
      ])

      setLoadError(false)
      setSummaryError(false)

      if (productResult.status === 'rejected') {
        throw productResult.reason
      }

      const responseData = productResult.value.data

      const latestProducts = Array.isArray(responseData.products)
        ? responseData.products
        : []

      setProducts(latestProducts)

      if (summaryResult.status === 'fulfilled') {
        const receivedSummary = summaryResult.value.data.summary

        if (receivedSummary) {
          setSummary({
            ...emptySummary,
            ...receivedSummary,
          })
        } else {
          setSummaryError(true)
          toast.error('Dashboard summary data is missing.')
        }
      } else {
        setSummaryError(true)
        toast.error('Could not load dashboard summary.')
      }
    } catch (error) {
      setLoadError(true)

      toast.error(
        error.response?.data?.message ||
          'Could not load inventory data'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMovementPage = useCallback(async () => {
    setMovementLoading(true)
    try {
      const response = await api.get('/stock-movements', {
        params: {
          page: movementPagination.page,
          limit: movementPagination.limit,
        },
      })

      setMovements(response.data.movements || [])
      setMovementPagination((current) => ({
        ...current,
        ...(response.data.pagination || {}),
      }))
    } catch (error) {
      setMovements([])
      toast.error(
        error.response?.data?.message ||
          'Could not load recent stock movements.',
      )
    } finally {
      setMovementLoading(false)
    }
  }, [movementPagination.limit, movementPagination.page])

  const loadTableProducts = useCallback(async () => {
    setTableLoading(true)

    try {
      const response = await api.get('/products', {
        params: {
          page: tablePagination.page,
          limit: tablePagination.limit,
          search: search.trim() || undefined,
        },
      })

      setTableProducts(response.data.products || [])
      setTablePagination((current) => ({
        ...current,
        ...(response.data.pagination || {}),
      }))
    } catch (error) {
      setTableProducts([])
      toast.error(
        error.response?.data?.message ||
          'Could not load the inventory product list',
      )
    } finally {
      setTableLoading(false)
    }
  }, [search, tablePagination.limit, tablePagination.page])

  useEffect(() => {
    Promise.resolve().then(loadDashboard)
  }, [loadDashboard])

  useEffect(() => {
    const timeoutId = setTimeout(loadMovementPage, 0)
    return () => clearTimeout(timeoutId)
  }, [loadMovementPage])

  useEffect(() => {
    const timeoutId = setTimeout(loadTableProducts, 250)
    return () => clearTimeout(timeoutId)
  }, [loadTableProducts])

  const lowStockProducts = products.filter((product) => {
    const quantity = Number(product.quantity ?? 0)
    const reorderLevel = Number(product.reorderLevel ?? 5)

    return quantity > 0 && quantity <= reorderLevel
  })

  const filteredProducts = tableProducts

  
  const categoryChartData = Object.values(
    products.reduce((groups, product) => {
      const categoryName = product.category?.name || 'Uncategorized'
      const quantity = Number(product.quantity || 0)
      const costPrice = Number(product.costPrice || 0)

      if (!groups[categoryName]) {
        groups[categoryName] = {
          category: categoryName,
          inventoryValue: 0,
        }
      }

      groups[categoryName].inventoryValue += quantity * costPrice

      return groups
    }, {})
  )
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 8)

  const stockStatusData = [
    {
      name: 'In Stock',
      value: products.filter((product) => {
        const quantity = Number(product.quantity || 0)
        const reorderLevel = Number(product.reorderLevel ?? 5)

        return quantity > reorderLevel
      }).length,
      color: '#10b981',
    },
    {
      name: 'Low Stock',
      value: products.filter((product) => {
        const quantity = Number(product.quantity || 0)
        const reorderLevel = Number(product.reorderLevel ?? 5)

        return quantity > 0 && quantity <= reorderLevel
      }).length,
      color: '#f59e0b',
    },
    {
      name: 'Out of Stock',
      value: products.filter(
        (product) => Number(product.quantity || 0) <= 0
      ).length,
      color: '#f43f5e',
    },
  ].filter((item) => item.value > 0)

  const stockStatusTotal = stockStatusData.reduce(
    (total, item) => total + item.value,
    0,
  )

  const statCards = [
    {
      label: 'Total Products',
      value: summary.totalProducts.toLocaleString('en-IN'),
      detail: 'Active products in inventory',
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Stock Quantity',
      value: summary.totalStockQuantity.toLocaleString('en-IN'),
      detail: 'Combined units across active products',
      icon: Boxes,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Inventory Value',
      value: money(summary.inventoryValue),
      detail: 'Cost value of all active inventory',
      icon: CircleDollarSign,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Low Stock',
      value: summary.lowStockProducts.toLocaleString('en-IN'),
      detail: 'Products at or below reorder level',
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Out of Stock',
      value: summary.outOfStockProducts.toLocaleString('en-IN'),
      detail: 'Products needing replenishment',
      icon: Boxes,
      color: 'bg-rose-50 text-rose-600',
    },
  ]

  return (
    <div className="space-y-8">
      <section className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Overview
          </p>

          <h2 className="mt-1 text-2xl font-bold text-white">
            Dashboard
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Welcome back, {user?.name || 'User'}.
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true)
            loadDashboard()
            loadTableProducts()
            loadMovementPage()
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </section>

      <div className="space-y-8">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">
              Inventory overview
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              A live snapshot of your stock.
            </p>
          </div>

          <span className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-300 shadow-sm">
            {new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </section>

        {summaryError && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            Dashboard summary is unavailable. Click Refresh to try again.
          </div>
        )}

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {statCards.map(({ label, value, detail, icon: Icon, color }) => (
            <article
              key={label}
              className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.35)] backdrop-blur-sm"
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-2xl p-3 ${color}`}>
                  <Icon size={22} />
                </div>

                <Activity size={18} className="text-slate-500" />
              </div>

              <p className="mt-5 text-sm text-slate-400">{label}</p>

              <p className="mt-1 break-words text-2xl font-bold tracking-tight text-white">
                {loading || summaryError ? '...' : value}
              </p>

              <p className="mt-2 text-xs text-slate-400">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[26px] border border-amber-400/20 bg-slate-900/80 p-5 shadow-[0_22px_50px_rgba(2,8,23,0.3)] backdrop-blur-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Low Stock Alerts
              </h3>

              <p className="text-sm text-slate-400">
                Products that need replenishment
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-200">
              {loading ? '...' : `${lowStockProducts.length} alerts`}
            </span>
          </div>

          {loading ? (
            <p className="rounded-lg bg-slate-950/60 p-4 text-sm text-slate-400">
              Checking stock levels...
            </p>
          ) : loadError ? (
            <p className="rounded-lg bg-rose-500/10 p-4 text-sm text-rose-200">
              Low stock alerts could not be loaded. Refresh to try again.
            </p>
          ) : lowStockProducts.length === 0 ? (
            <p className="rounded-lg bg-slate-950/60 p-4 text-sm text-slate-400">
              No low-stock products found in the loaded product list.
            </p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product._id || product.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-950/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">
                      {product.name}
                    </p>

                    <p className="text-sm text-slate-400">
                      SKU: {product.sku || '—'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-amber-300">
                      {product.quantity} {product.unit || 'units'}
                    </p>

                    <p className="text-xs text-slate-400">
                      Reorder at {product.reorderLevel ?? 5}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        
        <section className="grid gap-5 xl:grid-cols-2">
          <article className="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_22px_50px_rgba(2,8,23,0.35)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Inventory Value by Category
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Stock quantity multiplied by cost price
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-200">
                Up to 8 categories
              </span>
            </div>

            {loading ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl bg-slate-950/30 text-sm text-slate-400">
                Loading analytics...
              </div>
            ) : categoryChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl bg-slate-950/30 text-sm text-slate-400">
                No inventory data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 18, left: 4, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="inventoryValueGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#334155"
                    strokeOpacity={0.5}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={compactMoney}
                    tickCount={5}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={112}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value.length > 17 ? `${value.slice(0, 16)}…` : value
                    }
                  />
                  <Tooltip
                    formatter={(value) => [money(value), 'Inventory value']}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                    itemStyle={{ color: '#c7d2fe' }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Bar
                    dataKey="inventoryValue"
                    name="Inventory value"
                    fill="url(#inventoryValueGradient)"
                    radius={[0, 7, 7, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </article>

          <article className="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_22px_50px_rgba(2,8,23,0.35)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Stock Status Distribution
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Breakdown of loaded products by stock level
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Product mix
              </span>
            </div>

            {loading ? (
              <div className="flex h-[260px] items-center justify-center rounded-2xl bg-slate-950/30 text-sm text-slate-400">
                Loading stock status...
              </div>
            ) : stockStatusData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center rounded-2xl bg-slate-950/30 text-sm text-slate-400">
                No products available to display.
              </div>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stockStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={98}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {stockStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} ${Number(value) === 1 ? 'product' : 'products'}`,
                        name,
                      ]}
                      contentStyle={chartTooltipStyle}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    {stockStatusTotal.toLocaleString('en-IN')}
                  </span>
                  <span className="mt-0.5 text-xs font-medium text-slate-400">
                    products
                  </span>
                </div>
              </div>
            )}

            <div className="mt-1 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
              {[
                { name: 'In Stock', color: '#10b981' },
                { name: 'Low Stock', color: '#f59e0b' },
                { name: 'Out of Stock', color: '#f43f5e' },
              ].map((status) => {
                const count =
                  stockStatusData.find((item) => item.name === status.name)
                    ?.value || 0

                return (
                  <div
                    key={status.name}
                    className="min-w-0 rounded-xl bg-slate-950/35 px-2 py-2.5 text-center sm:px-3"
                  >
                    <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 sm:text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="truncate">{status.name}</span>
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-100">
                      {loading ? '—' : count.toLocaleString('en-IN')}
                    </p>
                  </div>
                )
              })}
            </div>
          </article>
        </section>


        <section className="mt-8 overflow-hidden rounded-[26px] border border-slate-800 bg-slate-900/80 shadow-[0_22px_50px_rgba(2,8,23,0.35)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
            <div>
              <h3 className="font-bold text-white">Inventory products</h3>

              <p className="mt-1 text-sm text-slate-400">
                Loaded directly from your database
              </p>
            </div>

            <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 shadow-inner sm:w-72">
              <Search size={17} className="shrink-0 text-slate-400" />

              <input
                aria-label="Search products"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setTablePagination((current) => ({ ...current, page: 1 }))
                }}
                placeholder="Search name or SKU..."
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">SKU</th>
                  <th className="px-6 py-4 font-semibold">Quantity</th>
                  <th className="px-6 py-4 font-semibold">Cost price</th>
                  <th className="px-6 py-4 font-semibold">Selling price</th>
                  <th className="px-6 py-4 font-semibold">Stock status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {!tableLoading &&
                  filteredProducts.map((product) => {
                    const quantity = Number(product.quantity || 0)
                    const reorderLevel = Number(product.reorderLevel ?? 5)
                    const isOut = quantity <= 0
                    const isLow = !isOut && quantity <= reorderLevel

                    return (
                      <tr
                        key={product._id || product.id}
                        className="transition hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-100">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {product.category?.name || 'Uncategorized'}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-slate-300">
                          {product.sku || '—'}
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-100">
                          {quantity} {product.unit || 'units'}
                        </td>

                        <td className="px-6 py-4 text-slate-300">
                          {money(product.costPrice)}
                        </td>

                        <td className="px-6 py-4 text-slate-300">
                          {money(product.sellingPrice)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              isOut
                                ? 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20'
                                : isLow
                                  ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20'
                                  : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20'
                            }`}
                          >
                            {isOut
                              ? 'Out of stock'
                              : isLow
                                ? 'Low stock'
                                : 'In stock'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                {tableLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Loading inventory...
                    </td>
                  </tr>
                )}

                {!tableLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Package className="mx-auto mb-3 text-slate-500" size={30} />

                      <p className="font-medium text-slate-200">
                        No products found
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Try another search or add products.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:px-6">
            <p>
              {tablePagination.total === 0
                ? 'No products'
                : `Showing ${(tablePagination.page - 1) * tablePagination.limit + 1}–${Math.min(
                    tablePagination.page * tablePagination.limit,
                    tablePagination.total,
                  )} of ${tablePagination.total} products`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={tablePagination.page <= 1 || tableLoading}
                onClick={() =>
                  setTablePagination((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-24 text-center text-sm text-slate-300">
                Page {tablePagination.page} of {Math.max(1, tablePagination.pages)}
              </span>
              <button
                type="button"
                disabled={
                  tablePagination.page >= tablePagination.pages || tableLoading
                }
                onClick={() =>
                  setTablePagination((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[26px] border border-slate-800 bg-slate-900/80 shadow-[0_22px_50px_rgba(2,8,23,0.35)] backdrop-blur-sm">
          <div className="border-b border-slate-800 p-5 sm:p-6">
            <h3 className="font-bold text-white">Recent stock movements</h3>

            <p className="mt-1 text-sm text-slate-400">
              Latest changes recorded by the system
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Movement</th>
                  <th className="px-6 py-4 font-semibold">Quantity</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {!movementLoading &&
                  movements.map((movement) => {
                    const isIn = movement.type === 'stock_in'
                    const isOut = movement.type === 'stock_out'

                    return (
                      <tr
                        key={movement._id}
                        className="hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-100">
                            {movement.product?.name || 'Inventory item'}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {movement.note || 'No note provided'}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700">
                            {isIn ? (
                              <ArrowUpRight size={14} />
                            ) : (
                              <ArrowDownRight size={14} />
                            )}

                            {String(movement.type || 'adjustment')
                              .replaceAll('_', ' ')
                              .replace(/^./, (letter) => letter.toUpperCase())}
                          </span>
                        </td>

                        <td
                          className={`px-6 py-4 font-semibold ${
                            isIn
                              ? 'text-emerald-300'
                              : isOut
                                ? 'text-rose-300'
                                : 'text-slate-200'
                          }`}
                        >
                          {isIn ? '+' : isOut ? '−' : ''}
                          {movement.quantity}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {dateFormat(movement.createdAt)}
                        </td>
                      </tr>
                    )
                  })}

                {!movementLoading && movements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}

                {movementLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                      Loading stock movements...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row sm:px-6">
            <p className="text-xs text-slate-400">
              {movementPagination.total === 0
                ? 'No stock movements'
                : `Showing ${(movementPagination.page - 1) * movementPagination.limit + 1}–${Math.min(
                    movementPagination.page * movementPagination.limit,
                    movementPagination.total,
                  )} of ${movementPagination.total} movements`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={movementPagination.page <= 1 || movementLoading}
                onClick={() =>
                  setMovementPagination((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-24 text-center text-sm text-slate-300">
                Page {movementPagination.page} of {Math.max(1, movementPagination.pages)}
              </span>
              <button
                type="button"
                disabled={
                  movementPagination.page >= movementPagination.pages ||
                  movementLoading
                }
                onClick={() =>
                  setMovementPagination((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          SmartStock Inventory Management
        </footer>
      </div>
    </div>
  )
}

export default Dashboard
