
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Boxes,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string()
      .trim()
      .email('Enter a valid email address')
      .max(254, 'Email cannot exceed 254 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

function Register() {
  const { register: createAccount, user, loading } = useAuth()
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Checking your session...
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (values) => {
    setSubmitting(true)

    try {
      await createAccount({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })

      toast.success('Account created successfully!')
      navigate('/', { replace: true })
    } catch (error) {
      const responseData = error.response?.data
      const message =
        responseData?.message ||
        responseData?.errors?.[0]?.message ||
        'Unable to create your account. Please try again.'

      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.22),_transparent_23%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_25%),linear-gradient(135deg,#020817_0%,#0f172a_100%)] lg:grid-cols-[1.08fr_0.92fr]">
      <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-xl rounded-[30px] border border-slate-700/80 bg-slate-900/80 p-6 shadow-[0_30px_90px_rgba(2,8,23,0.7)] backdrop-blur-xl sm:p-8">
          <Link to="/login" className="mb-8 inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/30">
              <Boxes size={24} />
            </span>
            <span>
              <span className="block text-2xl font-bold tracking-tight text-slate-100">
                SmartStock
              </span>
              <span className="text-sm text-slate-400">
                Inventory management
              </span>
            </span>
          </Link>

          <div className="mb-7">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              Get started
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Create your account
            </h1>
            <p className="mt-2 text-base text-slate-400">
              Set up your account to start managing inventory in one place.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Full name
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/20">
                <UserRound size={18} className="shrink-0 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="w-full bg-transparent py-3.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-sm text-rose-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/20">
                <Mail size={18} className="shrink-0 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full bg-transparent py-3.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-rose-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Password
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/20">
                <LockKeyhole size={18} className="shrink-0 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full bg-transparent py-3.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Confirm password
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/20">
                <LockKeyhole size={18} className="shrink-0 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  className="w-full bg-transparent py-3.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  className="text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-sm text-rose-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-blue-300 hover:text-blue-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-slate-950/80 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative">
          <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-xs font-medium tracking-[0.2em] text-blue-200">
            INVENTORY, SIMPLIFIED
          </span>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-5xl font-bold leading-tight tracking-tight">
            Better stock.
            <br />
            Smarter decisions.
            <br />
            <span className="text-blue-300">One workspace.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
            Create your account and bring products, stock movements, and
            inventory insights together.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
              <Boxes className="mb-4 text-blue-300" size={25} />
              <p className="font-semibold text-slate-100">Stock visibility</p>
              <p className="mt-1 text-sm text-slate-400">
                Know what you have
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
              <LockKeyhole className="mb-4 text-blue-300" size={25} />
              <p className="font-semibold text-slate-100">Secure access</p>
              <p className="mt-1 text-sm text-slate-400">
                Protected user sessions
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default Register
