import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Loader2, Truck, Users, Fuel, AlertCircle, Save } from 'lucide-react'
import type { HubNeed, HubNeedType, PublicHub } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole } from '@/lib/session'
import { API_URL } from '@/lib/auth/config'
import { authHeaders } from '@/components/hub-dashboard'
import { useToast } from '@/components/ui/toast'

interface NeedDefinition {
  type: HubNeedType
  label: string
  description: string
  Icon: typeof Truck
  notePlaceholder: string
}

const NEED_DEFINITIONS: NeedDefinition[] = [
  {
    type: 'TRANSPORT',
    label: 'Transporte',
    description: 'Necesito un vehículo para mover carga',
    Icon: Truck,
    notePlaceholder: 'ej: camión 350 con conductor',
  },
  {
    type: 'LABOR',
    label: 'Mano de obra',
    description: 'Necesito voluntarios para cargar/clasificar',
    Icon: Users,
    notePlaceholder: 'ej: 4 personas para descarga',
  },
  {
    type: 'FUEL',
    label: 'Combustible',
    description: 'Necesito gasolina o diésel',
    Icon: Fuel,
    notePlaceholder: 'ej: 200 lts diésel',
  },
  {
    type: 'OTHER',
    label: 'Otros',
    description: 'Seguridad, espacio, servicios, etc.',
    Icon: AlertCircle,
    notePlaceholder: 'ej: necesito custodia policial',
  },
]

interface HubNeedsEditorProps {
  hub: PublicHub
}

async function updateMyHubNeeds(needs: HubNeed[]): Promise<PublicHub> {
  const res = await fetch(`${API_URL}/resources/my-hub/needs`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ needs }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'No se pudieron guardar las necesidades')
  }
  return (await res.json()).hub
}

async function updateHubNeeds(hubId: string, needs: HubNeed[]): Promise<PublicHub> {
  const res = await fetch(`${API_URL}/resources/hubs/${hubId}/needs`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ needs }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'No se pudieron guardar las necesidades')
  }
  return (await res.json()).hub
}

export function HubNeedsEditor({ hub }: HubNeedsEditorProps) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()

  // Local state — un mapa por tipo con { active, note }. Más simple que
  // operar sobre el array para el form.
  const [state, setState] = useState(() => buildStateFromHub(hub))

  // Si el hub cambia desde el servidor (otra pestaña, recarga), re-sincronizamos.
  useEffect(() => {
    setState(buildStateFromHub(hub))
  }, [hub.id, JSON.stringify(hub.needs)])

  const isOwner = hub.coordinatorId === user?.id
  const isAdmin = hasAnyRole(user, 'ADMIN', 'MANAGER')
  const canEdit = isOwner || isAdmin

  const mut = useMutation({
    mutationFn: async (needs: HubNeed[]) => {
      return isOwner && !isAdmin
        ? updateMyHubNeeds(needs)
        : updateHubNeeds(hub.id, needs)
    },
    onSuccess: (updated) => {
      qc.setQueryData<PublicHub | null>(['hub', updated.id], updated)
      qc.invalidateQueries({ queryKey: ['my-hub'] })
      qc.invalidateQueries({ queryKey: ['centros'] })
      qc.invalidateQueries({ queryKey: ['hubs-all'] })
      toast.success(
        'Necesidades actualizadas',
        updated.needs.length === 0
          ? 'Este centro no tiene necesidades activas.'
          : `${updated.needs.length} necesidad(es) visibles en el mapa.`,
      )
    },
    onError: (e: Error) => toast.error('No se pudo guardar', e.message),
  })

  const buildPayload = (): HubNeed[] => {
    return NEED_DEFINITIONS.filter((d) => state[d.type].active).map((d) => {
      const note = state[d.type].note.trim()
      return note ? { type: d.type, note } : { type: d.type }
    })
  }

  const initial = buildStateFromHub(hub)
  const isDirty = JSON.stringify(state) !== JSON.stringify(initial)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mut.mutate(buildPayload())
  }

  return (
    <section className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-300" />
          <h3 className="font-bold text-white">Necesidades operativas</h3>
        </div>
        {hub.needs.length > 0 && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-amber-400/40 bg-amber-400/10 text-amber-300">
            {hub.needs.length} activa{hub.needs.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <p className="text-xs text-white/50 mb-4">
        Marca lo que necesite este centro para operar. Aparece resaltado en el mapa público.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {NEED_DEFINITIONS.map(({ type, label, description, Icon, notePlaceholder }) => {
          const entry = state[type]
          const active = entry.active

          return (
            <div
              key={type}
              className={`rounded-xl border p-3 transition-colors ${
                active
                  ? 'border-amber-400/40 bg-amber-400/5'
                  : 'border-[#2B5F8E]/30 bg-[#0F2337]/60'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], active: e.target.checked },
                    }))
                  }
                  className="mt-1 w-4 h-4 accent-amber-400 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-amber-300' : 'text-white/40'}`} />
                    <span className={`font-semibold text-sm ${active ? 'text-white' : 'text-white/70'}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-0.5">{description}</p>
                </div>
              </label>

              {active && (
                <input
                  type="text"
                  maxLength={280}
                  value={entry.note}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], note: e.target.value },
                    }))
                  }
                  placeholder={notePlaceholder}
                  className="needs-input mt-3 w-full"
                />
              )}
            </div>
          )
        })}

        {canEdit && (
          <button
            type="submit"
            disabled={!isDirty || mut.isPending}
            className="mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0F2337] text-sm font-bold hover:bg-[#C8DCF0] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar necesidades
          </button>
        )}
      </form>

      <style>{`
        .needs-input {
          border-radius: 0.5rem;
          border: 1px solid rgba(251, 191, 36, 0.3);
          background: rgba(15, 35, 55, 0.7);
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          color: white;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }
        .needs-input::placeholder { color: rgba(255, 255, 255, 0.3); }
        .needs-input:focus {
          border-color: rgb(251, 191, 36);
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.25);
        }
        .needs-input:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </section>
  )
}

type EditorState = Record<HubNeedType, { active: boolean; note: string }>

function buildStateFromHub(hub: PublicHub): EditorState {
  const state: EditorState = {
    TRANSPORT: { active: false, note: '' },
    LABOR: { active: false, note: '' },
    FUEL: { active: false, note: '' },
    OTHER: { active: false, note: '' },
  }
  for (const need of hub.needs ?? []) {
    state[need.type] = { active: true, note: need.note ?? '' }
  }
  return state
}
