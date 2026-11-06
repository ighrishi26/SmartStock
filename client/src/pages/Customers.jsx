
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
  Search,
  Plus,
  Users,
  Building2,
  Mail,
  Phone,
  MapPin,
  Eye,
  Pencil,
  UserCheck,
  UserX,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

const emptyForm = {
  customerCode: '',
  name: '',
  company: '',
  email: '',
  phone: '',
  billingAddress: '',
  shippingAddress: '',
  notes: '',
}

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-300'

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    'Something went wrong. Please try again.'
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmCustomer, setConfirmCustomer] = useState(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)

    try {
      const response = await api.get('/customers', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search,
          status,
        },
      })

      setCustomers(response.data.customers || [])
      setPagination((current) => ({
        ...current,
        ...(response.data.pagination || {}),
      }))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, status])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadCustomers])

  const openCreateModal = () => {
    setEditingCustomer(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }
  
  const openEditModal = (customer) => {
    setEditingCustomer(customer)
    setForm({
      customerCode: customer.customerCode || '',
      name: customer.name || '',
      company: customer.company || '',
      email: customer.email || '',
      phone: customer.phone || '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || '',
      notes: customer.notes || '',
    })
    setModalOpen(true)
  }

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submitForm = async (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error('Customer name is required')
      return
    }

    setSaving(true)

    try {
      const payload = {
        ...form,
        customerCode: form.customerCode.trim(),
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        billingAddress: form.billingAddress.trim(),
        shippingAddress: form.shippingAddress.trim(),
        notes: form.notes.trim(),
      }

      if (!payload.customerCode) delete payload.customerCode
      if (!payload.email) delete payload.email

      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer._id}`, payload)
        toast.success('Customer updated successfully')
      } else {
        await api.post('/customers', payload)
        toast.success('Customer created successfully')
      }

      setModalOpen(false)
      setForm({ ...emptyForm })
      setEditingCustomer(null)

      if (!editingCustomer && pagination.page !== 1) {
        setPagination((current) => ({ ...current, page: 1 }))
      } else {
        await loadCustomers()
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async () => {
    if (!confirmCustomer) return

    try {
      await api.patch(`/customers/${confirmCustomer._id}/status`, {
        isActive: !confirmCustomer.isActive,
      })

      toast.success(
        confirmCustomer.isActive
          ? 'Customer deactivated'
          : 'Customer activated'
      )

      setConfirmCustomer(null)
      await loadCustomers()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const runSearch = (event) => {
    event.preventDefault()
    setPagination((current) => ({ ...current, page: 1 }))
    setSearch(searchInput.trim())
  }

  const activeCount = customers.filter((customer) => customer.isActive).length
  const inactiveCount = customers.length - activeCount

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-400">Operations / Customers</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Customers
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage customer profiles and contact information.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Users}
          label="Customers Found"
          value={pagination.total}
        />
        <SummaryCard
          icon={UserCheck}
          label="Active on This Page"
          value={activeCount}
        />
        <SummaryCard
          icon={UserX}
          label="Inactive on This Page"
          value={inactiveCount}
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <form
          onSubmit={runSearch}
          className="flex flex-col gap-3 md:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, company, email, phone or code..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPagination((current) => ({ ...current, page: 1 }))
            }}
            className={inputClass + ' md:w-44'}
          >
            <option value="active">Active customers</option>
            <option value="inactive">Inactive customers</option>
            <option value="all">All customers</option>
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800"
          >
            <Search size={16} />
            Search
          </button>

          <button
            type="button"
            title="Refresh customers"
            onClick={loadCustomers}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-semibold">Customer Directory</h2>
            <p className="mt-1 text-xs text-slate-400">
              {pagination.total} customer{pagination.total === 1 ? '' : 's'} found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-400">
            <RefreshCw size={18} className="animate-spin" />
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="rounded-2xl bg-slate-800 p-4 text-slate-400">
              <Users size={30} />
            </div>
            <h3 className="mt-4 font-semibold">No customers found</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Try changing the search or status filter, or add a customer using
              verified customer information.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500"
            >
              <Plus size={17} />
              Add Customer
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-medium">Customer</th>
                    <th className="px-5 py-4 font-medium">Contact</th>
                    <th className="px-5 py-4 font-medium">Address</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {customers.map((customer) => (
                    <tr key={customer._id} className="transition hover:bg-slate-800/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                            {customer.company ? (
                              <Building2 size={19} />
                            ) : (
                              <Users size={19} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white">
                              {customer.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {customer.customerCode || 'No customer code'}
                            </p>
                            {customer.company && (
                              <p className="mt-1 text-xs text-slate-400">
                                {customer.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <ContactDetails customer={customer} />
                      </td>
                      <td className="max-w-xs px-5 py-4 text-slate-400">
                        <div className="flex items-start gap-2">
                          <MapPin size={15} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">
                            {customer.shippingAddress ||
                              customer.billingAddress ||
                              'No address provided'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill active={customer.isActive} />
                      </td>
                      <td className="px-5 py-4">
                        <CustomerActions
                          customer={customer}
                          onView={setViewingCustomer}
                          onEdit={openEditModal}
                          onToggle={setConfirmCustomer}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 md:hidden">
              {customers.map((customer) => (
                <div
                  key={customer._id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300">
                        {customer.company ? <Building2 size={20} /> : <Users size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{customer.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {customer.company || customer.customerCode || 'Customer'}
                        </p>
                      </div>
                    </div>
                    <StatusPill active={customer.isActive} />
                  </div>

                  <div className="mt-4">
                    <ContactDetails customer={customer} />
                  </div>

                  <p className="mt-3 flex gap-2 text-sm text-slate-400">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    {customer.shippingAddress ||
                      customer.billingAddress ||
                      'No address provided'}
                  </p>

                  <div className="mt-4 border-t border-slate-800 pt-3">
                    <CustomerActions
                      customer={customer}
                      onView={setViewingCustomer}
                      onEdit={openEditModal}
                      onToggle={setConfirmCustomer}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row">
          <p className="text-xs text-slate-400">
            {pagination.total === 0
              ? 'No records'
              : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )} of ${pagination.total}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() =>
                setPagination((current) => ({ ...current, page: current.page - 1 }))
              }
              className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-24 text-center text-sm text-slate-300">
              Page {pagination.page} of {Math.max(1, pagination.pages)}
            </span>
            <button
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() =>
                setPagination((current) => ({ ...current, page: current.page + 1 }))
              }
              className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter verified contact information.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitForm} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer Name *">
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Customer or contact name"
                    maxLength={120}
                    required
                  />
                </Field>

                <Field label="Company">
                  <input
                    name="company"
                    value={form.company}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Company name, if applicable"
                    maxLength={150}
                  />
                </Field>

                <Field label="Customer Code">
                  <input
                    name="customerCode"
                    value={form.customerCode}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Optional unique code"
                    maxLength={50}
                  />
                </Field>

                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="name@example.com"
                    maxLength={254}
                  />
                </Field>

                <Field label="Phone">
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Contact phone"
                    maxLength={30}
                  />
                </Field>

                <Field label="Billing Address">
                  <input
                    name="billingAddress"
                    value={form.billingAddress}
                    onChange={updateForm}
                    className={inputClass}
                    placeholder="Billing address"
                    maxLength={500}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Shipping Address">
                    <input
                      name="shippingAddress"
                      value={form.shippingAddress}
                      onChange={updateForm}
                      className={inputClass}
                      placeholder="Delivery address"
                      maxLength={500}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={updateForm}
                      className={inputClass}
                      placeholder="Optional notes"
                      rows={3}
                      maxLength={1000}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingCustomer
                      ? 'Save Changes'
                      : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-details-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 id="customer-details-title" className="font-bold text-white">
                  Customer details
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Complete profile for {viewingCustomer.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                aria-label="Close customer details"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <CustomerDetail label="Name" value={viewingCustomer.name} />
              <CustomerDetail
                label="Customer code"
                value={viewingCustomer.customerCode}
              />
              <CustomerDetail label="Company" value={viewingCustomer.company} />
              <CustomerDetail
                label="Status"
                value={viewingCustomer.isActive ? 'Active' : 'Inactive'}
              />
              <CustomerDetail label="Email" value={viewingCustomer.email} />
              <CustomerDetail label="Phone" value={viewingCustomer.phone} />
              <CustomerDetail
                label="Billing address"
                value={viewingCustomer.billingAddress}
                multiline
              />
              <CustomerDetail
                label="Shipping address"
                value={viewingCustomer.shippingAddress}
                multiline
              />
              <div className="sm:col-span-2">
                <CustomerDetail
                  label="Notes"
                  value={viewingCustomer.notes}
                  multiline
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {confirmCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">
              {confirmCustomer.isActive ? 'Deactivate Customer?' : 'Activate Customer?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {confirmCustomer.isActive
                ? `This will hide ${confirmCustomer.name} from the active customer list. The record will remain in the database.`
                : `This will restore ${confirmCustomer.name} to the active customer list.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmCustomer(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={changeStatus}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <div className="rounded-xl bg-indigo-500/15 p-2.5 text-indigo-300">
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold">{value}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
          : 'bg-slate-700/50 text-slate-300 ring-1 ring-slate-600'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function ContactDetails({ customer }) {
  return (
    <div className="space-y-2">
      {customer.email && (
        <p className="flex items-center gap-2 break-all text-slate-300">
          <Mail size={14} className="shrink-0 text-slate-500" />
          {customer.email}
        </p>
      )}
      {customer.phone && (
        <p className="flex items-center gap-2 text-slate-300">
          <Phone size={14} className="shrink-0 text-slate-500" />
          {customer.phone}
        </p>
      )}
      {!customer.email && !customer.phone && (
        <span className="text-slate-500">No contact details</span>
      )}
    </div>
  )
}

function CustomerDetail({ label, value, multiline = false }) {
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

function CustomerActions({ customer, onView, onEdit, onToggle }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onView(customer)}
        title="View customer"
        aria-label={`View ${customer.name}`}
        className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-300"
      >
        <Eye size={16} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(customer)}
        title="Edit customer"
        aria-label={`Edit ${customer.name}`}
        className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-indigo-300"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={() => onToggle(customer)}
        title={customer.isActive ? 'Deactivate customer' : 'Activate customer'}
        aria-label={`${customer.isActive ? 'Deactivate' : 'Activate'} ${customer.name}`}
        className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
      >
        {customer.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
      </button>
    </div>
  )
}
