import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import Home from './pages/Home/Home'
import Reservations from './pages/Reservations/Reservations'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Courts from './pages/Courts/Courts'
import Contact from './pages/Contact/Contact'
import Profile from './pages/Profile/Profile'
import Tournaments from './pages/Tournaments/Tournaments'
import Clases from './pages/clases/clases'
import Tienda from './pages/Tienda/Tienda'
import Admin from './pages/Admin/Admin'

const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <i className="material-icons spinning" style={{ fontSize: '48px', color: '#1e3c72' }}>
          refresh
        </i>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.rol !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <i className="material-icons spinning" style={{ fontSize: '48px', color: '#1e3c72' }}>
          refresh
        </i>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <i className="material-icons spinning" style={{ fontSize: '48px', color: '#1e3c72' }}>
          refresh
        </i>
      </div>
    )
  }

  // Redirect if already logged in and trying to access login page
  if (isAuthenticated && location.pathname === '/login') {
    const from = location.state?.from?.pathname || '/reservar'
    return <Navigate to={from} replace />
  }

  return children
}

function AppContent() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <>
      {/* El Navbar y Footer de cliente solo se muestran para clientes, nunca en el panel de admin */}
      {!isAdminRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/reservar"
          element={
            <ProtectedRoute>
              <Reservations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/registro"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/canchas" element={<Courts />} />
        <Route path="/contacto" element={<Contact />} />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        
        <Route path="/torneos" element={<Tournaments />} />
        <Route path="/clases" element={<Clases />} /> 
        <Route path="/tiendas" element={<Tienda />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App