
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Folder,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  LoaderCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must have at least 2 characters'),
  description: z.string().optional(),
})

const emptyCategory = { name: '', description: '' }

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

export default function Categories() {
  const { user } = useAuth()
  const canManage = ['admin', 'manager'].includes(user?.role)
  const canDelete = user?.role === 'admin'

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
  const [deletingId, setDeletingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [viewingCategory, setViewingCategory] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategory,
  })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/categories', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: search.trim() || undefined,
        },
      })
      const resultPagination = response.data.pagination
      setCategories(response.data.categories || [])
      setPagination((current) => {
        if (!resultPagination) return current

        const lastPage = Math.max(1, resultPagination.pages)
        return {
          ...current,
          ...resultPagination,
          page: Math.min(resultPagination.page, lastPage),
        }
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load categories')
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, pagination.page, search])

  const loadCategories = useCallback(() => {
    setLoading(true)
    return fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchCategories, 250)
    return () => window.clearTimeout(timeoutId)
  }, [fetchCategories])

  function openCreateModal() {
    setEditingCategory(null)
    reset(emptyCategory)
    setModalOpen(true)
  }

  function openEditModal(category) {
    setEditingCategory(category)
    reset({
      name: category.name || '',
      description: category.description || '',
    })
    setModalOpen(true)
  }

  async function saveCategory(values) {
    setSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || '',
      }

      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, payload)
        toast.success('Category updated successfully')
      } else {
        await api.post('/categories', payload)
        toast.success('Category created successfully')
      }

      setModalOpen(false)
      setEditingCategory(null)
      reset(emptyCategory)
      if (!editingCategory && pagination.page !== 1) {
        setPagination((current) => ({ ...current, page: 1 }))
      } else {
        await loadCategories()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save category')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(category) {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? Categories linked to products may not be deletable.`,
    )
    if (!confirmed) return

    setDeletingId(category._id)
    try {
      await api.delete(`/categories/${category._id}`)
      toast.success('Category deleted successfully')
      if (categories.length === 1 && pagination.page > 1) {
        setPagination((current) => ({ ...current, page: current.page - 1 }))
      } else {
        await loadCategories()
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Could not delete category. Check whether products use it.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCategories = categories

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.2),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_24%),linear-gradient(180deg,#020817_0%,#0f172a_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Inventory organization
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Categories
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Group your products so your inventory stays organized.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadCategories}
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
                Add category
              </button>
            )}
          </div>
        </div>

        <section className="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-900/80 shadow-[0_22px_50px_rgba(2,8,23,0.35)] backdrop-blur-sm">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">All categories</h2>
              <p className="mt-1 text-xs text-slate-400">
                {pagination.total} categories in your inventory
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
                placeholder="Search categories..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-400">
              <LoaderCircle size={20} className="animate-spin" />
              Loading categories...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-14 text-center">
              <Folder size={36} className="mx-auto text-slate-500" />
              <h3 className="mt-3 font-semibold text-slate-200">
                No categories found
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Try another search or create a category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((category) => (
                <article
                  key={category._id}
                  className="rounded-2xl border border-slate-700 bg-slate-950/60 p-5 transition hover:border-blue-400/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-blue-500/10 p-3 text-blue-200 ring-1 ring-blue-400/20">
                        <Folder size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-white">
                          {category.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Category
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingCategory(category)}
                        title="View category"
                        aria-label={`View ${category.name}`}
                        className="rounded-lg p-2 text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-200"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openEditModal(category)}
                          title="Edit category"
                          className="rounded-lg p-2 text-slate-300 hover:bg-blue-500/10 hover:text-blue-200"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteCategory(category)}
                          disabled={deletingId === category._id}
                          title="Delete category"
                          className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          {deletingId === category._id ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 min-h-10 text-sm leading-5 text-slate-400">
                    {category.description || 'No description provided.'}
                  </p>
                </article>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              {pagination.total === 0
                ? 'No categories'
                : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )} of ${pagination.total} categories`}
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

      {viewingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-details-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2
                  id="category-details-title"
                  className="font-bold text-white"
                >
                  Category details
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Information for {viewingCategory.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingCategory(null)}
                aria-label="Close category details"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-200 ring-1 ring-blue-400/20">
                  <Folder size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Category name
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    {viewingCategory.name}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
                  {viewingCategory.description || 'No description provided.'}
                </p>
              </div>

              {viewingCategory.createdBy?.name && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Created by
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {viewingCategory.createdBy.name}
                  </p>
                </div>
              )}

              {viewingCategory.createdAt && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Created
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {new Date(viewingCategory.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewingCategory(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 className="font-bold text-white">
                  {editingCategory ? 'Edit category' : 'Create category'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter a name and optional description.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit(saveCategory)} className="space-y-5 p-6">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Category name *
                </span>
                <input
                  {...register('name')}
                  className={inputClass}
                  placeholder="e.g. Office Supplies"
                />
                {errors.name && (
                  <span className="mt-1 block text-xs text-red-400">
                    {errors.name.message}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Description
                </span>
                <textarea
                  {...register('description')}
                  rows={4}
                  className={inputClass}
                  placeholder="What products belong in this category?"
                />
              </label>

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
                  {saving
                    ? 'Saving...'
                    : editingCategory
                      ? 'Save changes'
                      : 'Create category'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
