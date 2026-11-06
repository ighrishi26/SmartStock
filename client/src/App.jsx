
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

const Dashboard = lazy(() => import('./components/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Products = lazy(() => import('./pages/Products'))
const Categories = lazy(() => import('./pages/Categories'))
const Stock = lazy(() => import('./pages/Stock'))
const Reports = lazy(() => import('./pages/Reports'))
const Users = lazy(() => import('./pages/Users'))
const LowStock = lazy(() => import('./pages/LowStock'))
const StockAdjustments = lazy(() => import('./pages/StockAdjustments'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'))
const GoodsReceived = lazy(() => import('./pages/GoodsReceived'))
const Customers = lazy(() => import('./pages/Customers'))
const SalesOrders = lazy(() => import('./pages/SalesOrders'))
const SalesReturns = lazy(() => import('./pages/SalesReturns'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
          Loading page...
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/low-stock" element={<LowStock />} />
            <Route path="/stock-adjustments" element={<StockAdjustments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/goods-received" element={<GoodsReceived />} />
            <Route path="/users" element={<Users />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/sales-orders" element={<SalesOrders />} />
            <Route path="/sales-returns" element={<SalesReturns />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
