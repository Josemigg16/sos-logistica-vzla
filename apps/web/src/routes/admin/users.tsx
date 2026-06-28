import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  AlertTriangle,
  Shield,
  ShieldOff,
  UserCircle,
} from 'lucide-react'
import type { AdminUserView, RoleName, UserStatus } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_USERS } from '@/lib/session'
import { useToast } from '@/components/ui/toast'
import { FormSheet } from '@/components/ui/form-sheet'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'

export const Route = createFileRoute('/admin/users')({
  component: UsersGate,
})

function UsersGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_MANAGE_USERS)) {
    return <Navigate to="/admin" />
  }
  return <AdminUsersPage />
}

// --- API client ---
function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

/** Traduce mensajes de Zod a español para que el usuario los entienda. */
const ZOD_ES: Record<string, string> = {
  'Invalid email': 'Email inválido',
  'Required': 'Requerido',
  'String must contain at least 5 character(s)': 'Mínimo 5 caracteres',
  'String must contain at least 4 character(s)': 'Mínimo 4 caracteres',
  'String must contain at least 3 character(s)': 'Mínimo 3 caracteres',
}

const FIELD_LABELS: Record<string, string> = {
  username: 'Teléfono',
  telefono: 'Teléfono',
  password: 'Contraseña',
  email: 'Email',
  role: 'Rol',
  status: 'Estado',
}

/** Extrae un mensaje legible de la respuesta de error del backend. */
async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as
    | { error?: string; details?: { fieldErrors?: Record<string, string[]> } }
    | null

  if (!body) return fallback

  const fieldErrors = body.details?.fieldErrors
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const parts = Object.entries(fieldErrors).map(([field, msgs]) => {
      const label = FIELD_LABELS[field] ?? field
      const msg = msgs?.[0] ?? ''
      return `${label}: ${ZOD_ES[msg] ?? msg}`
    })
    return parts.join(' · ')
  }

  return body.error ?? fallback
}

async function fetchUsers(): Promise<AdminUserView[]> {
  const res = await fetch(`${API_URL}/auth/users`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los usuarios')
  const data = await res.json()
  return data.users
}

interface CreateUserDraft {
  username: string
  password: string
  role: RoleName
  email?: string
}

async function createUser(draft: CreateUserDraft): Promise<AdminUserView> {
  const payload = {
    telefono: draft.username,
    password: draft.password,
    role: draft.role,
    email: draft.email || undefined,
  }
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo crear el usuario'))
  const data = await res.json()
  return data.user
}

interface UpdateUserDraft {
  role?: RoleName
  status?: UserStatus
  email?: string | null
  password?: string
}

async function updateUser(id: string, draft: UpdateUserDraft): Promise<AdminUserView> {
  const res = await fetch(`${API_URL}/auth/users/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(draft),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar el usuario'))
  const data = await res.json()
  return data.user
}

async function deleteUser(id: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo eliminar el usuario'))
  return id
}

// --- Constants ---
const ROLES: { value: RoleName; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Coordinador' },
  { value: 'ZODI_SENDER', label: 'ZODI Emisor' },
  { value: 'ZODI_DESTINATION', label: 'ZODI Destino' },
  { value: 'HUB_COORDINATOR', label: 'Coord. Centro' },
  { value: 'DRIVER', label: 'Chofer' },
  { value: 'VOLUNTEER', label: 'Voluntario' },
]

const ROLE_STYLES: Record<RoleName, string> = {
  ADMIN: 'bg-white text-[#0F2337] border-white',
  MANAGER: 'bg-[#4A89C0] text-white border-[#4A89C0]',
  ZODI_SENDER: 'bg-[#2B5F8E] text-white border-[#2B5F8E]',
  ZODI_DESTINATION: 'bg-[#2B5F8E] text-white border-[#2B5F8E]',
  HUB_COORDINATOR: 'bg-[#1E4A6E] text-white border-[#2B5F8E]/60',
  DRIVER: 'bg-[#152D46] text-[#C8DCF0] border-[#2B5F8E]/40',
  VOLUNTEER: 'bg-[#152D46] text-[#C8DCF0] border-[#2B5F8E]/40',
}

// --- Page ---
function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<AdminUserView | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<AdminUserView | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      invalidate()
      setCreating(false)
      setErrorMsg(null)
      toast.success('Usuario creado', `"${user.username}" ya puede iniciar sesión.`)
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
      toast.error('No se pudo crear el usuario', err.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: UpdateUserDraft }) => updateUser(id, draft),
    onSuccess: (user) => {
      invalidate()
      setEditing(null)
      setErrorMsg(null)
      toast.success('Usuario actualizado', `Se guardaron los cambios de "${user.username}".`)
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
      toast.error('No se pudo actualizar el usuario', err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      const name = deleting?.username
      invalidate()
      setDeleting(null)
      setErrorMsg(null)
      toast.success('Usuario eliminado', name ? `"${name}" perdió acceso al sistema.` : 'Perdió acceso al sistema.')
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
      toast.error('No se pudo eliminar el usuario', err.message)
    },
  })

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto lg:mx-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8 flex-wrap">
        <div>
          <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em] mb-2 block">
            Gestión interna
          </span>
          <h1
            className="text-white leading-[0.95] tracking-tight mb-2"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontStyle: 'italic',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            USUARIOS DEL SISTEMA
          </h1>
          <p className="text-sm text-white/50 max-w-lg">
            Crea cuentas para nuevos coordinadores, choferes o voluntarios. Cambia roles, suspende o elimina.
          </p>
        </div>

        <button
          onClick={() => { setCreating(true); setErrorMsg(null) }}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold
                     shadow-[0_4px_16px_rgba(255,255,255,0.15)]
                     hover:shadow-[0_8px_24px_rgba(255,255,255,0.25)] hover:bg-[#C8DCF0]
                     active:scale-[0.96] transition-[transform,box-shadow,background-color] duration-200"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '0.95rem', letterSpacing: '0.05em' }}
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          NUEVO USUARIO
        </button>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          <span className="text-sm text-white">{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-white/60 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando...
        </div>
      ) : users.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 backdrop-blur-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2B5F8E]/40 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Teléfono</th>
                  <th className="text-left px-5 py-3">Rol</th>
                  <th className="text-left px-5 py-3">Estado</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Creado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === currentUser?.id}
                    onEdit={() => { setEditing(u); setErrorMsg(null) }}
                    onDelete={() => { setDeleting(u); setErrorMsg(null) }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden flex flex-col divide-y divide-[#2B5F8E]/30">
            {users.map((u) => (
              <UserMobileCard
                key={u.id}
                user={u}
                isSelf={u.id === currentUser?.id}
                onEdit={() => { setEditing(u); setErrorMsg(null) }}
                onDelete={() => { setDeleting(u); setErrorMsg(null) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {creating && (
        <CreateUserModal
          onClose={() => { setCreating(false); setErrorMsg(null) }}
          onSubmit={(draft) => createMutation.mutate(draft)}
          isSubmitting={createMutation.isPending}
          errorMsg={errorMsg}
          onDismissError={() => setErrorMsg(null)}
        />
      )}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => { setEditing(null); setErrorMsg(null) }}
          onSubmit={(draft) => updateMutation.mutate({ id: editing.id, draft })}
          isSubmitting={updateMutation.isPending}
          errorMsg={errorMsg}
          onDismissError={() => setErrorMsg(null)}
        />
      )}
      {deleting && (
        <DeleteConfirmModal
          user={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

// --- Row (desktop) ---
function UserRow({
  user,
  isSelf,
  onEdit,
  onDelete,
}: {
  user: AdminUserView
  isSelf: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const roleLabel = ROLES.find((r) => r.value === user.role)?.label ?? user.role
  return (
    <tr className="border-b border-[#2B5F8E]/20 last:border-b-0 hover:bg-[#2B5F8E]/15 transition-colors duration-150">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#2B5F8E] text-white font-bold text-sm shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-[13px] truncate">{user.username}</div>
            {isSelf && (
              <div className="text-[10px] text-[#C8DCF0]/60 uppercase tracking-wide">Tú</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${ROLE_STYLES[user.role]}`}>
          {roleLabel}
        </span>
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={user.status} />
      </td>
      <td className="px-5 py-4 text-[12px] text-white/60 truncate max-w-[200px]">
        {user.email ?? <span className="text-white/30 italic">sin email</span>}
      </td>
      <td className="px-5 py-4 text-[11px] text-white/40 tabular-nums">
        {new Date(user.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <IconButton onClick={onEdit} label="Editar"><Pencil className="w-3.5 h-3.5" /></IconButton>
          <IconButton onClick={onDelete} label="Eliminar" variant="danger" disabled={isSelf}>
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

// --- Mobile card ---
function UserMobileCard({
  user,
  isSelf,
  onEdit,
  onDelete,
}: {
  user: AdminUserView
  isSelf: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const roleLabel = ROLES.find((r) => r.value === user.role)?.label ?? user.role
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#2B5F8E] text-white font-bold text-sm shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm truncate">{user.username}</h3>
            <p className="text-[11px] text-white/40 truncate">
              {user.email ?? <span className="italic">sin email</span>}
            </p>
          </div>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${ROLE_STYLES[user.role]}`}>
          {roleLabel}
        </span>
        {isSelf && (
          <span className="text-[10px] font-bold text-[#C8DCF0]/60 uppercase tracking-wide">· Tú</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2B5F8E]/40 border border-[#2B5F8E]/60 text-white/90 text-[11px] font-semibold hover:bg-[#2B5F8E]/60 active:scale-[0.97] transition-[transform,background-color] duration-200"
        >
          <Pencil className="w-3 h-3" /> Editar
        </button>
        <button
          onClick={onDelete}
          disabled={isSelf}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white/60 text-[11px] font-semibold hover:bg-white/10 hover:text-white active:scale-[0.97] transition-[transform,background-color,color] duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// --- Status badge ---
function StatusBadge({ status }: { status: UserStatus }) {
  const active = status === 'ACTIVE'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
      active
        ? 'bg-[#4A89C0]/20 text-[#C8DCF0] border-[#4A89C0]/40'
        : 'bg-white/10 text-white/50 border-white/15'
    }`}>
      {active ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
      {active ? 'Activo' : 'Suspendido'}
    </span>
  )
}

// --- Icon button ---
function IconButton({
  onClick,
  label,
  children,
  variant = 'default',
  disabled,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  variant?: 'default' | 'danger'
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`flex items-center justify-center w-8 h-8 rounded-lg active:scale-[0.96] transition-[transform,background-color,color] duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
        variant === 'danger'
          ? 'text-white/40 hover:text-white hover:bg-white/10 disabled:hover:bg-transparent'
          : 'text-[#C8DCF0]/70 hover:text-[#C8DCF0] hover:bg-[#2B5F8E]/40'
      }`}
    >
      {children}
    </button>
  )
}

// --- Empty state ---
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border border-dashed border-[#2B5F8E]/40 bg-[#152D46]/40">
      <UserCircle className="w-12 h-12 text-white/15 mb-4" />
      <h3 className="text-white font-bold text-base mb-1.5">No hay usuarios</h3>
      <p className="text-white/40 text-xs max-w-xs mb-5">
        Crea la primera cuenta para que tu equipo pueda iniciar sesión.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#0F2337] font-bold text-[12px] uppercase tracking-wide active:scale-[0.96] transition-transform duration-200"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.05em' }}
      >
        <Plus className="w-4 h-4" strokeWidth={3} />
        Crear usuario
      </button>
    </div>
  )
}

// --- Create modal ---
function CreateUserModal({
  onClose,
  onSubmit,
  isSubmitting,
  errorMsg,
  onDismissError,
}: {
  onClose: () => void
  onSubmit: (draft: CreateUserDraft) => void
  isSubmitting: boolean
  errorMsg: string | null
  onDismissError: () => void
}) {
  const [draft, setDraft] = useState<CreateUserDraft>({
    username: '',
    password: '',
    role: 'VOLUNTEER',
    email: '',
  })

  // Dirty tracking: baseline capturada en el primer render (valores iniciales).
  const snapshot = JSON.stringify(draft)
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (draft.username.trim().length < 3) return
    if (draft.password.length < 5) return
    const payload: CreateUserDraft = {
      username: draft.username.trim().toLowerCase(),
      password: draft.password,
      role: draft.role,
    }
    if (draft.email && draft.email.trim()) payload.email = draft.email.trim()
    onSubmit(payload)
  }

  return (
    <FormSheet
      title="Nuevo usuario"
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} submitLabel="CREAR USUARIO" />
      )}
    >
      <div className="flex flex-col gap-4">
        <FormErrorBanner message={errorMsg} onDismiss={onDismissError} />
        <Field label="Teléfono" required hint="número de teléfono válido">
          <input
            type="text"
            value={draft.username}
            onChange={(e) => setDraft({ ...draft, username: e.target.value })}
            required
            minLength={3}
            maxLength={64}
            className="input"
            placeholder="ej. +584121234567"
            autoComplete="off"
          />
        </Field>

        <Field label="Contraseña" required hint="mínimo 5 caracteres">
          <input
            type="password"
            value={draft.password}
            onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            required
            minLength={5}
            maxLength={128}
            className="input"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>

        <Field label="Rol" required>
          <select
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as RoleName })}
            className="input"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>

        <Field label="Email" hint="opcional, para notificaciones">
          <input
            type="email"
            value={draft.email ?? ''}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            maxLength={255}
            className="input"
            placeholder="usuario@ejemplo.com"
          />
        </Field>

        <FormStyles />
      </div>
    </FormSheet>
  )
}

// --- Edit modal ---
function EditUserModal({
  user,
  onClose,
  onSubmit,
  isSubmitting,
  errorMsg,
  onDismissError,
}: {
  user: AdminUserView
  onClose: () => void
  onSubmit: (draft: UpdateUserDraft) => void
  isSubmitting: boolean
  errorMsg: string | null
  onDismissError: () => void
}) {
  const [role, setRole] = useState<RoleName>(user.role)
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [email, setEmail] = useState(user.email ?? '')
  const [password, setPassword] = useState('')

  // Dirty tracking: baseline capturada en el primer render (valores iniciales).
  const snapshot = JSON.stringify({ role, status, email, password })
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const patch: UpdateUserDraft = {}
    if (role !== user.role) patch.role = role
    if (status !== user.status) patch.status = status
    const newEmail = email.trim() || null
    if (newEmail !== user.email) patch.email = newEmail
    if (password.length >= 5) patch.password = password
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    onSubmit(patch)
  }

  return (
    <FormSheet
      title={`Editar: ${user.username}`}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} submitLabel="GUARDAR CAMBIOS" />
      )}
    >
      <div className="flex flex-col gap-4">
        <FormErrorBanner message={errorMsg} onDismiss={onDismissError} />
        <Field label="Rol" required>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleName)}
            className="input"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>

        <Field label="Estado" required>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            className="input"
          >
            <option value="ACTIVE">Activo — puede iniciar sesión</option>
            <option value="SUSPENDED">Suspendido — acceso bloqueado</option>
          </select>
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            className="input"
            placeholder="usuario@ejemplo.com"
          />
        </Field>

        <Field label="Nueva contraseña" hint="dejar vacío para no cambiarla (mín. 5 chars)">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={password ? 5 : undefined}
            maxLength={128}
            className="input"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>

        <FormStyles />
      </div>
    </FormSheet>
  )
}

// --- Delete confirm ---
function DeleteConfirmModal({
  user,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  user: AdminUserView
  onCancel: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-[#0F2337] border border-[#2B5F8E]/50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-white mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3
          className="text-white text-center mb-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.3rem' }}
        >
          ¿ELIMINAR ESTE USUARIO?
        </h3>
        <p className="text-sm text-white/60 text-center mb-1">
          <span className="font-semibold text-white">{user.username}</span>
        </p>
        <p className="text-xs text-white/40 text-center mb-5">
          Esta acción no se puede deshacer. El usuario perderá su acceso de inmediato.
          Si solo quieres bloquearlo temporalmente, mejor suspéndelo.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-[transform,background-color] duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-[#0F2337] font-bold text-sm active:scale-[0.97] transition-transform duration-200 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Shared input styles (antes vivían en ModalShell) ---
function FormStyles() {
  return (
    <style>{`
      .input {
        width: 100%;
        padding: 0.6rem 0.85rem;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(43,95,142,0.4);
        border-radius: 0.5rem;
        color: white;
        font-size: 0.875rem;
        font-family: 'DM Sans', system-ui, sans-serif;
        transition: border-color 200ms, background-color 200ms;
      }
      .input:focus {
        outline: none;
        border-color: rgba(74,137,192,0.8);
        background: rgba(255,255,255,0.06);
      }
      .input::placeholder { color: rgba(255,255,255,0.3); }
      .input option { background: #0F2337; }
    `}</style>
  )
}

// --- Modal actions (footer del FormSheet) ---
function ModalActions({
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  onCancel: () => void
  isSubmitting: boolean
  submitLabel: string
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-[transform,background-color] duration-200 cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0F2337] font-bold text-sm active:scale-[0.97] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.04em' }}
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {submitLabel}
      </button>
    </div>
  )
}

// --- Field wrapper ---
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-white/70 flex items-center gap-1.5">
        {label}
        {required && <span className="text-[#C8DCF0]">*</span>}
        {hint && <span className="text-[10px] font-normal text-white/40 ml-1">— {hint}</span>}
      </span>
      {children}
    </label>
  )
}

// --- In-modal error banner ---
function FormErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss: () => void
}) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-white/30 bg-white/10"
    >
      <AlertTriangle className="w-4 h-4 text-white shrink-0 mt-0.5" />
      <span className="text-[13px] text-white leading-snug flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-white/60 hover:text-white shrink-0"
        aria-label="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
