
import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react'
import api from '../lib/api'

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const statuses = [
  'Draft',
  'Confirmed',
  'Partially Fulfilled',
  'Fulfilled',
  'Cancelled',
]

const statusStyles = {
  Draft: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  Confirmed: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  'Partially Fulfilled': 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  Fulfilled: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  Cancelled: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
}

const emptyItem = () => ({
  productId: '',
  quantity: '1',
})

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.message ||
    error.message ||
    'Something went wrong. Please try again.'
  )
}

export default function SalesOrders() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [referenceLoading, setReferenceLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewingOrder, setViewingOrder] = useState(null)
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [notes, setNotes] = useState('')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/sales-orders', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        },
      })

      setOrders(response.data.orders || [])
      setPagination(
        response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        }
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  const loadReferenceData = useCallback(async () => {
    setReferenceLoading(true)

    try {
      const [customerResponse, productResponse] = await Promise.all([
        api.get('/customers', {
          params: { page: 1, limit: 100, status: 'active' },
        }),
        api.get('/products', {
          params: { page: 1, limit: 100 },
        }),
      ])

      setCustomers(
        (customerResponse.data.customers || []).filter(
          (customer) => customer.isActive !== false
        )
      )

      setProducts(
        (productResponse.data.products || []).filter(
          (product) => product.isActive !== false
        )
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setReferenceLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadOrders, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadOrders])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadReferenceData, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadReferenceData])

  const selectedItems = items
    .filter((item) => item.productId && Number(item.quantity) > 0)
    .map((item) => {
      const product = products.find(
        (entry) => entry._id === item.productId
      )

      return {
        ...item,
        product,
        quantityNumber: Number(item.quantity),
        lineTotal:
          (Number(product?.sellingPrice) || 0) * Number(item.quantity),
      }
    })

  const subtotal = selectedItems.reduce(
    (total, item) => total + item.lineTotal,
    0
  )

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    )
  }

  function resetForm() {
    setCustomerId('')
    setItems([emptyItem()])
    setNotes('')
    setShowCreate(false)
  }

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!customerId) {
      setError('Please select a customer.')
      return
    }

    if (selectedItems.length === 0) {
      setError('Add at least one product with a valid quantity.')
      return
    }

    for (const item of selectedItems) {
      if (!Number.isSafeInteger(item.quantityNumber) || item.quantityNumber < 1) {
        setError('Product quantities must be positive whole numbers.')
        return
      }

      if (item.quantityNumber > item.product.quantity) {
        setError(
          `Insufficient stock for ${item.product.name}. Available: ${item.product.quantity}.`
        )
        return
      }
    }

    setSaving(true)

    try {
      const response = await api.post('/sales-orders', {
        customerId,
        items: selectedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantityNumber,
        })),
        notes: notes.trim(),
      })

      resetForm()
      setPage(1)
      setSearch('')
      setStatusFilter('')
      setNotice(
        response.data.message || 'Draft sales order created successfully.'
      )
      await loadReferenceData()
      await loadOrders()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function runOrderAction(order, action) {
    const descriptions = {
      confirm: `Confirm ${order.orderNumber}? Stock will be checked again, but will not be deducted yet.`,
      fulfill: `Fulfill ${order.orderNumber}? This deducts the outstanding quantities from inventory.`,
      cancel: `Cancel ${order.orderNumber}? This does not change inventory.`,
    }

    if (!window.confirm(descriptions[action])) return

    setActionId(`${order._id}:${action}`)
    setError('')
    setNotice('')

    try {
      let response

      if (action === 'confirm') {
        response = await api.patch(
          `/sales-orders/${order._id}/confirm`
        )
      } else if (action === 'fulfill') {
        response = await api.post(
          `/sales-orders/${order._id}/fulfill`
        )
      } else {
        response = await api.patch(
          `/sales-orders/${order._id}/cancel`
        )
      }

      setNotice(response.data.message || 'Order updated successfully.')
      await loadOrders()

      if (action === 'fulfill') {
        await loadReferenceData()
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionId('')
    }
  }

  const draftCount = orders.filter((order) => order.status === 'Draft').length
  const confirmedCount = orders.filter(
    (order) => order.status === 'Confirmed'
  ).length
  const fulfilledCount = orders.filter(
    (order) => order.status === 'Fulfilled'
  ).length

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight">Sales Orders</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Create orders for existing customers and manage fulfillment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('')
            setNotice('')
            setShowCreate(true)
          }}
          disabled={referenceLoading || customers.length === 0 || products.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create Sales Order
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {referenceLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading customers and products…
        </div>
      )}

      {!referenceLoading && (customers.length === 0 || products.length === 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {customers.length === 0
            ? 'No active customers were found. Add a real customer before creating a sales order.'
            : 'No active products were found. Add a product before creating a sales order.'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Orders on This Page',
            value: orders.length,
            icon: ClipboardList,
            color: 'text-indigo-300',
          },
          {
            label: 'Draft Orders on This Page',
            value: draftCount,
            icon: Package,
            color: 'text-amber-300',
          },
          {
            label: 'Confirmed / Fulfilled on This Page',
            value: `${confirmedCount} / ${fulfilledCount}`,
            icon: CheckCircle2,
            color: 'text-emerald-300',
          },
        ].map((card) => {
          const Icon = card.icon

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{card.label}</p>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="mt-3 text-2xl font-bold">{card.value}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search order number or customer…"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              loadOrders()
              loadReferenceData()
            }}
            disabled={loading || referenceLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-4 font-semibold">Order</th>
                <th className="px-5 py-4 font-semibold">Customer</th>
                <th className="px-5 py-4 font-semibold">Items</th>
                <th className="px-5 py-4 font-semibold">Total</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Created</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />
                    Loading sales orders…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                    <p className="font-medium text-slate-300">No sales orders found</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Create an order using your actual customer and product records.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const busy = actionId.startsWith(`${order._id}:`)
                  const itemCount = (order.items || []).reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0
                  )

                  return (
                    <tr
                      key={order._id}
                      className="transition hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">
                          {order.orderNumber}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.items?.length || 0} product line(s)
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">
                          {order.customerName || order.customer?.name || '—'}
                        </p>
                        {order.customer?.company && (
                          <p className="mt-1 text-xs text-slate-500">
                            {order.customer.company}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {itemCount} unit(s)
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-100">
                        {currency(order.subtotal)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusStyles[order.status] || statusStyles.Draft}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingOrder(order)}
                            title={`View ${order.orderNumber}`}
                            aria-label={`View sales order ${order.orderNumber}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>

                          {order.status === 'Draft' && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => runOrderAction(order, 'confirm')}
                                className="rounded-lg border border-blue-500/30 px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => runOrderAction(order, 'cancel')}
                                className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {['Confirmed', 'Partially Fulfilled'].includes(order.status) && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => runOrderAction(order, 'fulfill')}
                                className="rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                              >
                                Fulfill
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => runOrderAction(order, 'cancel')}
                                className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {busy && (
                            <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-400">
            Showing {orders.length} of {pagination.total || 0} order(s)
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-slate-400">
              Page {pagination.page || page} of {Math.max(1, pagination.pages || 0)}
            </span>
            <button
              type="button"
              disabled={page >= pagination.pages || loading || !pagination.pages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-order-details-title"
            className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <h2
                  id="sales-order-details-title"
                  className="text-lg font-bold text-white"
                >
                  {viewingOrder.orderNumber}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Sales order details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                aria-label="Close sales order details"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <OrderDetail
                  label="Customer"
                  value={
                    viewingOrder.customerName ||
                    viewingOrder.customer?.name
                  }
                />
                <OrderDetail
                  label="Company"
                  value={viewingOrder.customer?.company}
                />
                <OrderDetail
                  label="Email"
                  value={viewingOrder.customer?.email}
                />
                <OrderDetail
                  label="Phone"
                  value={viewingOrder.customer?.phone}
                />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusStyles[viewingOrder.status] || statusStyles.Draft}`}
                  >
                    {viewingOrder.status}
                  </span>
                </div>
                <OrderDetail
                  label="Created"
                  value={
                    viewingOrder.createdAt
                      ? new Date(viewingOrder.createdAt).toLocaleString('en-IN')
                      : ''
                  }
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-200">
                  Order items
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Quantity</th>
                        <th className="px-4 py-3 font-medium">Fulfilled</th>
                        <th className="px-4 py-3 font-medium">Unit price</th>
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(viewingOrder.items || []).map((item) => (
                        <tr key={item._id || `${item.sku}-${item.productName}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-200">
                              {item.productName || item.product?.name || 'Product'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.sku || item.product?.sku || 'No SKU'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {item.fulfilledQuantity || 0}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {currency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-100">
                            {currency(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingOrder.notes && (
                <OrderDetail label="Notes" value={viewingOrder.notes} multiline />
              )}

              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <span className="text-sm font-medium text-slate-300">
                  Order total
                </span>
                <span className="text-lg font-bold text-white">
                  {currency(viewingOrder.subtotal)}
                </span>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) resetForm()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-order-title"
            className="my-4 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <h2 id="sales-order-title" className="text-lg font-bold">
                  Create Sales Order
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  New orders are saved as drafts. Stock is not deducted.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={resetForm}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="sales-customer"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Customer <span className="text-rose-400">*</span>
                </label>
                <select
                  id="sales-customer"
                  required
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Select an active customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                      {customer.company ? ` — ${customer.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Products</h3>
                  <button
                    type="button"
                    onClick={() => setItems((current) => [...current, emptyItem()])}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add product
                  </button>
                </div>

                {items.map((item, index) => {
                  const product = products.find(
                    (entry) => entry._id === item.productId
                  )

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-[minmax(0,1fr)_100px_120px_36px] sm:items-end"
                    >
                      <div>
                        <label
                          htmlFor={`sales-product-${index}`}
                          className="mb-1.5 block text-xs text-slate-400"
                        >
                          Product
                        </label>
                        <select
                          id={`sales-product-${index}`}
                          required
                          value={item.productId}
                          onChange={(event) =>
                            updateItem(index, 'productId', event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        >
                          <option value="">Select product</option>
                          {products.map((entry) => (
                            <option key={entry._id} value={entry._id}>
                              {entry.name} ({entry.sku}) — stock: {entry.quantity}
                            </option>
                          ))}
                        </select>
                        {product && (
                          <p className="mt-1.5 text-xs text-slate-500">
                            Unit price: {currency(product.sellingPrice)}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={`sales-quantity-${index}`}
                          className="mb-1.5 block text-xs text-slate-400"
                        >
                          Quantity
                        </label>
                        <input
                          id={`sales-quantity-${index}`}
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, 'quantity', event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs text-slate-400">Line total</p>
                        <p className="rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold">
                          {currency(
                            (Number(product?.sellingPrice) || 0) *
                              (Number(item.quantity) || 0)
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        aria-label={`Remove product row ${index + 1}`}
                        className="flex h-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div>
                <label
                  htmlFor="sales-notes"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Notes
                </label>
                <textarea
                  id="sales-notes"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional order notes"
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                <div>
                  <p className="text-sm text-slate-400">Order subtotal</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Based on current product selling prices
                  </p>
                </div>
                <p className="text-xl font-bold text-white">{currency(subtotal)}</p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={resetForm}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving || referenceLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {saving ? 'Creating…' : 'Create Draft Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderDetail({ label, value, multiline = false }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm text-slate-200 ${
          multiline ? 'whitespace-pre-wrap break-words' : 'break-all'
        }`}
      >
        {value || 'Not provided'}
      </p>
    </div>
  )
}
