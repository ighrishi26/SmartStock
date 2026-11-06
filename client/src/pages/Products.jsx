
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Package,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { usePreferences } from '../context/PreferencesContext'

const productSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters'),
  sku: z.string().trim().min(2, 'SKU is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Select a category'),
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
  unit: z.string().trim().min(1, 'Unit is required'),
  costPrice: z.coerce.number().min(0, 'Cost cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Price cannot be negative'),
  reorderLevel: z.coerce.number().int().min(0, 'Reorder level cannot be negative'),
  location: z.string().optional(),
})

const emptyProduct = {
  name: '',
  sku: '',
  description: '',
  category: '',
  quantity: 0,
  unit: 'pcs',
  costPrice: 0,
  sellingPrice: 0,
  reorderLevel: 5,
  location: '',
}

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

export default function Products() {
  const { user } = useAuth()
  const { preferences } = usePreferences()
  const canManage = ['admin', 'manager'].includes(user?.role)
  const canDelete = user?.role === 'admin'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        api.get('/products', {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            search: search.trim(),
          },
        }),
        api.get('/categories'),
      ])

      setProducts(productResponse.data.products || [])
      setPagination((current) => ({
        ...current,
        ...(productResponse.data.pagination || {}),
      }))
      setCategories(categoryResponse.data.categories || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load products')
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, pagination.page, search])

  useEffect(() => {
    const timeoutId = setTimeout(loadData, 300)
    return () => clearTimeout(timeoutId)
  }, [loadData])

  function openCreateModal() {
    setEditingProduct(null)
    reset(emptyProduct)
    setModalOpen(true)
  }

  function openEditModal(product) {
    setEditingProduct(product)
    reset({ 
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      category: product.category?._id || product.category || '',
      quantity: product.quantity ?? 0,
      unit: product.unit || 'pcs',
      costPrice: product.costPrice ?? 0,
      sellingPrice: product.sellingPrice ?? 0,
      reorderLevel: product.reorderLevel ?? 5,
      location: product.location || '',
    })
    setModalOpen(true)
  }

  
async function saveProduct(values) {
  setSaving(true)

  try {
    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      description: values.description?.trim() || '',
      category: values.category,
      quantity: Number(values.quantity),
      unit: values.unit,
      costPrice: Number(values.costPrice),
      sellingPrice: Number(values.sellingPrice),
      reorderLevel: Number(values.reorderLevel),
      location: values.location?.trim() || '',
    }

    if (!Number.isSafeInteger(payload.quantity) || payload.quantity < 0) {
      toast.error('Quantity must be a whole number greater than or equal to zero')
      return
    }

    if (editingProduct) {
      await api.put(`/products/${editingProduct._id}`, payload)
      toast.success('Product updated successfully')
    } else {
      await api.post('/products', payload)
      toast.success('Product added successfully')
    }

    setModalOpen(false)
    reset(emptyProduct)
    setEditingProduct(null)
    if (!editingProduct && pagination.page !== 1) {
      setPagination((current) => ({ ...current, page: 1 }))
    } else {
      await loadData()
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Could not save product')
  } finally {
    setSaving(false)
  }
}

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    setDeletingId(product._id)
    try {
      await api.delete(`/products/${product._id}`)
      toast.success('Product deleted successfully')
      if (products.length === 1 && pagination.page > 1) {
        setPagination((current) => ({ ...current, page: current.page - 1 }))
      } else {
        await loadData()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete product')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredProducts = products

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.quantity) > 0 &&
      Number(product.quantity) <= Number(product.reorderLevel ?? 5),
  )

  const showLowStockAlerts = preferences.lowStockAlerts
  
  const cellPadding = preferences.compactTable ? 'px-3 py-2' : 'px-5 py-4'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.2),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.2),_transparent_24%),linear-gradient(180deg,#020817_0%,#0f172a_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Inventory management
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Products
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your products, prices, quantities and stock levels.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-400 hover:to-indigo-400"
              >
                <Plus size={17} />
                Add product
              </button>
            )}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.35)] backdrop-blur-sm">
            <p className="text-sm text-slate-400">Products on this page</p>
            <p className="mt-2 text-2xl font-bold text-white">{products.length}</p>
          </div>
          {showLowStockAlerts && (
  <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.35)] backdrop-blur-sm">
    <p className="text-sm text-slate-400">Low stock on this page</p>
    <p className="mt-2 text-2xl font-bold text-amber-300">
      {lowStockProducts.length}
    </p>
  </div>
)}
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.35)] backdrop-blur-sm">
            <p className="text-sm text-slate-400">Out of stock on this page</p>
            <p className="mt-2 text-2xl font-bold text-rose-300">
              {products.filter((p) => p.quantity === 0).length}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-900/80 shadow-[0_22px_50px_rgba(2,8,23,0.35)] backdrop-blur-sm">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">Product inventory</h2>
              <p className="mt-1 text-xs text-slate-400">
                Showing 10 products per page from your inventory.
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
                placeholder="Search name, SKU or category..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-400">
              <LoaderCircle size={20} className="animate-spin" />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-14 text-center">
              <Package size={36} className="mx-auto text-slate-500" />
              <h3 className="mt-3 font-semibold text-slate-200">No products found</h3>
              <p className="mt-1 text-sm text-slate-400">
                Try another search or add your first product.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className={`${cellPadding} font-semibold`}>Product</th>
                      <th className={`${cellPadding} font-semibold`}>Category</th>
                      <th className={`${cellPadding} font-semibold`}>Quantity</th>
                      <th className={`${cellPadding} font-semibold`}>Cost price</th>
                      <th className={`${cellPadding} font-semibold`}>Selling price</th>
                      <th className={`${cellPadding} font-semibold`}>Stock status</th>
                    <th className={`${cellPadding} text-right font-semibold`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredProducts.map((product) => {
                    const low = product.quantity <= product.reorderLevel
                    const out = product.quantity === 0

                    return (
                      <tr key={product._id} className="hover:bg-slate-800/60">
                        <td className={cellPadding}>
                          <p className="font-semibold text-slate-100">{product.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{product.sku}</p>
                        </td>
                        <td className={`${cellPadding} text-slate-300`}>
                          {product.category?.name || 'Uncategorized'}
                        </td>
                        <td className={`${cellPadding} font-medium text-slate-100`}>
                          {product.quantity} {product.unit || 'pcs'}
                        </td>
                        <td className={`${cellPadding} text-slate-300`}>
                          {money(product.costPrice)}
                        </td>
                        <td className={`${cellPadding} text-slate-300`}>
                          {money(product.sellingPrice)}
                        </td>
                        <td className={cellPadding}>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              out
                                ? 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20'
                                : low
                                  ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20'
                                  : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20'
                            }`}
                          >
                            {out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}
                          </span>
                        </td>
                        <td className={cellPadding}>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingProduct(product)}
                              title="View product"
                              aria-label={`View ${product.name}`}
                              className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-slate-300 hover:border-cyan-400/50 hover:bg-slate-800 hover:text-cyan-200"
                            >
                              <Eye size={15} />
                            </button>
                            {canManage && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(product)}
                                  title="Edit product"
                                  className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-slate-300 hover:border-blue-400/50 hover:bg-slate-800 hover:text-blue-200"
                                >
                                  <Pencil size={15} />
                                </button>
                            )}
                            {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => deleteProduct(product)}
                                  disabled={deletingId === product._id}
                                  title="Delete product"
                                  className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                                >
                                  {deletingId === product._id ? (
                                    <LoaderCircle size={15} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </button>
                            )}
                          </div>
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
                ? 'No products'
                : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )} of ${pagination.total} products`}
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

      {viewingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingProduct(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-details-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
                  <Package size={22} />
                </div>
                <div className="min-w-0">
                  <h2
                    id="product-details-title"
                    className="truncate text-lg font-bold text-white"
                  >
                    {viewingProduct.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    SKU: {viewingProduct.sku || '—'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close product details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {[
                ['Category', viewingProduct.category?.name || 'Uncategorized'],
                [
                  'Stock quantity',
                  `${viewingProduct.quantity ?? 0} ${viewingProduct.unit || 'pcs'}`,
                ],
                ['Cost price', money(viewingProduct.costPrice)],
                ['Selling price', money(viewingProduct.sellingPrice)],
                ['Reorder level', viewingProduct.reorderLevel ?? 5],
                ['Storage location', viewingProduct.location || '—'],
                [
                  'Stock status',
                  Number(viewingProduct.quantity) === 0
                    ? 'Out of stock'
                    : Number(viewingProduct.quantity) <=
                        Number(viewingProduct.reorderLevel ?? 5)
                      ? 'Low stock'
                      : 'In stock',
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1.5 break-words text-sm font-medium text-slate-100">
                    {value}
                  </p>
                </div>
              ))}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-300">
                  {viewingProduct.description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <section className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingProduct ? 'Edit product' : 'Add new product'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter the product information below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit(saveProduct)} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Product name *" error={errors.name?.message}>
                  <input {...register('name')} className={inputClass} placeholder="Wireless Mouse" />
                </Field>
                <Field label="SKU *" error={errors.sku?.message}>
                  <input {...register('sku')} className={inputClass} placeholder="ELEC-MOUSE-002" />
                </Field>
                <Field label="Category *" error={errors.category?.message}>
                  <select {...register('category')} className={inputClass}>
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit *" error={errors.unit?.message}>
                  <select {...register('unit')} className={inputClass}>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Box</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="litre">Litres</option>
                    <option value="pack">Pack</option>
                    <option value="unit">Unit</option>
                  </select>
                </Field>
                <Field label="Quantity *" error={errors.quantity?.message}>
                  <input type="number" min="0" step="1" {...register('quantity')} className={inputClass} />
                </Field>
                <Field label="Reorder level *" error={errors.reorderLevel?.message}>
                  <input type="number" min="0" step="1" {...register('reorderLevel')} className={inputClass} />
                </Field>
                <Field label="Cost price (₹) *" error={errors.costPrice?.message}>
                  <input type="number" min="0" step="0.01" {...register('costPrice')} className={inputClass} />
                </Field>
                <Field label="Selling price (₹) *" error={errors.sellingPrice?.message}>
                  <input type="number" min="0" step="0.01" {...register('sellingPrice')} className={inputClass} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Storage location" error={errors.location?.message}>
                    <input {...register('location')} className={inputClass} placeholder="Shelf A2" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Description" error={errors.description?.message}>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className={inputClass}
                      placeholder="Brief product description..."
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-400 hover:to-indigo-400 disabled:opacity-60"
                >
                  {saving && <LoaderCircle size={16} className="animate-spin" />}
                  {saving ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
