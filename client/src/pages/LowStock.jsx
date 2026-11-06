
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  Package,
  RefreshCw,
  Search,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const number = new Intl.NumberFormat('en-IN')

function SummaryCard({ title, value, description, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{number.format(value)}</p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function LowStock() {
  const [activeFilter, setActiveFilter] = useState('low')
  const [search, setSearch] = useState('')
  const [lowProducts, setLowProducts] = useState([])
  const [outProducts, setOutProducts] = useState([])
  const [lowTotal, setLowTotal] = useState(0)
  const [outTotal, setOutTotal] = useState(0)
  const [lowPages, setLowPages] = useState(1)
  const [outPages, setOutPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [lowResponse, outResponse] = await Promise.all([
        axios.get(`${API_URL}/products`, {
          params: { page, limit: 10, stock: 'low', search: search.trim() || undefined },
          withCredentials: true,
        }),
        axios.get(`${API_URL}/products`, {
          params: { page, limit: 10, stock: 'out', search: search.trim() || undefined },
          withCredentials: true,
        }),
      ])

      setLowProducts(lowResponse.data.products || [])
      setOutProducts(outResponse.data.products || [])
      setLowTotal(lowResponse.data.pagination?.total ?? lowResponse.data.products?.length ?? 0)
      setOutTotal(outResponse.data.pagination?.total ?? outResponse.data.products?.length ?? 0)
      setLowPages(lowResponse.data.pagination?.pages || 1)
      setOutPages(outResponse.data.pagination?.pages || 1)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not load stock alerts. Please check your connection and sign in again.'
      )
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadAlerts()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadAlerts])

  const products = activeFilter === 'low' ? lowProducts : outProducts
  const total = activeFilter === 'low' ? lowTotal : outTotal
  const totalPages = activeFilter === 'low' ? lowPages : outPages
  const filteredProducts = products

  const downloadCsv = async () => {
    setExporting(true)
    try {
      const exportProducts = []
      let currentPage = 1
      let pages = 1

      do {
        const response = await axios.get(`${API_URL}/products`, {
          params: {
            page: currentPage,
            limit: 100,
            stock: activeFilter,
            search: search.trim() || undefined,
          },
          withCredentials: true,
        })

        exportProducts.push(...(response.data.products || []))
        pages = response.data.pagination?.pages || 1
        currentPage += 1
      } while (currentPage <= pages)

      const rows = [
        ['Product', 'SKU', 'Category', 'Quantity', 'Reorder Level', 'Location', 'Status'],
        ...exportProducts.map((product) => [
          product.name,
          product.sku,
          product.category?.name || 'Uncategorized',
          product.quantity ?? 0,
          product.reorderLevel ?? 0,
          product.location || '',
          Number(product.quantity) === 0 ? 'Out of Stock' : 'Low Stock',
        ]),
      ]

      const csv = rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\r\n')

      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `smartstock-${activeFilter}-stock-alerts.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not export stock alerts.',
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-amber-300">
            <AlertTriangle size={17} />
            Inventory monitoring
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Low Stock Alerts
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Find products that need restocking before they run out.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={downloadCsv}
            disabled={loading || exporting || total === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            <ArrowDownToLine size={16} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Low Stock"
          value={lowTotal}
          description="At or below reorder level, excluding zero stock"
          icon={AlertTriangle}
          tone="bg-amber-400/10 text-amber-300"
        />
        <SummaryCard
          title="Out of Stock"
          value={outTotal}
          description="Products with no units remaining"
          icon={XCircle}
          tone="bg-rose-400/10 text-rose-300"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveFilter('low')
                setPage(1)
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                activeFilter === 'low'
                  ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Low Stock ({number.format(lowTotal)})
            </button>
            <button
              onClick={() => {
                setActiveFilter('out')
                setPage(1)
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                activeFilter === 'out'
                  ? 'bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Out of Stock ({number.format(outTotal)})
            </button>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search name, SKU, category..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-300">
            <p>{error}</p>
            <button onClick={loadAlerts} className="mt-2 underline">
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-400">
            <RefreshCw size={19} className="animate-spin" />
            Loading stock alerts...
          </div>
        ) : !error && filteredProducts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <CheckCircle2 size={42} className="text-emerald-400" />
            <h2 className="mt-4 font-semibold text-white">
              {search
                ? 'No matching products'
                : activeFilter === 'low'
                  ? 'No low-stock products'
                  : 'No out-of-stock products'}
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {search
                ? 'Try a different product name, SKU, category, or location.'
                : 'There are no products in this alert category right now.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 text-sm text-indigo-300 hover:text-indigo-200"
              >
                Clear search
              </button>
            )}
          </div>
        ) : !error ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="rounded-l-lg px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Reorder Level</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="rounded-r-lg px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const outOfStock = Number(product.quantity) === 0

                  return (
                    <tr
                      key={product._id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-slate-800 p-2 text-slate-300">
                            <Package size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-white">{product.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              SKU: {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {product.category?.name || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-semibold ${outOfStock ? 'text-rose-300' : 'text-amber-300'}`}>
                          {number.format(product.quantity ?? 0)} {product.unit || 'units'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {number.format(product.reorderLevel ?? 0)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            outOfStock
                              ? 'bg-rose-400/10 text-rose-300'
                              : 'bg-amber-400/10 text-amber-300'
                          }`}
                        >
                          {outOfStock ? <XCircle size={13} /> : <AlertTriangle size={13} />}
                          {outOfStock ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to="/products"
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:border-indigo-400/40 hover:bg-indigo-400/10"
                        >
                          Manage <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-slate-500">
              Showing {number.format((page - 1) * 10 + 1)}–
              {number.format(Math.min(page * 10, total))} of{' '}
              {number.format(total)} products in this category.
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs text-slate-400">
              Page {page} of {Math.max(1, totalPages)}
              </span>
              <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default LowStock
