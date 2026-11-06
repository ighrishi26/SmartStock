
import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import api from '../lib/api'

const STATUSES = ['Pending', 'Approved', 'Rejected', 'Completed']

const statusStyles = {
  Pending: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
  Approved: 'bg-blue-500/10 text-blue-300 ring-blue-500/20',
  Rejected: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
}

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

function SalesReturns() {
  const [returns, setReturns] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  })
  const [showCreate, setShowCreate] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedItems, setSelectedItems] = useState({})
  const [detail, setDetail] = useState(null)

  const loadReturns = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/sales-returns', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        },
      })

      setReturns(response.data.salesReturns || [])
      setPagination(
        response.data.pagination || { page: 1, pages: 1, total: 0 }
      )
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load sales returns.'
      )
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  const loadOrders = useCallback(async () => {
    try {
      const response = await api.get('/sales-orders', {
        params: { page: 1, limit: 100 },
      })

      const data = response.data.salesOrders || response.data.orders || []
      setOrders(
        data.filter((order) =>
          ['Fulfilled', 'Partially Fulfilled'].includes(order.status)
        )
      )
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load fulfilled sales orders.'
      )
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadReturns()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [loadReturns])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [loadOrders])

  const selectedOrder = orders.find((order) => order._id === orderId)

  const updateItemQuantity = (productId, value) => {
    setSelectedItems((current) => ({
      ...current,
      [productId]: value,
    }))
  }

  const resetForm = () => {
    setOrderId('')
    setReason('')
    setNotes('')
    setSelectedItems({})
  }

  const createReturn = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!orderId || !reason.trim()) {
      setError('Choose a fulfilled order and enter a return reason.')
      return
    }

    const items = Object.entries(selectedItems)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity: Number(quantity),
      }))

    if (!items.length) {
      setError('Enter a return quantity for at least one product.')
      return
    }

    setSaving(true)

    try {
      await api.post('/sales-returns', {
        salesOrderId: orderId,
        items,
        reason: reason.trim(),
        notes: notes.trim(),
      })

      setSuccess('Return created and awaiting review.')
      setShowCreate(false)
      resetForm()
      setPage(1)
      await loadOrders()
      await loadReturns()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create return.')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (item, action) => {
    const prompts = {
      approve: `Approve return ${item.returnNumber}?`,
      reject: `Reject return ${item.returnNumber}?`,
      complete: `Complete return ${item.returnNumber} and restore its products to stock?`,
    }

    if (!window.confirm(prompts[action])) return

    setError('')
    setSuccess('')

    try {
      if (action === 'complete') {
        await api.post(`/sales-returns/${item._id}/complete`)
      } else {
        await api.patch(`/sales-returns/${item._id}/${action}`)
      }

      setSuccess(
        action === 'complete'
          ? 'Return completed and stock restored.'
          : `Return ${action}d successfully.`
      )

      await loadReturns()
    } catch (err) {
      setError(
        err.response?.data?.message || `Unable to ${action} this return.`
      )
    }
  }

  const openDetails = async (item) => {
    try {
      const response = await api.get(`/sales-returns/${item._id}`)
      setDetail(response.data.salesReturn)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load return details.')
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400'
  const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Returns</h1>
          <p className="mt-1 text-sm text-slate-400">
            Review product returns and manage stock restoration.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              loadReturns()
              loadOrders()
            }}
            className={`${buttonClass} border border-slate-700 bg-slate-900 hover:bg-slate-800`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => {
              setError('')
              setSuccess('')
              setShowCreate(true)
            }}
            className={`${buttonClass} bg-indigo-500 text-white hover:bg-indigo-400`}
          >
            <Plus size={16} />
            New Return
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(statusFilter === status ? '' : status)
              setPage(1)
            }}
            className={`rounded-2xl border p-4 text-left transition ${
              statusFilter === status
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <p className="text-sm text-slate-400">{status}</p>
            <p className="mt-2 text-2xl font-semibold">
              {statusFilter === status ? pagination.total : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {statusFilter === status ? 'Filtered results' : 'Click to filter'}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search return, order, or customer..."
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
          className={`${inputClass} sm:max-w-56`}
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <ClipboardList size={18} className="text-indigo-300" />
          <h2 className="font-semibold">Return Register</h2>
          <span className="ml-auto text-sm text-slate-400">
            {pagination.total} records
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-slate-400">
            <LoaderCircle size={20} className="animate-spin" />
            Loading returns...
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center">
            <PackageCheck size={32} className="mx-auto text-slate-600" />
            <p className="mt-3 font-medium">No sales returns found</p>
            <p className="mt-1 text-sm text-slate-400">
              Returns will appear here when created from a real fulfilled order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">Return</th>
                  <th className="px-5 py-3">Sales order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {returns.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openDetails(item)}
                        className="font-medium text-indigo-300 hover:text-indigo-200"
                      >
                        {item.returnNumber}
                      </button>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </td>
                    <td className="px-5 py-4">{item.orderNumber}</td>
                    <td className="px-5 py-4">{item.customerName}</td>
                    <td className="px-5 py-4 font-medium">
                      {money(item.totalAmount)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ring-1 ${statusStyles[item.status] || ''}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => runAction(item, 'approve')}
                              className={`${buttonClass} bg-blue-500/10 text-blue-300 hover:bg-blue-500/20`}
                            >
                              <CheckCircle2 size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => runAction(item, 'reject')}
                              className={`${buttonClass} bg-rose-500/10 text-rose-300 hover:bg-rose-500/20`}
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </>
                        )}
                        {item.status === 'Approved' && (
                          <button
                            onClick={() => runAction(item, 'complete')}
                            className={`${buttonClass} bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20`}
                          >
                            <PackageCheck size={14} />
                            Complete
                          </button>
                        )}
                        {['Completed', 'Rejected'].includes(item.status) && (
                          <span className="text-xs text-slate-500">
                            No actions
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-400">
            Page {pagination.page || page} of {Math.max(1, pagination.pages || 1)}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className={`${buttonClass} border border-slate-700`}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              disabled={page >= (pagination.pages || 1) || loading}
              onClick={() => setPage((current) => current + 1)}
              className={`${buttonClass} border border-slate-700`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Create Sales Return</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select a fulfilled order and its returned items.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false)
                  resetForm()
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createReturn} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Fulfilled sales order
                </label>
                <select
                  value={orderId}
                  onChange={(event) => {
                    setOrderId(event.target.value)
                    setSelectedItems({})
                  }}
                  required
                  className={inputClass}
                >
                  <option value="">Select an order</option>
                  {orders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.orderNumber} — {order.customerName} ({order.status})
                    </option>
                  ))}
                </select>
                {orders.length === 0 && (
                  <p className="mt-2 text-xs text-amber-300">
                    No fulfilled sales orders are currently available.
                  </p>
                )}
              </div>

              {selectedOrder && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-200">
                    Choose products and quantities
                  </p>
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item._id || item.product}
                      className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-800 p-3 sm:grid-cols-[1fr_110px]"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.productName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          SKU: {item.sku} · Fulfilled: {item.fulfilledQuantity || 0}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Unit price: {money(item.unitPrice)}
                        </p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={item.fulfilledQuantity || 0}
                        step="1"
                        value={selectedItems[item.product] || ''}
                        onChange={(event) =>
                          updateItemQuantity(item.product, event.target.value)
                        }
                        placeholder="Qty"
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Return reason
                </label>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  maxLength={500}
                  placeholder="Enter the actual reason for the return"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  className={inputClass}
                  placeholder="Additional details"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false)
                    resetForm()
                  }}
                  className={`${buttonClass} border border-slate-700`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !orders.length}
                  className={`${buttonClass} bg-indigo-500 text-white hover:bg-indigo-400`}
                >
                  {saving && <LoaderCircle size={16} className="animate-spin" />}
                  Create Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{detail.returnNumber}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Order: {detail.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm text-slate-300">
                Customer: {detail.customerName}
              </p>
              <p className="text-sm text-slate-300">
                Reason: {detail.reason}
              </p>
              <p className="text-sm text-slate-300">
                Status: {detail.status}
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {detail.items.map((item) => (
                      <tr key={item._id}>
                        <td className="p-3">
                          {item.productName}
                          <p className="text-xs text-slate-500">{item.sku}</p>
                        </td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3">{money(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between border-t border-slate-800 pt-4 font-semibold">
                <span>Return total</span>
                <span>{money(detail.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesReturns
