import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

const statusStyles = {
  Ordered: 'border-blue-400/20 bg-blue-500/10 text-blue-300',
  'Partially Received':
    'border-amber-400/20 bg-amber-500/10 text-amber-300',
  Received: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  Draft: 'border-slate-400/20 bg-slate-500/10 text-slate-300',
  Cancelled: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
}

const formatDate = (date) => {
  if (!date) return '—'

  const parsedDate = new Date(date)

  return Number.isNaN(parsedDate.getTime())
    ? '—'
    : parsedDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
        statusStyles[status] || statusStyles.Draft
      }`}
    >
      {status}
    </span>
  )
}

function GoodsReceived() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Pending')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [quantities, setQuantities] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const loadOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const status =
        filter === 'Pending'
          ? 'Ordered'
          : filter === 'Partial'
            ? 'Partially Received'
            : filter === 'Received'
              ? 'Received'
              : 'all'
      const response = await api.get('/purchase-orders', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status,
        },
      })

      setOrders(response.data.orders || [])
      setPagination(
        response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      )
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to load purchase orders. Please try again.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter, page, search])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => loadOrders(), 300)
    return () => window.clearTimeout(timeoutId)
  }, [loadOrders])

  const filteredOrders = orders

  const summary = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === 'Ordered').length,
      partial: orders.filter(
        (order) => order.status === 'Partially Received'
      ).length,
      received: orders.filter((order) => order.status === 'Received').length,
    }),
    [orders]
  )

  const openReceiving = (order) => {
    setSelectedOrder(order)

    const initialQuantities = {}

    for (const item of order.items || []) {
      const outstanding = item.quantity - (item.receivedQuantity || 0)
      initialQuantities[item._id] = outstanding > 0 ? String(outstanding) : ''
    }

    setQuantities(initialQuantities)
  }

  const closeReceiving = () => {
    if (submitting) return

    setSelectedOrder(null)
    setQuantities({})
  }

  const handleQuantityChange = (itemId, value, outstanding) => {
    if (value !== '' && !/^\d+$/.test(value)) return

    if (value !== '' && Number(value) > outstanding) {
      toast.error(`Only ${outstanding} units remain outstanding`)
      return
    }

    setQuantities((current) => ({ ...current, [itemId]: value }))
  }

  const handleReceive = async (event) => {
    event.preventDefault()

    if (!selectedOrder) return

    const items = (selectedOrder.items || [])
      .map((item) => ({
        itemId: item._id,
        quantity: Number(quantities[item._id] || 0),
      }))
      .filter((item) => item.quantity > 0)

    if (items.length === 0) {
      toast.error('Enter at least one quantity to receive')
      return
    }

    const invalidItem = items.find((receivedItem) => {
      const orderItem = selectedOrder.items.find(
        (item) => item._id === receivedItem.itemId
      )

      return (
        !Number.isSafeInteger(receivedItem.quantity) ||
        receivedItem.quantity < 1 ||
        receivedItem.quantity >
          orderItem.quantity - (orderItem.receivedQuantity || 0)
      )
    })

    if (invalidItem) {
      toast.error('Check the quantities entered and try again')
      return
    }

    setSubmitting(true)

    try {
      const response = await api.post(
        `/purchase-orders/${selectedOrder._id}/receive`,
        { items }
      )

      toast.success(response.data.message || 'Goods received successfully')
      setSelectedOrder(null)
      setQuantities({})
      await loadOrders(true)
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to receive goods. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const getSupplierName = (order) =>
    typeof order.supplier === 'object'
      ? order.supplier?.name || order.supplierName || 'Unknown supplier'
      : order.supplierName || 'Unknown supplier'

  const outstandingUnits = (order) =>
    (order.items || []).reduce(
      (total, item) =>
        total + Math.max(0, item.quantity - (item.receivedQuantity || 0)),
      0
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <Truck size={16} />
            Operations
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Goods Received</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Goods Received
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Record supplier deliveries and update inventory through purchase
            orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadOrders(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-blue-400/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-blue-400/15 bg-slate-900/70 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Awaiting delivery</span>
            <span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300">
              <Truck size={20} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            {loading ? '—' : summary.pending}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Orders ready for receiving on this page
          </p>
        </div>

        <div className="rounded-2xl border border-amber-400/15 bg-slate-900/70 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Partially received</span>
            <span className="rounded-xl bg-amber-500/15 p-2.5 text-amber-300">
              <PackageCheck size={20} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            {loading ? '—' : summary.partial}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Orders with outstanding items on this page
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-400/15 bg-slate-900/70 p-5 shadow-lg shadow-black/10 sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Fully received</span>
            <span className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300">
              <CheckCircle2 size={20} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            {loading ? '—' : summary.received}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Completed orders on this page
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
        <div className="border-b border-slate-800 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-semibold text-white">Delivery register</h2>
              <p className="mt-1 text-sm text-slate-400">
                Select an eligible order to record the quantities delivered.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search order or supplier..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 sm:w-64"
                />
              </div>

              <div className="relative">
                <select
                  value={filter}
                  onChange={(event) => {
                    setFilter(event.target.value)
                    setPage(1)
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-3 pr-9 text-sm text-slate-200 outline-none focus:border-blue-400/60 sm:w-48"
                >
                  <option value="Pending">Awaiting delivery</option>
                  <option value="Partial">Partially received</option>
                  <option value="Received">Fully received</option>
                  <option value="All">All orders</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-400">
            <RefreshCw size={18} className="animate-spin" />
            Loading delivery records...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-slate-400">
              <ClipboardCheck size={28} />
            </div>
            <h3 className="mt-4 font-semibold text-white">
              No purchase orders found
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {search
                ? 'Try a different order number or supplier name.'
                : filter === 'Pending'
                  ? 'There are no orders awaiting delivery. Create and order a purchase order first.'
                  : 'No orders match this filter yet.'}
            </p>
            {(search || filter !== 'Pending') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setFilter('All')
                  setPage(1)
                }}
                className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Show all orders
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Order number</th>
                    <th className="px-5 py-4 font-semibold">Supplier</th>
                    <th className="px-5 py-4 font-semibold">Order date</th>
                    <th className="px-5 py-4 font-semibold">Items</th>
                    <th className="px-5 py-4 font-semibold">Outstanding</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredOrders.map((order) => {
                    const outstanding = outstandingUnits(order)
                    const canReceive = [
                      'Ordered',
                      'Partially Received',
                    ].includes(order.status)

                    return (
                      <tr
                        key={order._id}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-300">
                          {order.orderNumber}
                        </td>
                        <td className="px-5 py-4 text-slate-200">
                          {getSupplierName(order)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                          {formatDate(order.orderedAt || order.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {order.items?.length || 0}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {outstanding}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          {canReceive ? (
                            <button
                              type="button"
                              onClick={() => openReceiving(order)}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                            >
                              <PackageCheck size={15} />
                              Receive goods
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {filteredOrders.map((order) => {
                const canReceive = [
                  'Ordered',
                  'Partially Received',
                ].includes(order.status)

                return (
                  <div
                    key={order._id}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-blue-300">
                          {order.orderNumber}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {getSupplierName(order)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Order date</p>
                        <p className="mt-1 text-slate-300">
                          {formatDate(order.orderedAt || order.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Outstanding</p>
                        <p className="mt-1 text-slate-300">
                          {outstandingUnits(order)} units
                        </p>
                      </div>
                    </div>

                    {canReceive && (
                      <button
                        type="button"
                        onClick={() => openReceiving(order)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                      >
                        <PackageCheck size={16} />
                        Receive goods
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row sm:px-5">
          <p className="text-xs text-slate-400">
            {pagination.total === 0
              ? 'No purchase orders'
              : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                )} of ${pagination.total} purchase orders`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-24 text-center text-sm text-slate-300">
              Page {page} of {Math.max(1, pagination.pages)}
            </span>
            <button
              type="button"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReceiving()
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="receive-goods-title"
            className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <PackageCheck size={17} />
                  Receive delivery
                </div>
                <h2
                  id="receive-goods-title"
                  className="mt-2 text-xl font-bold text-white"
                >
                  {selectedOrder.orderNumber}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Supplier: {getSupplierName(selectedOrder)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReceiving}
                disabled={submitting}
                aria-label="Close receiving form"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReceive}>
              <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5">
                <div className="flex gap-3 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-sm text-amber-200">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>
                    Enter the actual quantities delivered. Leave a field empty
                    or enter zero for items not delivered. Only confirmed
                    quantities will be added to stock.
                  </p>
                </div>

                {(selectedOrder.items || []).map((item) => {
                  const alreadyReceived = item.receivedQuantity || 0
                  const outstanding = item.quantity - alreadyReceived

                  return (
                    <div
                      key={item._id}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white">
                            {item.productName || 'Product'}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {item.sku || '—'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-300">
                          {formatCurrency(item.unitCost)} / unit
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-950/70 p-3">
                          <p className="text-xs text-slate-500">Ordered</p>
                          <p className="mt-1 font-semibold text-white">
                            {item.quantity}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-950/70 p-3">
                          <p className="text-xs text-slate-500">Received</p>
                          <p className="mt-1 font-semibold text-emerald-300">
                            {alreadyReceived}
                          </p>
                        </div>
                        <div className="col-span-2 rounded-lg bg-slate-950/70 p-3 sm:col-span-1">
                          <p className="text-xs text-slate-500">Remaining</p>
                          <p className="mt-1 font-semibold text-amber-300">
                            {outstanding}
                          </p>
                        </div>
                      </div>

                      <label className="mt-4 block text-sm font-medium text-slate-300">
                        Quantity arriving now
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={outstanding}
                        step="1"
                        inputMode="numeric"
                        disabled={outstanding <= 0 || submitting}
                        value={quantities[item._id] ?? ''}
                        onChange={(event) =>
                          handleQuantityChange(
                            item._id,
                            event.target.value,
                            outstanding
                          )
                        }
                        placeholder="Enter received quantity"
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-800 p-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeReceiving}
                  disabled={submitting}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <PackageCheck size={16} />
                  )}
                  {submitting ? 'Recording receipt...' : 'Confirm receipt'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default GoodsReceived