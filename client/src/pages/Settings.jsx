
import { useEffect, useState } from 'react'
import { UserRound, SlidersHorizontal, ShieldCheck, Save, RotateCcw } from 'lucide-react'
import api from '../lib/api'

const defaultPreferences = {
  lowStockAlerts: true,
  compactTable: false,
  confirmStockChanges: true,
}

export default function Settings() {
  const [profile, setProfile] = useState(null)
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [passwordForm, setPasswordForm] = useState({currentPassword: '', newPassword: '', confirmPassword: '',})
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        const response = await api.get('/auth/me')
        const data = response.data?.user ?? response.data

        if (mounted) setProfile(data)

const preferencesResponse = await api.get('/settings/preferences')

if (mounted) {
  setPreferences({
    ...defaultPreferences,
    ...preferencesResponse.data.preferences,
  })
}
      } catch {
        if (mounted) setError('Unable to load your profile. Please refresh or sign in again.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [])

  function updatePreference(key, value) {
    setPreferences((current) => ({ ...current, [key]: value }))
    setMessage('')
    setError('')
  }

  async function savePreferences() {
  setMessage('')
  setError('')
  setSaving(true)

  try {
    const response = await api.patch('/settings/preferences', preferences)

    setPreferences({
      ...defaultPreferences,
      ...response.data.preferences,
    })

    setMessage(response.data.message || 'Preferences saved successfully.')
  } catch (err) {
    setError(
      err.response?.data?.message ||
        'Unable to save preferences. Please try again.'
    )
  } finally {
    setSaving(false)
  }
}

  
async function saveProfile() {
  setSaving(true)
  setMessage('')
  setError('')

  try {
    const name = profile?.name?.trim()

    if (!name || name.length < 2 || name.length > 100) {
      setError('Name must be between 2 and 100 characters.')
      return
    }

    const response = await api.patch('/settings/profile', { name })

    setProfile((current) => ({
      ...current,
      ...response.data.user,
    }))

    setMessage(response.data.message || 'Profile updated successfully.')
  } catch (err) {
    setError(
      err.response?.data?.message ||
        'Unable to update your profile. Please try again.'
    )
  } finally {
    setSaving(false)
  }
}


  async function resetPreferences() {
  setMessage('')
  setError('')
  setSaving(true)

  try {
    const response = await api.patch(
      '/settings/preferences',
      defaultPreferences
    )

    setPreferences({
      ...defaultPreferences,
      ...response.data.preferences,
    })

    setMessage('Preferences reset and saved successfully.')
  } catch (err) {
    setError(
      err.response?.data?.message ||
        'Unable to reset preferences. Please try again.'
    )
  } finally {
    setSaving(false)
  }
}

async function changePassword(event) {
  event.preventDefault()
  setMessage('')
  setError('')

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    setError('New passwords do not match.')
    return
  }

  if (passwordForm.newPassword.length < 8) {
    setError('New password must be at least 8 characters.')
    return
  }

  setPasswordSaving(true)

  try {
    const response = await api.post('/auth/change-password', passwordForm)

    setMessage(
      response.data?.message ||
        'Password changed successfully. Please sign in again.'
    )

    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })

    window.setTimeout(() => {
      window.location.href = '/login'
    }, 1500)
  } catch (err) {
    setError(
      err.response?.data?.message ||
        'Unable to change password. Please try again.'
    )
  } finally {
    setPasswordSaving(false)
  }
}

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="mb-7">
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
          Account
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your account and application preferences.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-[0_22px_50px_rgba(2,8,23,0.25)]">
          {[
            { id: 'profile', label: 'Profile', icon: UserRound },
            { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
            { id: 'security', label: 'Security', icon: ShieldCheck },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id)
                setMessage('')
                setError('')
              }}
              aria-pressed={activeTab === id}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-400/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_22px_50px_rgba(2,8,23,0.25)] backdrop-blur-sm sm:p-7 lg:col-span-3">
          {activeTab === 'profile' && (
            <>
              <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-5">
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300 ring-1 ring-inset ring-blue-400/15">
                  <UserRound size={23} />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Profile information</h2>
                  <p className="text-sm text-slate-400">Your current account details</p>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-slate-400">Loading profile...</p>
              ) : profile ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    saveProfile()
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profile?.name || ''}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      maxLength={100}
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Email
                    </label>
                    <input
                      value={profile.email || ''}
                      readOnly
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-300 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Role
                    </label>
                    <input
                      value={profile.role || 'Not provided'}
                      readOnly
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm capitalize text-slate-300 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save profile'}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-400">
                  Profile information is unavailable.
                </p>
              )}
            </>
          )}

          {activeTab === 'preferences' && (
            <>
              <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-5">
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300 ring-1 ring-inset ring-blue-400/15">
                  <SlidersHorizontal size={23} />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Application preferences</h2>
                  <p className="text-sm text-slate-400">
                    Adjust how you work with inventory.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {[
                  {
                    key: 'lowStockAlerts',
                    title: 'Low-stock alerts',
                    description: 'Enable the preference for highlighting low-stock items.',
                  },
                  {
                    key: 'compactTable',
                    title: 'Compact tables',
                    description: 'Preference for a denser table layout.',
                  },
                  {
                    key: 'confirmStockChanges',
                    title: 'Confirm stock changes',
                    description: 'Preference for confirming inventory changes before submission.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition-colors hover:border-slate-700"
                  >
                    <span>
                      <span className="block text-sm font-medium text-slate-100">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-slate-400">
                        {item.description}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences[item.key]}
                      disabled={saving || loading}
                      onChange={(event) =>
                        updatePreference(item.key, event.target.checked)
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-blue-500 disabled:cursor-not-allowed"
                    />
                  </label>
                ))}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={savePreferences}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save preferences'}
                  </button>

                  <button
                    type="button"
                    onClick={resetPreferences}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                </div>
              </div>
            </>
          )}

          
{activeTab === 'security' && (
  <>
    <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-5">
      <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300 ring-1 ring-inset ring-blue-400/15">
        <ShieldCheck size={23} />
      </div>
      <div>
        <h2 className="font-semibold text-white">Security</h2>
        <p className="text-sm text-slate-400">
          Change your account password securely.
        </p>
      </div>
    </div>

    <form onSubmit={changePassword} className="max-w-xl space-y-5">
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-slate-300">
          Current password
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={72}
          value={passwordForm.currentPassword}
          onChange={(event) =>
            setPasswordForm((current) => ({
              ...current,
              currentPassword: event.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate-300">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={passwordForm.newPassword}
          onChange={(event) =>
            setPasswordForm((current) => ({
              ...current,
              newPassword: event.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"
        />
        <p className="mt-1 text-xs text-slate-500">
          Use at least 8 characters.
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-300">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={passwordForm.confirmPassword}
          onChange={(event) =>
            setPasswordForm((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"
        />
      </div>

      <button
        type="submit"
        disabled={passwordSaving}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ShieldCheck size={16} />
        {passwordSaving ? 'Changing password...' : 'Change password'}
      </button>
    </form>
  </>
)}

        </section>
      </div>
    </div>
  )
}
