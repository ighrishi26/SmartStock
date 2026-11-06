
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  RefreshCw,
  Search,
} from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500'

const formatDate = (date) =>
  new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

function StockAdjustments() {
  const { preferences } = usePreferences()
  const [products, setProducts] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  const [form, setForm] = useState({
    productId: '',
    adjustmentQuantity: '',
    reason: '',
    notes: '',
  })

  const selectedProduct = products.find(
    (product) => product._id === form.productId
  )

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [productResponse, adjustmentResponse] = await Promise.all([
        axios.get(`${API_URL}/products?page=1&limit=100`, {
          withCredentials: true,
        }),
        axios.get(
          `${API_URL}/stock-adjustments?page=${page}&limit=10&search=${encodeURIComponent(search.trim())}`,
          { withCredentials: true }
        ),
      ])

      setProducts(productResponse.data.products || [])

      setAdjustments(adjustmentResponse.data.adjustments || [])
      setTotalPages(adjustmentResponse.data.pagination?.pages || 1)
      setTotalRecords(adjustmentResponse.data.pagination?.total || 0)
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to load stock adjustments.'
      )
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const amount = Number(form.adjustmentQuantity)

    if (!form.productId) {
      toast.error('Please select a product.')
      return
    }

    if (!Number.isInteger(amount) || amount === 0) {
      toast.error('Enter a non-zero whole number.')
      return
    }

    if (!form.reason.trim()) {
      toast.error('Please enter a reason.')
      return
    }

    if (
      selectedProduct &&
      selectedProduct.quantity + amount < 0
    ) {
      toast.error('The adjustment cannot make stock negative.')
      return
    }

        if (preferences.confirmStockChanges) {
      const currentQuantity = Number(selectedProduct?.quantity ?? 0)
      const newQuantity = currentQuantity + amount
      const action = amount > 0 ? 'add' : 'remove'

      const confirmed = window.confirm(
        `Confirm stock adjustment?\n\nProduct: ${selectedProduct?.name}\nCurrent quantity: ${currentQuantity}\nChange: ${amount > 0 ? '+' : ''}${amount}\nNew quantity: ${newQuantity}\nAction: ${action} stock\nReason: ${form.reason}`,
      )

      if (!confirmed) return
    }

    setSaving(true)

    try {
      await axios.post(
        `${API_URL}/stock-adjustments`,
        {
          ...form,
          adjustmentQuantity: amount,
        },
        { withCredentials: true }
      )

      toast.success('Stock adjustment recorded successfully!')

      setForm({
        productId: '',
        adjustmentQuantity: '',
        reason: '',
        notes: '',
      })

      setPage(1)
      await loadData()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not save the adjustment.'
      )
    } finally {
      setSaving(false)
    }
  }

  const filteredAdjustments = adjustments

  const positiveCount = adjustments.filter(
    (item) => item.adjustmentQuantity > 0
  ).length

  const negativeCount = adjustments.filter(
    (item) => item.adjustmentQuantity < 0
  ).length

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            INVENTORY CONTROL
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Stock Adjustments
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Correct inventory quantities and maintain an audit trail.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium transition hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3 text-slate-400">
            <ClipboardList size={20} />
            <span className="text-sm">Records on this page</span>
          </div>
          <p className="mt-3 text-3xl font-bold">{adjustments.length}</p>
        </div>

        <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-5">
          <div className="flex items-center gap-3 text-emerald-400">
            <ArrowUpRight size={20} />
            <span className="text-sm">Stock increases</span>
          </div>
          <p className="mt-3 text-3xl font-bold">{positiveCount}</p>
        </div>

        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-5">
          <div className="flex items-center gap-3 text-rose-400">
            <ArrowDownRight size={20} />
            <span className="text-sm">Stock decreases</span>
          </div>
          <p className="mt-3 text-3xl font-bold">{negativeCount}</p>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Record an adjustment</h2>
          <p className="mt-1 text-sm text-slate-400">
            Use a positive number to add stock and a negative number to remove it.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Product
              </label>
              <select
                required
                value={form.productId}
                onChange={(event) =>
                  setForm({ ...form, productId: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Current quantity</p>
                <p className="mt-1 text-2xl font-bold">
                  {selectedProduct.quantity}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    {selectedProduct.unit || 'units'}
                  </span>
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  SKU: {selectedProduct.sku}
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Adjustment quantity
              </label>
              <input
                required
                type="number"
                step="1"
                value={form.adjustmentQuantity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    adjustmentQuantity: event.target.value,
                  })
                }
                placeholder="Example: -2 or 5"
                className={inputClass}
              />
              <p className="mt-2 text-xs text-slate-500">
                Example: -2 removes two units; 5 adds five units.
              </p>
            </div>

            {selectedProduct && form.adjustmentQuantity !== '' && (
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-400">New quantity preview</p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    selectedProduct.quantity + Number(form.adjustmentQuantity) < 0
                      ? 'text-rose-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {selectedProduct.quantity + Number(form.adjustmentQuantity)}{' '}
                  {selectedProduct.unit || 'units'}
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Reason
              </label>
              <select
                required
                value={form.reason}
                onChange={(event) =>
                  setForm({ ...form, reason: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Select a reason</option>
                <option value="Physical stock count correction">
                  Physical stock count correction
                </option>
                <option value="Damaged goods">Damaged goods</option>
                <option value="Lost or missing items">Lost or missing items</option>
                <option value="Data entry correction">Data entry correction</option>
                <option value="Opening stock correction">
                  Opening stock correction
                </option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Notes (optional)
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Add extra details..."
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={saving || loading}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving adjustment...' : 'Save adjustment'}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Adjustment history</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review previous inventory corrections.
              </p>
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search records..."
                className={`${inputClass} pl-9 sm:w-56`}
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Loading adjustment history...
            </div>
          ) : filteredAdjustments.length === 0 ? (
            <div className="py-16 text-center">
              <AlertTriangle className="mx-auto text-slate-500" size={30} />
              <p className="mt-3 font-medium">No adjustments found</p>
              <p className="mt-1 text-sm text-slate-400">
                Save an adjustment or try another search.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Before</th>
                    <th className="px-3 py-3">Change</th>
                    <th className="px-3 py-3">After</th>
                    <th className="px-3 py-3">Reason</th>
                    <th className="px-3 py-3">Adjusted by</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdjustments.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-slate-800/70 last:border-0"
                    >
                      <td className="px-3 py-4">
                        <p className="font-medium">
                          {item.product?.name || 'Deleted product'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.product?.sku || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-4">{item.previousQuantity}</td>
                      <td
                        className={`px-3 py-4 font-semibold ${
                          item.adjustmentQuantity > 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.adjustmentQuantity > 0 ? '+' : ''}
                        {item.adjustmentQuantity}
                      </td>
                      <td className="px-3 py-4 font-medium">
                        {item.newQuantity}
                      </td>
                      <td className="px-3 py-4">{item.reason}</td>
                      <td className="px-3 py-4">
                        {item.adjustedBy?.name || item.adjustedBy?.email || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-400">
              {totalRecords === 0
                ? 'No adjustments'
                : `Showing ${(page - 1) * 10 + 1}–${Math.min(
                    page * 10,
                    totalRecords,
                  )} of ${totalRecords} adjustments · Page ${page} of ${totalPages}`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default StockAdjustments
