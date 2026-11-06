
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  Boxes,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Package,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const chartColors = ['#34d399', '#fbbf24', '#fb7185']
const stockStatusColors = {
  Healthy: '#34d399',
  'Low Stock': '#fbbf24',
  'Out of Stock': '#fb7185',
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const number = new Intl.NumberFormat('en-IN')
const tablePageSize = 10
const compactNumber = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const compactCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: '12px',
  boxShadow: '0 12px 30px rgba(2, 8, 23, 0.4)',
  color: '#f8fafc',
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="mb-5">
        <h2 className="font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ children }) {
  return (
    <div className="flex min-h-40 items-center justify-center text-center text-sm text-slate-500">
      {children}
    </div>
  )
}

function TablePagination({ page, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / tablePageSize))
  const firstRecord = total === 0 ? 0 : (page - 1) * tablePageSize + 1
  const lastRecord = Math.min(page * tablePageSize, total)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-4 sm:flex-row">
      <p className="text-xs text-slate-400">
        Showing {number.format(firstRecord)}–{number.format(lastRecord)} of{' '}
        {number.format(total)} records
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-24 text-center text-sm text-slate-300">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function Reports() {
  const [analytics, setAnalytics] = useState(null)
  const [categoryPage, setCategoryPage] = useState(1)
  const [lowStockPage, setLowStockPage] = useState(1)
  const [outOfStockPage, setOutOfStockPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(() =>
    axios
      .get(`${API_URL}/analytics/inventory`, { withCredentials: true })
      .then((response) => {
        setAnalytics(response.data.data)
        setCategoryPage(1)
        setLowStockPage(1)
        setOutOfStockPage(1)
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Unable to load analytics. Please check your connection and sign-in.'
        )
      })
      .finally(() => {
        setLoading(false)
      }),
  [])

  const retryAnalytics = () => {
    setLoading(true)
    setError('')
    loadAnalytics()
  }

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="animate-spin" size={20} />
        Loading inventory analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 text-rose-400" size={22} />
          <div className="flex-1">
            <h2 className="font-semibold text-white">
              Analytics could not be loaded
            </h2>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              onClick={retryAnalytics}
              className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const summary = analytics?.summary || {}
  const categoryBreakdown = analytics?.categoryBreakdown || []
  const chartCategoryBreakdown = [...categoryBreakdown].sort(
    (first, second) => second.totalUnits - first.totalUnits,
  )
  const chartCategoryValues = [...categoryBreakdown].sort(
    (first, second) => second.inventoryValue - first.inventoryValue,
  )
  const chartCategoryProducts = [...categoryBreakdown].sort(
    (first, second) => second.productCount - first.productCount,
  )
  const averageCategoryUnits = chartCategoryBreakdown.length
    ? chartCategoryBreakdown.reduce(
        (total, category) => total + Number(category.totalUnits || 0),
        0,
      ) / chartCategoryBreakdown.length
    : 0
  const stockStatus = analytics?.stockStatus || []
  const lowStockProducts = analytics?.lowStockProducts || []
  const outOfStockProducts = analytics?.outOfStockProducts || []
  const visibleCategories = categoryBreakdown.slice(
    (categoryPage - 1) * tablePageSize,
    categoryPage * tablePageSize,
  )
  const visibleLowStockProducts = lowStockProducts.slice(
    (lowStockPage - 1) * tablePageSize,
    lowStockPage * tablePageSize,
  )
  const visibleOutOfStockProducts = outOfStockProducts.slice(
    (outOfStockPage - 1) * tablePageSize,
    outOfStockPage * tablePageSize,
  )

  const hasStockData = stockStatus.some((item) => item.value > 0)
  const stockStatusTotal = stockStatus.reduce(
    (total, item) => total + item.value,
    0,
  )

  const exportCsv = () => {
    const rows = [
      ['Inventory Report'],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['Summary'],
      ['Total Products', summary.totalProducts || 0],
      ['Total Units', summary.totalUnits || 0],
      ['Inventory Value', summary.inventoryValue || 0],
      ['Low Stock Products', summary.lowStockCount || 0],
      ['Out of Stock Products', summary.outOfStockCount || 0],
      [],
      ['Category', 'Products', 'Units', 'Inventory Value'],
      ...categoryBreakdown.map((item) => [
        item.name,
        item.productCount,
        item.totalUnits,
        item.inventoryValue,
      ]),
      [],
      ['Low Stock Products'],
      ['Product', 'SKU', 'Quantity', 'Reorder Level'],
      ...lowStockProducts.map((item) => [
        item.name,
        item.sku,
        item.quantity,
        item.reorderLevel,
      ]),
      [],
      ['Out of Stock Products'],
      ['Product', 'SKU', 'Quantity', 'Reorder Level'],
      ...outOfStockProducts.map((item) => [
        item.name,
        item.sku,
        item.quantity,
        item.reorderLevel,
      ]),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const safeValue = String(value ?? '')
            return `"${safeValue.replace(/"/g, '""')}"`
          })
          .join(',')
      )
      .join('\r\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'smartstock-inventory-report.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  const productRows = (products) =>
    products.map((product) => (
      <tr key={product._id} className="border-t border-white/5">
        <td className="px-4 py-3">
          <p className="font-medium text-white">{product.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {product.sku}
          </p>
        </td>
        <td className="px-4 py-3 text-slate-300">
          {number.format(product.quantity || 0)} {product.unit || 'units'}
        </td>
        <td className="px-4 py-3 text-slate-300">
          {number.format(product.reorderLevel || 0)}
        </td>
      </tr>
    ))

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <ChartNoAxesCombined size={17} />
            Inventory insights
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Reports & Analytics
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Understand your inventory value, stock health, and category performance.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Products"
          value={number.format(summary.totalProducts || 0)}
          subtitle="Products in your inventory"
          icon={Package}
          color="bg-indigo-400/10 text-indigo-300"
        />
        <StatCard
          title="Total Stock Units"
          value={number.format(summary.totalUnits || 0)}
          subtitle="Units currently available"
          icon={Boxes}
          color="bg-sky-400/10 text-sky-300"
        />
        <StatCard
          title="Inventory Value"
          value={currency.format(summary.inventoryValue || 0)}
          subtitle="Based on product cost prices"
          icon={CircleDollarSign}
          color="bg-emerald-400/10 text-emerald-300"
        />
        <StatCard
          title="Products Needing Attention"
          value={number.format(
            (summary.lowStockCount || 0) + (summary.outOfStockCount || 0)
          )}
          subtitle={`${summary.lowStockCount || 0} low stock · ${summary.outOfStockCount || 0} out of stock`}
          icon={TrendingUp}
          color="bg-amber-400/10 text-amber-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Stock Health"
          description="How your active products are distributed by stock status."
        >
          {hasStockData ? (
            <div>
              <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={98}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {stockStatus.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={stockStatusColors[entry.name] || chartColors[0]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${number.format(value)} ${Number(value) === 1 ? 'product' : 'products'}`,
                        name,
                      ]}
                      contentStyle={chartTooltipStyle}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    {number.format(stockStatusTotal)}
                  </span>
                  <span className="mt-0.5 text-xs font-medium text-slate-400">
                    active products
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                {[
                  { name: 'Healthy', label: 'Healthy', color: stockStatusColors.Healthy },
                  { name: 'Low Stock', label: 'Low stock', color: stockStatusColors['Low Stock'] },
                  { name: 'Out of Stock', label: 'Out of stock', color: stockStatusColors['Out of Stock'] },
                ].map((status) => {
                  const count =
                    stockStatus.find((item) => item.name === status.name)?.value || 0

                  return (
                    <div
                      key={status.name}
                      className="min-w-0 rounded-xl bg-slate-950/40 px-2 py-2.5 text-center sm:px-3"
                    >
                      <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 sm:text-xs">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="truncate">{status.label}</span>
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-100">
                        {number.format(count)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <EmptyState>No products to display yet.</EmptyState>
          )}
        </Section>

        <Section
          title="Inventory by Category"
          description={`Units held in each category. Dashed line marks the ${number.format(Math.round(averageCategoryUnits))}-unit average.`}
        >
          {chartCategoryBreakdown.length ? (
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <ResponsiveContainer
                width="100%"
                height={Math.max(260, chartCategoryBreakdown.length * 36)}
              >
                <BarChart
                  data={chartCategoryBreakdown}
                  layout="vertical"
                  margin={{ top: 8, right: 18, left: 4, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="reportCategoryUnitsGradient"
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
                    strokeOpacity={0.7}
                    strokeDasharray="3 5"
                    horizontal={false}
                    vertical
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => compactNumber.format(value)}
                    tickCount={5}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value.length > 17 ? `${value.slice(0, 16)}…` : value
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null

                      const category = payload[0].payload

                      return (
                        <div className="min-w-48 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
                          <p className="mb-2 border-b border-slate-700 pb-2 text-sm font-semibold text-white">
                            {label}
                          </p>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between gap-5">
                              <span className="text-slate-400">Stock units</span>
                              <span className="font-medium text-indigo-200">
                                {number.format(category.totalUnits || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-5">
                              <span className="text-slate-400">Products</span>
                              <span className="font-medium text-slate-100">
                                {number.format(category.productCount || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-5">
                              <span className="text-slate-400">Inventory value</span>
                              <span className="font-medium text-emerald-300">
                                {currency.format(category.inventoryValue || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <ReferenceLine
                    x={averageCategoryUnits}
                    stroke="#fbbf24"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Avg ${compactNumber.format(averageCategoryUnits)}`,
                      fill: '#fcd34d',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <Bar
                    dataKey="totalUnits"
                    name="Stock units"
                    fill="url(#reportCategoryUnitsGradient)"
                    radius={[0, 7, 7, 0]}
                    maxBarSize={24}
                  >
                    <LabelList
                      dataKey="totalUnits"
                      position="right"
                      formatter={(value) => number.format(value)}
                      fill="#cbd5e1"
                      fontSize={10}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No categories or products to compare.</EmptyState>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Inventory Value by Category"
          description="Compare the cost value of available stock across categories."
        >
          {chartCategoryValues.length ? (
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <ResponsiveContainer
                width="100%"
                height={Math.max(260, chartCategoryValues.length * 36)}
              >
                <BarChart
                  data={chartCategoryValues}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="reportCategoryValueGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#334155"
                    strokeOpacity={0.7}
                    strokeDasharray="3 5"
                    horizontal={false}
                    vertical
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => compactCurrency.format(value)}
                    tickCount={5}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value.length > 17 ? `${value.slice(0, 16)}…` : value
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const category = payload[0].payload

                      return (
                        <div className="min-w-48 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
                          <p className="mb-2 border-b border-slate-700 pb-2 text-sm font-semibold text-white">
                            {label}
                          </p>
                          <p className="text-xs text-slate-400">Inventory value</p>
                          <p className="mt-1 text-sm font-semibold text-emerald-300">
                            {currency.format(category.inventoryValue || 0)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {number.format(category.totalUnits || 0)} units ·{' '}
                            {number.format(category.productCount || 0)} products
                          </p>
                        </div>
                      )
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Bar
                    dataKey="inventoryValue"
                    name="Inventory value"
                    fill="url(#reportCategoryValueGradient)"
                    radius={[0, 7, 7, 0]}
                    maxBarSize={24}
                  >
                    <LabelList
                      dataKey="inventoryValue"
                      position="right"
                      formatter={(value) => compactCurrency.format(value)}
                      fill="#cbd5e1"
                      fontSize={10}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No category value data is available yet.</EmptyState>
          )}
        </Section>

        <Section
          title="Products by Category"
          description="See how many active products are assigned to each category."
        >
          {chartCategoryProducts.length ? (
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <ResponsiveContainer
                width="100%"
                height={Math.max(260, chartCategoryProducts.length * 36)}
              >
                <BarChart
                  data={chartCategoryProducts}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="reportCategoryProductsGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#334155"
                    strokeOpacity={0.7}
                    strokeDasharray="3 5"
                    horizontal={false}
                    vertical
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => compactNumber.format(value)}
                    tickCount={5}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value.length > 17 ? `${value.slice(0, 16)}…` : value
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const category = payload[0].payload

                      return (
                        <div className="min-w-48 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
                          <p className="mb-2 border-b border-slate-700 pb-2 text-sm font-semibold text-white">
                            {label}
                          </p>
                          <p className="text-xs text-slate-400">Products</p>
                          <p className="mt-1 text-sm font-semibold text-violet-300">
                            {number.format(category.productCount || 0)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {number.format(category.totalUnits || 0)} units ·{' '}
                            {currency.format(category.inventoryValue || 0)}
                          </p>
                        </div>
                      )
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Bar
                    dataKey="productCount"
                    name="Products"
                    fill="url(#reportCategoryProductsGradient)"
                    radius={[0, 7, 7, 0]}
                    maxBarSize={24}
                  >
                    <LabelList
                      dataKey="productCount"
                      position="right"
                      formatter={(value) => number.format(value)}
                      fill="#cbd5e1"
                      fontSize={10}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No category product data is available yet.</EmptyState>
          )}
        </Section>
      </div>

      <Section
        title="Category Breakdown"
        description="Product counts and inventory value for each category."
      >
        {categoryBreakdown.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Products</th>
                    <th className="px-4 py-3 font-medium">Units</th>
                    <th className="px-4 py-3 font-medium">Inventory Value</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCategories.map((category) => (
                    <tr key={category.name} className="border-t border-white/5">
                      <td className="px-4 py-4 font-medium text-white">
                        {category.name}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {number.format(category.productCount)}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {number.format(category.totalUnits)}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {currency.format(category.inventoryValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={categoryPage}
              total={categoryBreakdown.length}
              onPageChange={setCategoryPage}
            />
          </>
        ) : (
          <EmptyState>No category data is available yet.</EmptyState>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Low Stock Products"
          description="Products with a positive quantity at or below their reorder level."
        >
          {lowStockProducts.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Available</th>
                      <th className="px-4 py-3 font-medium">Reorder At</th>
                    </tr>
                  </thead>
                  <tbody>{productRows(visibleLowStockProducts)}</tbody>
                </table>
              </div>
              <TablePagination
                page={lowStockPage}
                total={lowStockProducts.length}
                onPageChange={setLowStockPage}
              />
            </>
          ) : (
            <EmptyState>Nice! No low-stock products found.</EmptyState>
          )}
        </Section>

        <Section
          title="Out of Stock Products"
          description="Products that currently have zero units available."
        >
          {outOfStockProducts.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Available</th>
                      <th className="px-4 py-3 font-medium">Reorder At</th>
                    </tr>
                  </thead>
                  <tbody>{productRows(visibleOutOfStockProducts)}</tbody>
                </table>
              </div>
              <TablePagination
                page={outOfStockPage}
                total={outOfStockProducts.length}
                onPageChange={setOutOfStockPage}
              />
            </>
          ) : (
            <EmptyState>No out-of-stock products found.</EmptyState>
          )}
        </Section>
      </div>
    </div>
  )
}

export default Reports
