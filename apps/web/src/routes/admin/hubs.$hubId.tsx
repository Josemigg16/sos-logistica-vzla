import { createFileRoute, Navigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_HUBS } from '@/lib/session'
import { HubDashboard, fetchHubById } from '@/components/hub-dashboard'

export const Route = createFileRoute('/admin/hubs/$hubId')({ component: HubDetailGate })

function HubDetailGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_MANAGE_HUBS)) return <Navigate to="/admin" />
  return <HubDetailPage />
}

function HubDetailPage() {
  const { hubId } = Route.useParams()
  const { user } = useAuth()
  const { data: hub, isLoading, error } = useQuery({
    queryKey: ['hub', hubId],
    queryFn: () => fetchHubById(hubId),
  })

  // ADMIN/MANAGER/ZODI_SENDER pueden asignar vehículos a lotes desde esta vista.
  const canManageVehicles =
    user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'ZODI_SENDER'

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto lg:mx-0">
      <div className="mb-6">
        <Link
          to="/admin/hubs"
          className="inline-flex items-center gap-1.5 text-xs text-[#C8DCF0]/60 hover:text-[#C8DCF0] transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a logística
        </Link>
        <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em] block">
          Gestión de centro
        </span>
        <h1
          className="text-white leading-[0.95] tracking-tight mt-1"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}
        >
          {hub?.name?.toUpperCase() ?? 'CENTRO'}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-[#4A89C0]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-sm text-red-300">
          {error instanceof Error ? error.message : 'No se pudo cargar el centro.'}
        </div>
      ) : !hub ? (
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 p-6 text-sm text-white/60">
          No se encontró el centro solicitado.{' '}
          <Link to="/admin/hubs" className="text-[#4A89C0] hover:text-[#C8DCF0] underline">
            Volver al listado
          </Link>.
        </div>
      ) : (
        <HubDashboard hub={hub} canManageVehicles={canManageVehicles} />
      )}
    </div>
  )
}
