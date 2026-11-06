
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  Settings,
  Settings2,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-500/20 text-white ring-1 ring-blue-400/30'
      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
  }`

function NavigationLink({ to, icon: Icon, children, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      className={linkClass}
    >
      <Icon size={18} className="shrink-0" />
      <span>{children}</span>
    </NavLink>
  )
}

function NavigationSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-300"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon size={14} />}
          {title}
        </span>
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {open && <div className="mt-1 space-y-1">{children}</div>}
    </section>
  )
}

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)

  const [openSections, setOpenSections] = useState({
    overview: true,
    inventory: true,
    operations: true,
    insights: true,
    administration: true,
  })

  const toggleSection = (section) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  const closeMobileMenu = () => setMobileOpen(false)

  const handleLogout = async () => {
    try {
      await logout()
      closeMobileMenu()
      toast.success('You have signed out')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Could not complete logout. Please try again.')
    }
  }

  const isAdmin = user?.role === 'admin'

  const sidebar = (
    <>
      <div className="flex h-[72px] shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-slate-900/60 px-3.5 text-white shadow-lg shadow-blue-950/20">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md shadow-blue-950/30 ring-1 ring-white/20">
          <Boxes size={21} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-5 tracking-tight">SmartStock</h1>
          <p className="mt-0.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.1em] text-blue-100/75">
            Inventory management
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDesktopOpen((open) => !open)}
          aria-label="Collapse navigation"
          title="Collapse sidebar"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 transition-colors hover:border-white/20 hover:bg-white/15 hover:text-white lg:flex"
        >
          <Menu size={19} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={closeMobileMenu}
          aria-label="Close navigation"
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav
        className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <NavigationSection
          title="Overview"
          icon={Activity}
          open={openSections.overview}
          onToggle={() => toggleSection('overview')}
        >
          <NavigationLink to="/" icon={LayoutDashboard} onNavigate={closeMobileMenu}>
            Dashboard
          </NavigationLink>
        </NavigationSection>

        <NavigationSection
          title="Inventory"
          icon={Boxes}
          open={openSections.inventory}
          onToggle={() => toggleSection('inventory')}
        >
          <NavigationLink to="/products" icon={Package} onNavigate={closeMobileMenu}>
            Products
          </NavigationLink>
          <NavigationLink to="/categories" icon={Tags} onNavigate={closeMobileMenu}>
            Categories
          </NavigationLink>
          <NavigationLink to="/stock" icon={ArrowLeftRight} onNavigate={closeMobileMenu}>
            Stock Movements
          </NavigationLink>
          <NavigationLink to="/low-stock" icon={AlertTriangle} onNavigate={closeMobileMenu}>
            Low Stock Alerts
          </NavigationLink>
          <NavigationLink to="/stock-adjustments" icon={ClipboardList} onNavigate={closeMobileMenu}>
            Stock Adjustments
          </NavigationLink>
        </NavigationSection>

        <NavigationSection
          title="Operations"
          icon={ShoppingCart}
          open={openSections.operations}
          onToggle={() => toggleSection('operations')}
        >
          <NavigationLink to="/suppliers" icon={Truck} onNavigate={closeMobileMenu}>
            Suppliers
          </NavigationLink>
          <NavigationLink to="/purchase-orders" icon={ShoppingCart} onNavigate={closeMobileMenu}>
  Purchase Orders
</NavigationLink>
          <NavigationLink
  to="/goods-received"
  icon={Package}
  onNavigate={closeMobileMenu}
>
  Goods Received
</NavigationLink>
          <NavigationLink
  to="/customers"
  icon={Users}
  onNavigate={closeMobileMenu}
>
  Customers
</NavigationLink>
          <NavigationLink to="/sales-orders" icon={ShoppingCart} onNavigate={closeMobileMenu}>
  Sales Orders
</NavigationLink>
          <NavigationLink
  to="/sales-returns"
  icon={RotateCcw}
  onNavigate={closeMobileMenu}
>
  Sales Returns
</NavigationLink>
        </NavigationSection>

        <NavigationSection
          title="Insights"
          icon={BarChart3}
          open={openSections.insights}
          onToggle={() => toggleSection('insights')}
        >
          <NavigationLink to="/reports" icon={BarChart3} onNavigate={closeMobileMenu}>
            Reports & Analytics
          </NavigationLink>
        </NavigationSection>

        {isAdmin && (
          <NavigationSection
            title="Administration"
            icon={Settings}
            open={openSections.administration}
            onToggle={() => toggleSection('administration')}
          >
            <NavigationLink to="/users" icon={Users} onNavigate={closeMobileMenu}>
              User Management
            </NavigationLink>
            <NavigationLink
  to="/settings"
  icon={Settings2}
  onNavigate={closeMobileMenu}
>
  Settings
</NavigationLink>
          </NavigationSection>
        )}
      </nav>

      <div className="mt-4 shrink-0 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 font-semibold uppercase text-blue-200">
            {(user?.name || 'U').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">
              {user?.name || 'User'}
            </p>
            <p className="text-xs capitalize text-slate-400">
              {user?.role || 'Staff'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.2),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.2),_transparent_28%),linear-gradient(180deg,#020817_0%,#0f172a_100%)] text-slate-100">
      {desktopOpen && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-800 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl lg:flex">
          {sidebar}
        </aside>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-slate-800 bg-slate-950 p-4 shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className={desktopOpen ? 'lg:pl-72' : ''}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-slate-700 p-2 text-slate-200 hover:bg-slate-800 lg:hidden"
            >
              <Menu size={21} />
            </button>
            {!desktopOpen && (
              <button
                type="button"
                onClick={() => setDesktopOpen(true)}
                aria-label="Open navigation"
                aria-expanded={false}
                className="hidden rounded-xl border border-slate-700 p-2 text-slate-200 hover:bg-slate-800 lg:block"
              >
                <Menu size={21} />
              </button>
            )}
            <div className="flex items-center gap-2 font-bold">
              <Boxes size={21} className="text-blue-400" />
              SmartStock
            </div>
          </div>
          <div className="h-9 w-9 rounded-full bg-blue-500/15 flex items-center justify-center text-xs font-semibold text-blue-200">
            {(user?.name || 'U').slice(0, 2)}
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
