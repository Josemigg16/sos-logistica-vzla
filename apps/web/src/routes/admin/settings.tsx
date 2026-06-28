import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Loader2, Save, Phone, Settings as SettingsIcon, Info } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_USERS } from '@/lib/session'
import { useToast } from '@/components/ui/toast'
import { useSupportContact } from '@/lib/settings/use-support-contact'
import { updateSupportPhone } from '@/lib/settings/client'

export const Route = createFileRoute('/admin/settings')({ component: SettingsGate })

function SettingsGate() {
  const { user } = useAuth()
  // Solo ADMIN puede ver/editar la configuración global (mismo nivel que gestionar usuarios).
  if (!hasAnyRole(user, ...ROLES_MANAGE_USERS)) return <Navigate to="/admin" />
  return <SettingsPage />
}

function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl mx-auto lg:mx-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <SettingsIcon className="w-4 h-4 text-[#C8DCF0]/60" />
          <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">
            Configuración global
          </span>
        </div>
        <h1
          className="text-white leading-[0.95] tracking-tight mb-2"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          AJUSTES
        </h1>
        <p className="text-sm text-white/50 max-w-lg">
          Datos compartidos por toda la aplicación. Los cambios se aplican de inmediato sin necesidad de redeploy.
        </p>
      </div>

      <SupportPhoneSection />
    </div>
  )
}

function SupportPhoneSection() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useSupportContact()
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)

  // Sincronizar el valor del input con el dato remoto la primera vez que llega.
  useEffect(() => {
    if (data && !touched) setValue(data.phone)
  }, [data, touched])

  const mut = useMutation({
    mutationFn: updateSupportPhone,
    onSuccess: (updated) => {
      qc.setQueryData(['settings', 'support-phone'], updated)
      setTouched(false)
      toast.success(
        updated.phone ? 'Número guardado' : 'Número borrado',
        updated.phone
          ? `El nuevo contacto es "${updated.phone}".`
          : 'La pantalla pública volverá a mostrar el placeholder.',
      )
    },
    onError: (e: Error) => toast.error('No se pudo guardar el número', e.message),
  })

  const isDirty = touched && (data?.phone ?? '') !== value.trim()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mut.mutate(value.trim())
  }

  return (
    <section className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2B5F8E] text-white shrink-0">
          <Phone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base sm:text-lg">Número de contacto de Portuguesa Unida</h2>
          <p className="text-sm text-white/50 mt-0.5 leading-relaxed">
            Se muestra a las personas que registran un centro de acopio desde el mapa público
            para que puedan llamar a un coordinador y verificar su centro.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
            Número (formato libre)
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setTouched(true) }}
            placeholder="+58 412 123 4567"
            maxLength={40}
            disabled={isLoading || mut.isPending}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[#2B5F8E]/40 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4A89C0] focus:ring-2 focus:ring-[#4A89C0]/30 transition disabled:opacity-50"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          />
          <span className="text-[10.5px] text-white/40">
            Aceptamos cualquier formato visible (con espacios, guiones, paréntesis). El link de WhatsApp se
            arma automáticamente quitando los caracteres no numéricos.
          </span>
        </label>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#4A89C0]/10 border border-[#4A89C0]/20 text-[12px] text-[#C8DCF0]/80">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#4A89C0]" />
          <span>
            Si dejas este campo vacío y guardas, la pantalla pública mostrará "Número de contacto pendiente de
            configuración" en lugar de un botón con un número.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-white/40">
            {isLoading ? (
              <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Cargando…</span>
            ) : data?.updatedAt ? (
              <>Última actualización: <span className="text-white/60">{new Date(data.updatedAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span></>
            ) : (
              <span className="italic">Todavía no se ha configurado un número.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isDirty || mut.isPending || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold text-sm hover:bg-[#C8DCF0] active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.04em' }}
          >
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            GUARDAR
          </button>
        </div>
      </form>
    </section>
  )
}
