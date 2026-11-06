import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Users as UsersIcon,
  Search,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserCog,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const roles = ['admin', 'manager', 'staff']
const pageSize = 10

const roleStyles = {
  admin: 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20',
  manager: 'bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20',
  staff: 'bg-slate-700/70 text-slate-300 ring-1 ring-slate-600',
}

function formatDate(date) {
  if (!date) return '—'

  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name) {
  return (name || 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function Users() {
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')

  const isAdmin = user?.role === 'admin'

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false)
      setError('Only administrators can access user management.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.get('/users')
      const data = response.data

      setUsers(
        Array.isArray(data)
          ? data
          : data.users || data.data?.users || [],
      )
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to load users.'

      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { 
      fetchUsers()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()

    return users.filter((item) => {
      const matchesSearch =
        !term ||
        (item.name || '').toLowerCase().includes(term) ||
        (item.email || '').toLowerCase().includes(term)

      const matchesRole =
        roleFilter === 'all' || item.role === roleFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.isActive !== false) ||
        (statusFilter === 'inactive' && item.isActive === false)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((item) => item.role === 'admin').length,
      managers: users.filter((item) => item.role === 'manager').length,
      staff: users.filter((item) => item.role === 'staff').length,
      inactive: users.filter((item) => item.isActive === false).length,
    }),
    [users],
  )

  async function updateUser(id, changes) {
    const target = users.find((item) => item._id === id || item.id === id)

    if (!target) return

    const targetId = target._id || target.id
    const isCurrentUser =
      String(targetId) === String(user?.id || user?._id)

    if (isCurrentUser && changes.role && changes.role !== 'admin') {
      toast.error('You cannot remove your own administrator role.')
      return
    }

    if (isCurrentUser && changes.isActive === false) {
      toast.error('You cannot deactivate your own account.')
      return
    }

    const description = changes.role
      ? `change this user's role to ${changes.role}`
      : changes.isActive
        ? 'activate this account'
        : 'deactivate this account'

    if (!window.confirm(`Are you sure you want to ${description}?`)) {
      return
    }

    setUpdatingId(targetId)

    try {
      const response = await api.patch(`/users/${targetId}`, changes)
      const updatedUser =
        response.data.user ||
        response.data.data?.user ||
        response.data

      setUsers((current) =>
        current.map((item) => {
          const itemId = item._id || item.id

          return String(itemId) === String(targetId)
            ? { ...item, ...changes, ...updatedUser }
            : item
        }),
      )

      toast.success('User updated successfully.')
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Unable to update user.',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-400/20 bg-slate-900/80 p-8 text-center shadow-[0_22px_50px_rgba(2,8,23,0.3)]">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-rose-300" />
          <h1 className="text-2xl font-bold text-white">
            Administrator access required
          </h1>
          <p className="mt-2 text-slate-400">
            You do not have permission to manage users.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.14),_transparent_26%),linear-gradient(180deg,#0b1220_0%,#0f172a_100%)] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-200 ring-1 ring-blue-400/20">
                <UsersIcon size={28} />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
                  Workspace administration
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  User Management
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Manage accounts, access levels, and permissions.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh users
          </button>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total users',
              value: counts.total,
              icon: UsersIcon,
              color: 'bg-blue-500/10 text-blue-200 ring-1 ring-blue-400/20',
            },
            {
              label: 'Administrators',
              value: counts.admins,
              icon: ShieldCheck,
              color: 'bg-violet-500/10 text-violet-200 ring-1 ring-violet-400/20',
            },
            {
              label: 'Managers',
              value: counts.managers,
              icon: UserCog,
              color: 'bg-sky-500/10 text-sky-200 ring-1 ring-sky-400/20',
            },
            {
              label: 'Staff members',
              value: counts.staff,
              icon: UserRound,
              color: 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20',
            },
          ].map((stat) => {
            const Icon = stat.icon

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">
                    {stat.label}
                  </span>
                  <span className={`rounded-xl p-2.5 ${stat.color}`}>
                    <Icon size={21} />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold">
                  {loading ? '—' : stat.value}
                </p>
              </div>
            )
          })}
        </section>

        {counts.inactive > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertCircle size={20} />
            {counts.inactive} inactive account
            {counts.inactive === 1 ? '' : 's'} found.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_22px_50px_rgba(2,8,23,0.3)]">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-bold text-white">Registered users</h2>
            <p className="mt-1 text-sm text-slate-400">
              Search accounts and manage their access.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative md:col-span-1">
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
                  placeholder="Search name or email..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-400"
              >
                <option value="all">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-400"
              >
                <option value="all">All account statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-slate-400">
              <LoaderCircle
                size={32}
                className="animate-spin text-blue-300"
              />
              <p>Loading registered users...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-300" />
              <p className="font-semibold text-slate-100">
                Could not load users
              </p>
              <p className="mt-2 text-sm text-slate-400">{error}</p>
              <button
                type="button"
                onClick={fetchUsers}
                className="mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-blue-400 hover:to-indigo-400"
              >
                Try again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UsersIcon className="mx-auto mb-3 h-10 w-10 text-slate-500" />
              <p className="font-semibold text-slate-200">
                No users found
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-semibold">User</th>
                      <th className="px-5 py-4 font-semibold">Role</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Joined</th>
                      <th className="px-5 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {visibleUsers.map((item) => {
                      const id = item._id || item.id
                      const isCurrentUser =
                        String(id) === String(user?.id || user?._id)
                      const isUpdating = updatingId === id
                      const isActive = item.isActive !== false

                      return (
                        <tr
                          key={id}
                          className="transition hover:bg-slate-800/60"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500/15 font-bold text-blue-200">
                                {getInitials(item.name)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-100">
                                  {item.name || 'Unnamed user'}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs font-medium text-blue-300">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="mt-1 text-slate-400">
                                  {item.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                roleStyles[item.role] ||
                                'bg-slate-700/70 text-slate-300 ring-1 ring-slate-600'
                              }`}
                            >
                              {item.role || 'staff'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20'
                                  : 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20'
                              }`}
                            >
                              {isActive ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <XCircle size={14} />
                              )}
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {formatDate(item.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <select
                                aria-label={`Role for ${item.name}`}
                                value={item.role || 'staff'}
                                disabled={isUpdating || isCurrentUser}
                                onChange={(event) =>
                                  updateUser(id, {
                                    role: event.target.value,
                                  })
                                }
                                className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-2 text-xs font-medium text-slate-200 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {roles.map((role) => (
                                  <option key={role} value={role}>
                                    {role.charAt(0).toUpperCase() +
                                      role.slice(1)}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                disabled={isUpdating || isCurrentUser}
                                onClick={() =>
                                  updateUser(id, {
                                    isActive: !isActive,
                                  })
                                }
                                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isActive
                                    ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                }`}
                              >
                                {isUpdating
                                  ? 'Saving...'
                                  : isActive
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs">
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, filteredUsers.length)} of{' '}
                  {filteredUsers.length} users
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="min-w-24 text-center text-sm text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default Users
