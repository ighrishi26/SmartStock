
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  RefreshCw,
  Search,
  LoaderCircle,
  Package,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

function formatDate(date) {
  if (!date) return '—'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
}

export default function Stock() {
  const { user } = useAuth()
  const canManage = ['admin', 'manager'].includes(user?.role)

  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('stock_in')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [productResponse, movementResponse] = await Promise.all([
        api.get('/products?page=1&limit=100'),
        api.get('/stock-movements', {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            search: search.trim() || undefined,
          },
        }),
      ])

      const loadedProducts = productResponse.data.products || []
      setProducts(loadedProducts)
      setMovements(movementResponse.data.movements || [])
      setPagination((current) => ({
        ...current,
        ...(movementResponse.data.pagination || {}),
      }))
      setProductId((current) =>
        loadedProducts.some((product) => product._id === current)
          ? current
          : loadedProducts[0]?._id || '',
      )
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not load stock information',
      )
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, pagination.page, search])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  function refreshData() {
    setLoading(true)
    loadData()
  }

  const selectedProduct = products.find(
    (product) => product._id === productId,
  )

  async function submitMovement(event) {
    event.preventDefault()

    if (!canManage) {
      toast.error('You do not have permission to record stock movements')
      return
    }
    
    const amount = Number(quantity)

    if (!productId) {
      toast.error('Select a product first')
      return
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error('Quantity must be a positive whole number')
      return
    }

    if (
      type === 'stock_out' &&
      selectedProduct &&
      amount > selectedProduct.quantity
    ) {
      toast.error(
        `Only ${selectedProduct.quantity} ${selectedProduct.unit || 'units'} are available`,
      )
      return
    }

    setSaving(true)
    try {
      await api.post(`/stock-movements/product/${productId}`, {
        type,
        quantity: amount,
        note: note.trim(),
      })

      toast.success(
        type === 'stock_in'
          ? 'Stock received successfully'
          : 'Stock issued successfully',
      )
      setQuantity('1')
      setNote('')
      await loadData()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not record stock movement',
      )
    } finally {
      setSaving(false)
    }
  }

  const filteredMovements = movements

  const stockInCount = movements.filter(
    (movement) => movement.type === 'stock_in',
  ).length
  const stockOutCount = movements.filter(
    (movement) => movement.type === 'stock_out',
  ).length

  return (
    <main className="min-h-screen rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.14),_transparent_26%),linear-gradient(180deg,#0b1220_0%,#0f172a_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Inventory operations
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Stock movements
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Record incoming and outgoing stock and review transaction history.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.3)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Products loaded</p>
              <Package size={19} className="text-blue-300" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {products.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.3)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Stock-in on this page</p>
              <ArrowDownToLine size={19} className="text-emerald-300" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {stockInCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.3)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Stock-out on this page</p>
              <ArrowUpFromLine size={19} className="text-amber-300" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {stockOutCount}
            </p>
          </div>
        </div>

        {canManage ? (
          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_22px_50px_rgba(2,8,23,0.3)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-200 ring-1 ring-blue-400/20">
                <ArrowLeftRight size={21} />
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  Record a stock movement
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose a product, movement type and quantity.
                </p>
              </div>
            </div>

            <form onSubmit={submitMovement} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Movement type
                </span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className={inputClass}
                >
                  <option value="stock_in">Stock In — receive goods</option>
                  <option value="stock_out">Stock Out — issue goods</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Product
                </span>
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <span className="mt-1.5 block text-xs text-slate-400">
                    Available: {selectedProduct.quantity} {selectedProduct.unit || 'pcs'}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Quantity
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Note (optional)
                </span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  className={inputClass}
                  placeholder="e.g. Supplier delivery"
                />
              </label>

              <div className="md:col-span-2 xl:col-span-4">
                <button
                  type="submit"
                  disabled={saving || loading || !products.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : type === 'stock_in' ? (
                    <ArrowDownToLine size={17} />
                  ) : (
                    <ArrowUpFromLine size={17} />
                  )}
                  {saving
                    ? 'Saving transaction...'
                    : type === 'stock_in'
                      ? 'Receive stock'
                      : 'Issue stock'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            Your role can view stock history but cannot record stock movements.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_22px_50px_rgba(2,8,23,0.3)]">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">Transaction history</h2>
              <p className="mt-1 text-xs text-slate-400">
                Showing 10 records per page, newest first.
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPagination((current) => ({ ...current, page: 1 }))
                }}
                placeholder="Search product or note..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-400">
              <LoaderCircle size={20} className="animate-spin" />
              Loading movement history...
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="p-14 text-center">
              <History size={36} className="mx-auto text-slate-500" />
              <h3 className="mt-3 font-semibold text-slate-200">
                No stock movements found
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Transactions will appear here after stock is received or issued.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Product</th>
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Quantity</th>
                    <th className="px-5 py-4 font-semibold">Stock change</th>
                    <th className="px-5 py-4 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredMovements.map((movement) => {
                    const isIn = movement.type === 'stock_in'
                    const product =
                      typeof movement.product === 'object'
                        ? movement.product
                        : null

                    return (
                      <tr key={movement._id} className="transition hover:bg-slate-800/60">
                        <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                          {formatDate(movement.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-100">
                            {product?.name || 'Product'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {product?.sku || ''}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isIn
                              ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20'
                              : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20'
                          }`}>
                            {isIn ? <ArrowDownToLine size={13} /> : <ArrowUpFromLine size={13} />}
                            {isIn ? 'Stock In' : movement.type === 'stock_out' ? 'Stock Out' : movement.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-100">
                          {movement.quantity}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {movement.previousQuantity ?? '—'} → {movement.newQuantity ?? '—'}
                        </td>
                        <td className="max-w-xs px-5 py-4 text-slate-400">
                          {movement.note || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              {pagination.total === 0
                ? 'No stock movements'
                : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )} of ${pagination.total} movements`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((current) => ({
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
                Page {pagination.page} of {Math.max(1, pagination.pages)}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() =>
                  setPagination((current) => ({
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
      </div>
    </main>
  )
}
