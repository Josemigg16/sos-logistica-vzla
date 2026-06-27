import { createFileRoute, Link } from '@tanstack/react-router'
import { PackagePlus, ChevronRight, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto lg:mx-0">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#C8DCF0]/60" />
          <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">
            Panel interno
          </span>
        </div>
        <h1
          className="text-white leading-[0.95] tracking-tight mb-3"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
          }}
        >
          GESTIÓN DE<br />
          <span style={{ color: '#C8DCF0' }}>LA CAMPAÑA</span>
        </h1>
        <p className="text-sm text-white/50 max-w-lg leading-relaxed">
          Administra las necesidades activas, prioridades y fechas de los centros de acopio.
          Los cambios se reflejan en tiempo real en el panel público.
        </p>
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminSectionCard
          to="/admin/needs"
          icon={<PackagePlus className="w-6 h-6" />}
          title="Necesidades"
          description="Crear, editar y cerrar requerimientos públicos."
          stat="8 ítems activos"
        />
      </div>
    </div>
  )
}

function AdminSectionCard({
  to,
  icon,
  title,
  description,
  stat,
}: {
  to: string
  icon: React.ReactNode
  title: string
  description: string
  stat: string
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm
                 hover:border-[#4A89C0]/60 hover:bg-[#1E4A6E]/80
                 hover:shadow-[0_8px_32px_rgba(43,95,142,0.3)]
                 active:scale-[0.98] transition-[transform,border-color,background-color,box-shadow] duration-300
                 overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#2B5F8E] text-white shadow-[0_4px_16px_rgba(43,95,142,0.4)]">
          {icon}
        </div>
        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-[color,transform] duration-300" />
      </div>
      <div>
        <h3
          className="text-white mb-1 leading-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.4rem' }}
        >
          {title}
        </h3>
        <p className="text-[13px] text-white/50 leading-relaxed">{description}</p>
      </div>
      <div className="pt-2 border-t border-[#2B5F8E]/20 text-[10px] font-bold text-[#C8DCF0]/60 uppercase tracking-wider">
        {stat}
      </div>
    </Link>
  )
}
