import { createFileRoute, Outlet, Link, redirect, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { LogOut, LayoutDashboard, PackagePlus, ShieldAlert, Menu, X } from 'lucide-react'
import { getCurrentUser, hasAnyRole, ROLES_MANAGE_NEEDS } from '@/lib/session'
import logotipo from '@/assets/branding/white-logotipo.webp'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    const user = getCurrentUser()
    if (!user) {
      throw redirect({ to: '/' })
    }
    const allowed = hasAnyRole(user, ...ROLES_MANAGE_NEEDS, 'MANAGER', 'HUB_COORDINATOR')
    if (!allowed) {
      throw redirect({ to: '/' })
    }
    return { user }
  },
  component: AdminLayout,
})

const SIDEBAR_WIDTH = 256 // 16rem / 64 tailwind units

function AdminLayout() {
  const { user } = Route.useRouteContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const currentPath = useRouterState({ select: (s) => s.location.pathname })

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [currentPath])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [drawerOpen])

  // Close drawer with Escape
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <div
      className="min-h-dvh w-full"
      style={{ background: 'linear-gradient(180deg, #0F2337 0%, #0A1B2A 100%)' }}
    >
      {/* Grid pattern background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(43,95,142,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(43,95,142,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ─── Mobile header (visible only < lg) ─── */}
      <header className="lg:hidden flex items-center justify-between gap-3 p-3 border-b border-[#2B5F8E]/30 bg-[#0F2337]/95 backdrop-blur-md sticky top-0 z-30">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#2B5F8E]/40 border border-[#2B5F8E]/60 text-white active:scale-[0.96] transition-[transform,background-color] duration-200 shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/admin" className="flex items-center gap-2 min-w-0">
          <img src={logotipo} alt="Portuguesa Unida" className="h-6 w-auto object-contain shrink-0" />
          <span className="text-[10px] font-bold text-[#C8DCF0]/60 uppercase tracking-wider truncate">
            Panel admin
          </span>
        </Link>

        <Link
          to="/"
          className="flex items-center justify-center w-10 h-10 rounded-lg text-white/60 hover:text-white hover:bg-[#2B5F8E]/30 active:scale-[0.96] transition-[transform,background-color,color] duration-200 shrink-0"
          aria-label="Salir del panel"
          title="Salir del panel"
        >
          <LogOut className="w-4 h-4" />
        </Link>
      </header>

      {/* ─── Desktop sidebar (fixed, ≥lg) ─── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-20 flex-col border-r border-[#2B5F8E]/30 bg-[#0F2337]/90 backdrop-blur-md"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <SidebarContent user={user} />
      </aside>

      {/* ─── Mobile drawer (< lg) ─── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#2B5F8E]/40 bg-[#0F2337] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            style={{ width: 'min(80vw, 280px)' }}
            role="dialog"
            aria-label="Menú de navegación"
          >
            <div className="flex items-center justify-between p-3 border-b border-[#2B5F8E]/20 shrink-0">
              <img src={logotipo} alt="Portuguesa Unida" className="h-6 w-auto object-contain" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/10 active:scale-[0.96] transition-[transform,background-color,color] duration-200"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent user={user} compact />
          </aside>
        </>
      )}

      {/* ─── Main content ─── */}
      <main
        className="relative z-10 min-h-dvh min-w-0"
        style={{ paddingLeft: 0 }}
      >
        <div className="lg:pl-64">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ─── Sidebar content (shared by desktop & mobile drawer) ───
function SidebarContent({
  user,
  compact = false,
}: {
  user: { username: string; role: string }
  compact?: boolean
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      {!compact && (
        <div className="p-5 pb-3 shrink-0">
          <Link to="/admin" className="flex items-center gap-2">
            <img
              src={logotipo}
              alt="Portuguesa Unida"
              className="h-7 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(43,95,142,0.5))' }}
            />
          </Link>
        </div>
      )}

      {/* Nav (scrollable if it overflows) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-2 pb-4">
        <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.15em]">
          <ShieldAlert className="w-3 h-3" />
          Panel interno
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink to="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Panel principal" exact />
          <NavLink to="/admin/needs" icon={<PackagePlus className="w-4 h-4" />} label="Necesidades" />
        </nav>
      </div>

      {/* User footer */}
      <div className="p-5 pt-4 border-t border-[#2B5F8E]/20 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#2B5F8E] text-white font-bold text-sm shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user.username}</p>
            <p className="text-[10px] text-[#C8DCF0]/50 font-medium uppercase tracking-wide truncate">
              {user.role}
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-[#2B5F8E]/30 active:scale-[0.96] transition-[transform,background-color,color] duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir del panel
        </Link>
      </div>
    </div>
  )
}

function NavLink({
  to,
  icon,
  label,
  exact,
}: {
  to: string
  icon: React.ReactNode
  label: string
  exact?: boolean
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-[#2B5F8E]/30 active:scale-[0.97] transition-[transform,background-color,color] duration-200"
      activeProps={{
        className: 'bg-[#2B5F8E] text-white shadow-[0_2px_8px_rgba(43,95,142,0.4)]',
      }}
      activeOptions={{ exact: exact ?? false }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  )
}
