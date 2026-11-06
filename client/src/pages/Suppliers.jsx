import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  RefreshCw,
  Power,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from 'lucide-react'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

const emptyForm = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
}

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-300'

function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewingSupplier, setViewingSupplier] = useState(null)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)
  const [confirmingId, setConfirmingId] = useState(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)

    try {
      const response = await api.get('/suppliers', {
        params: { page, limit: 10, search, status },
      })

      setSuppliers(response.data.suppliers || [])
      setPagination(
        response.data.pagination || { page: 1, pages: 1, total: 0 }
      )
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to load suppliers'
      )
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    const timer = setTimeout(fetchSuppliers, 300)
    return () => clearTimeout(timer)
  }, [fetchSuppliers])

  const openCreateModal = () => {
    setEditingSupplier(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingSupplier(null)
    setForm({ ...emptyForm })
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error('Please enter a supplier name')
      return
    }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    }

    try {
      if (editingSupplier) {
        await api.patch(`/suppliers/${editingSupplier._id}`, payload)
        toast.success('Supplier updated successfully')
      } else {
        await api.post('/suppliers', payload)
        toast.success('Supplier added successfully')
        setPage(1)
      }

      setModalOpen(false)
      setEditingSupplier(null)
      setForm({ ...emptyForm })
      await fetchSuppliers()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to save supplier'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (supplier) => {
    const nextStatus = !supplier.isActive
    const action = nextStatus ? 'activate' : 'deactivate'

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${supplier.name}"?`
      )
    ) {
      return
    }

    setConfirmingId(supplier._id)

    try {
      await api.patch(`/suppliers/${supplier._id}/status`, {
        isActive: nextStatus,
      })

      toast.success(
        nextStatus ? 'Supplier activated' : 'Supplier deactivated'
      )
      await fetchSuppliers()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to update supplier status'
      )
    } finally {
      setConfirmingId(null)
    }
  }

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
    setPage(1)
  }

  const handleStatusFilter = (event) => {
    setStatus(event.target.value)
    setPage(1)
  }

  const activeSupplierCount = suppliers.filter((supplier) => supplier.isActive).length
  const inactiveSupplierCount = suppliers.filter((supplier) => !supplier.isActive).length

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.2),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.2),_transparent_24%),linear-gradient(180deg,#020817_0%,#0f172a_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Inventory management
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Suppliers</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage supplier contacts and keep your supplier directory up to date.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchSuppliers}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-400 hover:to-indigo-400"
            >
              <Plus size={17} />
              Add supplier
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.35)] backdrop-blur-sm">
            <p className="text-sm text-slate-400">Matching suppliers</p>
            <p className="mt-2 text-2xl font-bold text-white">{pagination.total}</p>
          </div>
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.35)] backdrop-blur-sm">
            <p className="text-sm text-slate-400">Active</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {activeSupplierCount}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.35)] backdrop-blur-sm">
            <p className="text-sm text-slate-400">Inactive</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">
              {inactiveSupplierCount}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-900/80 shadow-[0_22px_50px_rgba(2,8,23,0.35)] backdrop-blur-sm">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">Supplier directory</h2>
              <p className="mt-1 text-xs text-slate-400">
                Search and manage suppliers in your purchasing network.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-sm">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search name, email, phone..."
                  className={`${inputClass} pl-9`}
                  aria-label="Search suppliers"
                />
              </div>

              <select
                value={status}
                onChange={handleStatusFilter}
                className={`${inputClass} min-w-36`}
                aria-label="Filter supplier status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All suppliers</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-semibold">Supplier</th>
                  <th className="px-5 py-4 font-semibold">Contact details</th>
                  <th className="px-5 py-4 font-semibold">Address</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <LoaderCircle
                        size={28}
                        className="mx-auto animate-spin text-blue-400"
                      />
                      <p className="mt-3 text-slate-400">Loading suppliers...</p>
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <Building2
                        size={36}
                        className="mx-auto text-slate-500"
                      />
                      <p className="mt-3 font-semibold text-slate-200">
                        No suppliers found
                      </p>
                      <p className="mt-1 text-slate-400">
                        Try another search or add your first supplier.
                      </p>
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 font-semibold text-blue-300 hover:text-blue-200"
                      >
                        + Add a supplier
                      </button>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-slate-800/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-200 ring-1 ring-blue-400/20">
                            {supplier.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{supplier.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {supplier.contactPerson || 'No contact person'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {supplier.email && (
                            <p className="flex items-center gap-2 text-slate-300">
                              <Mail size={14} className="shrink-0 text-slate-500" />
                              {supplier.email}
                            </p>
                          )}
                          {supplier.phone && (
                            <p className="flex items-center gap-2 text-slate-300">
                              <Phone size={14} className="shrink-0 text-slate-500" />
                              {supplier.phone}
                            </p>
                          )}
                          {!supplier.email && !supplier.phone && (
                            <span className="text-slate-500">No contact details</span>
                          )}
                        </div>
                      </td>

                      <td className="max-w-52 px-5 py-4">
                        <p className="flex items-start gap-2 text-slate-300">
                          {supplier.address && (
                            <MapPin size={15} className="mt-0.5 shrink-0 text-slate-500" />
                          )}
                          <span className="line-clamp-2">
                            {supplier.address || 'Not provided'}
                          </span>
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            supplier.isActive
                              ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20'
                              : 'bg-slate-500/10 text-slate-300 ring-1 ring-slate-400/20'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              supplier.isActive ? 'bg-emerald-400' : 'bg-slate-400'
                            }`}
                          />
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingSupplier(supplier)}
                            title="View supplier"
                            aria-label={`View ${supplier.name}`}
                            className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-slate-300 transition hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-200"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(supplier)}
                            title="Edit supplier"
                            className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-slate-300 transition hover:border-blue-400/50 hover:bg-slate-800 hover:text-blue-200"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(supplier)}
                            disabled={confirmingId === supplier._id}
                            title={supplier.isActive ? 'Deactivate supplier' : 'Activate supplier'}
                            className={`rounded-lg border p-2 transition disabled:opacity-50 ${
                              supplier.isActive
                                ? 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                            }`}
                          >
                            {confirmingId === supplier._id ? (
                              <LoaderCircle size={16} className="animate-spin" />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Showing {suppliers.length ? (page - 1) * 10 + 1 : 0}
              {'–'}
              {(page - 1) * 10 + suppliers.length} of {pagination.total} suppliers
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-2 text-sm text-slate-300">
                Page {page} of {Math.max(1, pagination.pages)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(Math.max(1, pagination.pages), current + 1)
                  )
                }
                disabled={page >= pagination.pages || loading}
                className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {viewingSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="supplier-details-title"
              className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
                <div>
                  <h2
                    id="supplier-details-title"
                    className="text-xl font-bold text-white"
                  >
                    Supplier details
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Full profile for {viewingSupplier.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingSupplier(null)}
                  aria-label="Close supplier details"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-5 p-6 sm:grid-cols-2">
                <SupplierDetail label="Supplier" value={viewingSupplier.name} />
                <SupplierDetail
                  label="Contact person"
                  value={viewingSupplier.contactPerson}
                />
                <SupplierDetail label="Email" value={viewingSupplier.email} />
                <SupplierDetail label="Phone" value={viewingSupplier.phone} />
                <SupplierDetail
                  label="Status"
                  value={viewingSupplier.isActive ? 'Active' : 'Inactive'}
                />
                <SupplierDetail
                  label="Address"
                  value={viewingSupplier.address}
                  multiline
                />
                <div className="sm:col-span-2">
                  <SupplierDetail
                    label="Notes"
                    value={viewingSupplier.notes}
                    multiline
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-800 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setViewingSupplier(null)}
                  className="rounded-xl border border-slate-700 bg-slate-950/80 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal()
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="supplier-modal-title"
              className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-5">
                <div>
                  <h2
                    id="supplier-modal-title"
                    className="text-xl font-bold text-white"
                  >
                    {editingSupplier ? 'Edit supplier' : 'Add new supplier'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {editingSupplier
                      ? 'Update the supplier contact information.'
                      : 'Enter the supplier details below.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Close form"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div>
                  <label htmlFor="supplier-name" className={labelClass}>
                    Supplier name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="supplier-name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    maxLength={150}
                    placeholder="e.g. ABC Wholesale Traders"
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="supplier-contact" className={labelClass}>
                      Contact person
                    </label>
                    <input
                      id="supplier-contact"
                      name="contactPerson"
                      value={form.contactPerson}
                      onChange={handleChange}
                      maxLength={100}
                      placeholder="e.g. Rahul Sharma"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="supplier-email" className={labelClass}>
                      Email address
                    </label>
                    <input
                      id="supplier-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      maxLength={150}
                      placeholder="supplier@example.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="supplier-phone" className={labelClass}>
                      Phone number
                    </label>
                    <input
                      id="supplier-phone"
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      maxLength={30}
                      placeholder="Enter phone number"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="supplier-address" className={labelClass}>
                    Address
                  </label>
                  <textarea
                    id="supplier-address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    maxLength={500}
                    rows={2}
                    placeholder="Supplier business address"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="supplier-notes" className={labelClass}>
                    Notes
                  </label>
                  <textarea
                    id="supplier-notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    maxLength={1000}
                    rows={3}
                    placeholder="Optional additional information"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-700 bg-slate-950/80 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-400 hover:to-indigo-400 disabled:opacity-60"
                  >
                  {saving && <LoaderCircle size={17} className="animate-spin" />}
                  {saving
                    ? 'Saving...'
                    : editingSupplier
                      ? 'Save changes'
                      : 'Add supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </main>
  )
}

function SupplierDetail({ label, value, multiline = false }) {
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

export default Suppliers