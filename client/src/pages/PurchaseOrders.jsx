import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  RefreshCw,
  ShoppingCart,
  X,
  Trash2,
  Eye,
  Send,
  Ban,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Package,
  CalendarDays,
  PackageCheck,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

const STATUSES = [
  'all',
  'Draft',
  'Ordered',
  'Partially Received',
  'Received',
  'Cancelled',
]

const emptyItem = () => ({
  productId: '',
  quantity: 1,
  unitCost: '',
})

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const errorMessage = (error) =>
  error.response?.data?.message || 'Something went wrong. Please try again.'

const statusStyle = {
  Draft: 'bg-slate-500/10 text-slate-300 ring-1 ring-slate-400/20',
  Ordered: 'bg-blue-500/10 text-blue-200 ring-1 ring-blue-400/20',
  'Partially Received': 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/20',
  Received: 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20',
  Cancelled: 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/20',
}

function PurchaseOrders() {
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  })
  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [receivingOrder, setReceivingOrder] = useState(null)
  const [receiveItems, setReceiveItems] = useState([])
  const [receiving, setReceiving] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [orderStatus, setOrderStatus] = useState('Draft')
  const [items, setItems] = useState([emptyItem()])

  const loadOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/purchase-orders', {
        params: {
          page,
          limit: 10,
          search,
          status,
        },
      })

      setOrders(data.orders || [])
      setPagination(
        data.pagination || { page: 1, pages: 1, total: 0 }
      )
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  const loadFormOptions = useCallback(async () => {
    setFormLoading(true)

    try {
      const [supplierResponse, productResponse] = await Promise.all([
        api.get('/suppliers', {
          params: { page: 1, limit: 100, status: 'active' },
        }),
        api.get('/products', {
          params: { page: 1, limit: 100 },
        }),
      ])

      setSuppliers(supplierResponse.data.suppliers || [])
      setProducts(
        (productResponse.data.products || []).filter(
          (product) => product.isActive !== false
        )
      )
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setFormLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadOrders()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadOrders])

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        return sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0)
      }, 0),
    [items]
  )

  const resetForm = () => {
    setSupplierId('')
    setNotes('')
    setOrderStatus('Draft')
    setItems([emptyItem()])
  }

  const openCreateForm = async () => {
    resetForm()
    setShowForm(true)
    await loadFormOptions()
  }

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    )
  }

  const chooseProduct = (index, productId) => {
    const product = products.find((item) => item._id === productId)

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              unitCost:
                product && product.costPrice != null
                  ? String(product.costPrice)
                  : '',
            }
          : item
      )
    )
  }

  const addItem = () => {
    setItems((current) => [...current, emptyItem()])
  }

  const removeItem = (index) => {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  const createOrder = async (event) => {
    event.preventDefault()

    if (!supplierId) {
      toast.error('Please select a supplier.')
      return
    }

    if (items.some((item) => !item.productId)) {
      toast.error('Please select a product for every order row.')
      return
    }

    const productIds = items.map((item) => item.productId)

    if (new Set(productIds).size !== productIds.length) {
      toast.error('Each product can only appear once. Update its quantity instead.')
      return
    }

    const invalidItem = items.some(
      (item) =>
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1 ||
        item.unitCost === '' ||
        !Number.isFinite(Number(item.unitCost)) ||
        Number(item.unitCost) < 0
    )

    if (invalidItem) {
      toast.error('Enter a whole-number quantity and a valid non-negative unit cost.')
      return
    }

    setSaving(true)

    try {
      await api.post('/purchase-orders', {
        supplierId,
        notes,
        status: orderStatus,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      })

      toast.success('Purchase order created successfully.')
      setShowForm(false)
      resetForm()
      setPage(1)
      await loadOrders()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const changeOrderStatus = async (order, nextStatus) => {
    const confirmed = window.confirm(
      `Are you sure you want to ${nextStatus.toLowerCase()} ${order.orderNumber}?`
    )

    if (!confirmed) return

    try {
      await api.patch(`/purchase-orders/${order._id}/status`, {
        status: nextStatus,
      })

      toast.success(`Order updated to ${nextStatus}.`)
      await loadOrders()

      if (selectedOrder?._id === order._id) {
        const { data } = await api.get(`/purchase-orders/${order._id}`)
        setSelectedOrder(data.order)
      }
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const viewOrder = async (order) => {
    try {
      const { data } = await api.get(`/purchase-orders/${order._id}`)
      setSelectedOrder(data.order)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  
  const openReceiveForm = async (order) => {
    try {
      const { data } = await api.get(`/purchase-orders/${order._id}`)
      const freshOrder = data.order

      setReceivingOrder(freshOrder)
      setReceiveItems(
        (freshOrder.items || []).map((item) => ({
          itemId: item._id,
          productName: item.productName || item.product?.name || 'Product',
          sku: item.sku || item.product?.sku || '',
          orderedQuantity: item.quantity,
          receivedQuantity: item.receivedQuantity || 0,
          quantity: '',
        }))
      )
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const updateReceiveQuantity = (itemId, value) => {
    setReceiveItems((current) =>
      current.map((item) =>
        item.itemId === itemId ? { ...item, quantity: value } : item
      )
    )
  }

  const receiveGoods = async (event) => {
    event.preventDefault()

    if (!receivingOrder || receiving) return

    const itemsToReceive = receiveItems
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => ({
        itemId: item.itemId,
        quantity: Number(item.quantity),
      }))

    if (itemsToReceive.length === 0) {
      toast.error('Enter a quantity for at least one product.')
      return
    }

    const invalidItem = receiveItems.some((item) => {
      const quantity = Number(item.quantity) || 0
      const remaining =
        item.orderedQuantity - item.receivedQuantity

      return (
        !Number.isSafeInteger(quantity) ||
        quantity < 0 ||
        quantity > remaining
      )
    })

    if (invalidItem) {
      toast.error('Check the quantities. They cannot exceed the remaining order quantities.')
      return
    }

    setReceiving(true)

    try {
      const { data } = await api.post(
        `/purchase-orders/${receivingOrder._id}/receive`,
        { items: itemsToReceive }
      )

      toast.success(data.message || 'Goods received successfully.')
      setReceivingOrder(null)
      setReceiveItems([])
      await loadOrders()

      if (selectedOrder?._id === receivingOrder._id) {
        setSelectedOrder(data.order)
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setReceiving(false)
    }
  }


  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.2),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.2),_transparent_24%),linear-gradient(180deg,#020817_0%,#0f172a_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Inventory management
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Purchase Orders
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Create orders, track suppliers, and monitor incoming inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-indigo-400"
          >
            <Plus size={17} />
            Add purchase order
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_12px_30px_rgba(2,6,23,0.35)]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-200 ring-1 ring-blue-400/20">
                <ShoppingCart size={22} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Matching Orders</p>
                <p className="text-2xl font-bold text-white">
                  {pagination.total || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_12px_30px_rgba(2,6,23,0.35)]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-200 ring-1 ring-emerald-400/20">
                <Package size={22} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Value of Displayed Orders</p>
                <p className="text-2xl font-bold text-white">
                  {money(orders.reduce((sum, order) => sum + (order.subtotal || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] sm:p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search order number or supplier..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All statuses' : value}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setLoading(true)
              loadOrders()
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-slate-400">
            <LoaderCircle className="mr-2 animate-spin" size={22} />
            Loading purchase orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <ShoppingCart size={38} className="mb-3 text-slate-500" />
            <p className="font-semibold text-slate-200">
              No purchase orders found
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Create your first order or change the search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-3 font-semibold">Order</th>
                  <th className="px-3 py-3 font-semibold">Supplier</th>
                  <th className="px-3 py-3 font-semibold">Items</th>
                  <th className="px-3 py-3 font-semibold">Total</th>
                  <th className="px-3 py-3 font-semibold">Created</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-4">
                      <p className="font-semibold text-white">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {order.createdBy?.name || 'Staff'}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-slate-200">
                      {order.supplier?.name || order.supplierName || '—'}
                    </td>
                    <td className="px-3 py-4 text-slate-200">
                      {order.items?.length || 0}
                    </td>
                    <td className="px-3 py-4 font-semibold text-white">
                      {money(order.subtotal)}
                    </td>
                    <td className="px-3 py-4 text-slate-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[order.status] || statusStyle.Draft}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          title="View order"
                          onClick={() => viewOrder(order)}
                          className="rounded-lg p-2 text-slate-300 hover:bg-slate-700/80 hover:text-white"
                        >
                          <Eye size={17} />
                        </button>

                        
{['Ordered', 'Partially Received'].includes(order.status) && (
  <button
    type="button"
    title="Receive goods"
    onClick={() => openReceiveForm(order)}
    className="rounded-lg p-2 text-emerald-300 hover:bg-emerald-500/10"
  >
    <PackageCheck size={17} />
  </button>
)}


                        {order.status === 'Draft' && (
                          <button
                            type="button"
                            title="Mark as ordered"
                            onClick={() => changeOrderStatus(order, 'Ordered')}
                            className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10"
                          >
                            <Send size={17} />
                          </button>
                        )}

                        {['Draft', 'Ordered'].includes(order.status) && (
                          <button
                            type="button"
                            title="Cancel order"
                            onClick={() => changeOrderStatus(order, 'Cancelled')}
                            className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"
                          >
                            <Ban size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-400">
            Page {pagination.page || page} of {Math.max(1, pagination.pages || 1)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= (pagination.pages || 1) || loading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
          <div className="my-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Create Purchase Order
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose a supplier and add the products you want to order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {formLoading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-400">
                <LoaderCircle className="mr-2 animate-spin" size={22} />
                Loading suppliers and products...
              </div>
            ) : (
              <form onSubmit={createOrder} className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Supplier *
                    </label>
                    <select
                      required
                      value={supplierId}
                      onChange={(event) => setSupplierId(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {suppliers.length === 0 && (
                      <p className="mt-1 text-xs text-amber-300">
                        No active suppliers found. Add a supplier first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Initial Status
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(event) => setOrderStatus(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Ordered">Ordered</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-white">
                      Order Items
                    </h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/20"
                    >
                      <Plus size={16} />
                      Add Product
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => {
                      const selectedProduct = products.find(
                        (product) => product._id === item.productId
                      )

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 sm:p-4"
                        >
                          <div className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-5">
                              <label className="mb-1 block text-xs font-medium text-slate-300">
                                Product *
                              </label>
                              <select
                                required
                                value={item.productId}
                                onChange={(event) =>
                                  chooseProduct(index, event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="">Select product</option>
                                {products.map((product) => (
                                  <option
                                    key={product._id}
                                    value={product._id}
                                    disabled={items.some(
                                      (other, otherIndex) =>
                                        otherIndex !== index &&
                                        other.productId === product._id
                                    )}
                                  >
                                    {product.name} ({product.sku})
                                  </option>
                                ))}
                              </select>
                              {selectedProduct && (
                                <p className="mt-1 text-xs text-slate-400">
                                  Current stock: {selectedProduct.quantity ?? 0}
                                </p>
                              )}
                            </div>

                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-medium text-slate-300">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItem(index, 'quantity', event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="mb-1 block text-xs font-medium text-slate-300">
                                Unit Cost (₹) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={item.unitCost}
                                onChange={(event) =>
                                  updateItem(index, 'unitCost', event.target.value)
                                }
                                placeholder="0.00"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>

                            <div className="flex items-end justify-between gap-2 sm:col-span-2 sm:flex-col sm:items-end sm:justify-center">
                              <span className="text-sm font-semibold text-slate-100">
                                {money(
                                  (Number(item.quantity) || 0) *
                                    (Number(item.unitCost) || 0)
                                )}
                              </span>
                              <button
                                type="button"
                                disabled={items.length === 1}
                                onClick={() => removeItem(index)}
                                title="Remove product"
                                className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-30"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Optional delivery instructions or other details..."
                    className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Order subtotal
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {money(subtotal)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Creating this order does not change stock quantities.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        saving ||
                        formLoading ||
                        suppliers.length === 0 ||
                        products.length === 0
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving && (
                        <LoaderCircle size={16} className="animate-spin" />
                      )}
                      Create Order
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      
{receivingOrder && (
  <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-3 sm:p-6">
    <div className="my-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <h2 className="text-lg font-bold text-white">
            Receive Goods
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Order: {receivingOrder.orderNumber}
          </p>
        </div>

        <button
          type="button"
          disabled={receiving}
          onClick={() => setReceivingOrder(null)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={receiveGoods} className="space-y-5 p-5">
        <p className="text-sm text-slate-400">
          Enter the quantity delivered for each product. Leave a
          field blank or enter 0 for products not delivered yet.
        </p>

        <div className="space-y-3">
          {receiveItems.map((item) => {
            const remaining =
              item.orderedQuantity - item.receivedQuantity

            return (
              <div
                key={item.itemId}
                className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4 sm:grid-cols-12 sm:items-center"
              >
                <div className="sm:col-span-5">
                  <p className="font-medium text-slate-100">
                    {item.productName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    SKU: {item.sku || '—'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:col-span-4">
                  <div>
                    <p className="text-xs text-slate-500">Ordered</p>
                    <p className="mt-1 font-semibold text-slate-200">
                      {item.orderedQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Received</p>
                    <p className="mt-1 font-semibold text-emerald-300">
                      {item.receivedQuantity}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Remaining</p>
                    <p className="mt-1 font-semibold text-amber-300">
                      {remaining}
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor={`receive-${item.itemId}`}
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Delivering now
                  </label>
                  <input
                    id={`receive-${item.itemId}`}
                    type="number"
                    min="0"
                    max={remaining}
                    step="1"
                    value={item.quantity}
                    disabled={remaining === 0 || receiving}
                    onChange={(event) =>
                      updateReceiveQuantity(
                        item.itemId,
                        event.target.value
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-800 pt-4 sm:flex-row">
          <button
            type="button"
            disabled={receiving}
            onClick={() => setReceivingOrder(null)}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={receiving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {receiving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <PackageCheck size={16} />
            )}
            {receiving ? 'Receiving...' : 'Confirm Receipt'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedOrder.orderNumber}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedOrder.supplier?.name || selectedOrder.supplierName}
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[selectedOrder.status] || statusStyle.Draft}`}
                >
                  {selectedOrder.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CalendarDays size={16} />
                Created {formatDate(selectedOrder.createdAt)}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 pr-3 font-medium">Product</th>
                      <th className="px-2 py-2 text-right font-medium">Qty</th>
                      <th className="px-2 py-2 text-right font-medium">Received</th>
                      <th className="py-2 pl-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item) => (
                      <tr key={item._id} className="border-b border-slate-800">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-slate-200">
                            {item.productName || item.product?.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.sku || item.product?.sku}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-right text-slate-300">{item.quantity}</td>
                        <td className="px-2 py-3 text-right text-slate-300">
                          {item.receivedQuantity || 0}
                        </td>
                        <td className="py-3 pl-2 text-right font-medium text-slate-100">
                          {money(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="font-medium text-slate-300">Subtotal</span>
                <span className="text-xl font-bold text-white">
                  {money(selectedOrder.subtotal)}
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  )
}

export default PurchaseOrders