import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Inbox, Loader2, Plus, Save, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { useToast } from '@/components/ui/toast'
import { FormSheet } from '@/components/ui/form-sheet'
import { INVENTORY_CATEGORIES, type ProductMaster } from '@sos/shared'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'

export const Route = createFileRoute('/admin/catalog')({
  component: CatalogGate,
})

function CatalogGate() {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" />
  }
  return <AdminCatalogPage />
}

const CATEGORY_COLORS: Record<string, string> = {
  'Víveres': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Medicamentos': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Higiene personal': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Abrigo y refugio': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Herramientas': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Productos de limpieza': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Artículos para bebés y grupos vulnerables': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
}

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

function AdminCatalogPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Modals States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductMaster | null>(null)
  // Error del servidor para los formularios de crear/editar.
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery<ProductMaster[]>({
    queryKey: ['productos'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/productos`)
      if (!res.ok) throw new Error('Error al cargar productos')
      return res.json()
    },
  })

  // Open Create Modal
  const openCreate = () => {
    setServerError(null)
    setIsCreateOpen(true)
  }

  // Open Edit Modal
  const openEdit = (prod: ProductMaster) => {
    setServerError(null)
    setEditingProduct(prod)
  }

  // Create Mutation
  const createProductMutation = useMutation({
    mutationFn: async (newProducts: Omit<ProductMaster, 'id'>[]) => {
      const createdList: ProductMaster[] = []
      for (const prod of newProducts) {
        const res = await fetch(`${API_URL}/productos`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(prod),
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `Error al crear el producto "${prod.name}"`)
        }
        const data = await res.json()
        createdList.push(data)
      }
      return createdList
    },
    onSuccess: (createdList) => {
      queryClient.setQueryData<ProductMaster[]>(['productos'], (prev = []) => {
        return [...prev, ...createdList]
      })
      setIsCreateOpen(false)
      toast.success('Productos creados', `${createdList.length} producto(s) agregados al catálogo.`)
    },
    onError: (error: any) => {
      setServerError(error.message || 'Error al guardar los productos')
    },
  })

  // Edit Mutation
  const updateProductMutation = useMutation({
    mutationFn: async (updated: ProductMaster) => {
      const res = await fetch(`${API_URL}/productos/${updated.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: updated.name,
          category: updated.category,
          unit: updated.unit,
          description: updated.description,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al actualizar producto')
      }
      return res.json()
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ProductMaster[]>(['productos'], (prev = []) => {
        return prev.map((p) => (p.id === updated.id ? updated : p))
      })
      setEditingProduct(null)
      toast.success('Cambios guardados', `Se actualizó "${updated.name}".`)
    },
    onError: (error: any) => {
      setServerError(error.message || 'Error al actualizar el producto')
    },
  })

  // Delete Mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/productos/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar producto')
      }
      return res.json()
    },
    onSuccess: (_, id) => {
      const removed = queryClient.getQueryData<ProductMaster[]>(['productos'])?.find((p) => p.id === id)
      queryClient.setQueryData<ProductMaster[]>(['productos'], (prev = []) => {
        return prev.filter((p) => p.id !== id)
      })
      setDeletingProduct(null)
      toast.success('Producto eliminado', removed ? `"${removed.name}" fue dado de baja del catálogo.` : 'Se eliminó del catálogo.')
    },
    onError: (error: any) => {
      toast.error('No se pudo eliminar', error.message || 'Intenta nuevamente en unos segundos.')
    },
  })

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch =
        prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !selectedCategory || prod.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto lg:mx-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em] mb-2 block">
            Referencia de suministros
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
            CATÁLOGO DE PRODUCTOS
          </h1>
          <p className="text-sm text-white/50 max-w-lg">
            Consulta el maestro oficial de productos y las unidades de medida estandarizadas para el sistema SOS Logística.
          </p>
        </div>
        <div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-lg active:scale-95 cursor-pointer border border-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Crear Producto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Barra de búsqueda */}
        <div className="relative flex items-center max-w-md">
          <Search className="absolute left-3.5 w-4 h-4 text-[#C8DCF0]/40" />
          <input
            type="text"
            placeholder="Buscar productos por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#152D46]/40 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4A89C0]/50 shadow-lg backdrop-blur-sm transition-all duration-300"
          />
        </div>

        {/* Categorías Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-200 border active:scale-[0.96] transition-transform cursor-pointer ${
              !selectedCategory
                ? 'bg-white border-white text-[#0F2337]'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Todos
          </button>
          {INVENTORY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-200 border active:scale-[0.96] transition-transform cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white border-white text-[#0F2337]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#4A89C0] animate-spin mb-2" />
          <p className="text-white/40 text-xs">Cargando catálogo oficial...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border border-dashed border-[#2B5F8E]/40 bg-[#152D46]/40">
          <Inbox className="w-12 h-12 text-white/15 mb-4" />
          <h3 className="text-white font-bold text-base mb-1.5">No se encontraron productos</h3>
          <p className="text-white/40 text-xs max-w-xs">
            Intenta cambiar el filtro de búsqueda o seleccionar otra categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="p-5 rounded-2xl border border-[#2B5F8E]/30 bg-[#152D46]/50 backdrop-blur-sm flex flex-col justify-between hover:border-[#4A89C0]/50 transition-all duration-300 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <h3 className="font-bold text-white text-[14px] leading-tight select-text">{prod.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/15 text-white/70 font-mono whitespace-nowrap">
                    {prod.unit}
                  </span>
                </div>
                <p className="text-white/50 text-[11px] leading-relaxed mb-4 select-text">
                  {prod.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[#2B5F8E]/20 pt-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                    CATEGORY_COLORS[prod.category] || 'bg-white/5 text-white/75 border-white/10'
                  }`}
                >
                  {prod.category}
                </span>

                {/* Acciones Editar / Eliminar */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => openEdit(prod)}
                    className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all duration-200 cursor-pointer"
                    title="Editar producto"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingProduct(prod)}
                    className="p-1 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200 cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[9px] text-white/20 font-mono">
                  {prod.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación de Producto */}
      {isCreateOpen && (
        <ProductFormSheet
          title="Crear Nuevo Producto"
          submitLabel="Guardar Producto"
          serverError={serverError}
          isSubmitting={createProductMutation.isPending}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={(values) => {
            setServerError(null)
            createProductMutation.mutate(values)
          }}
        />
      )}

      {/* Modal de Edición de Producto */}
      {editingProduct && (
        <ProductFormSheet
          title="Editar Producto"
          submitLabel="Guardar Cambios"
          initial={editingProduct}
          serverError={serverError}
          isSubmitting={updateProductMutation.isPending}
          onClose={() => setEditingProduct(null)}
          onSubmit={(values) => {
            setServerError(null)
            updateProductMutation.mutate({ id: editingProduct.id, ...values })
          }}
        />
      )}

      {/* Modal / Dialog de Confirmación de Eliminación */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0F2337] border border-red-500/35 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <h2 className="text-white font-bold text-base uppercase tracking-wide mb-3 flex items-center gap-2">
              ¿Eliminar Producto del Catálogo?
            </h2>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Esta acción dará de baja al producto <strong className="text-white">"{deletingProduct.name}"</strong> del catálogo maestro. Asegúrate de que no existan dependencias o registros de necesidades activos vinculados a este producto.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteProductMutation.isPending}
                onClick={() => deleteProductMutation.mutate(deletingProduct.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
              >
                {deleteProductMutation.isPending ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Form Sheet (crear / editar producto) ---

interface ProductFormValues {
  name: string
  category: typeof INVENTORY_CATEGORIES[number]
  unit: string
  description: string
}

interface DraftProduct {
  name: string
  category: typeof INVENTORY_CATEGORIES[number]
  unit: string
  description: string
}

interface ProductFormSheetProps {
  title: string
  submitLabel: string
  /** Producto a editar; ausente → modo creación. */
  initial?: ProductMaster
  /** Error del servidor (mutación) a mostrar en el form. */
  serverError: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: any) => void
}

function ProductFormSheet({
  title,
  submitLabel,
  initial,
  serverError,
  isSubmitting,
  onClose,
  onSubmit,
}: ProductFormSheetProps) {
  // Estado para modo Edición (único producto)
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<typeof INVENTORY_CATEGORIES[number]>(
    initial?.category ?? INVENTORY_CATEGORIES[0],
  )
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  // Estado para modo Creación (múltiples productos)
  const [productsList, setProductsList] = useState<DraftProduct[]>([
    { name: '', category: INVENTORY_CATEGORIES[0], unit: '', description: '' }
  ])

  const [validationError, setValidationError] = useState<string | null>(null)

  // Dirty tracking
  const editSnapshot = JSON.stringify({ name, category, unit, description })
  const createSnapshot = JSON.stringify(productsList)
  
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) {
    baselineRef.current = initial ? editSnapshot : createSnapshot
  }
  const isDirty = initial 
    ? baselineRef.current !== editSnapshot
    : productsList.length > 1 || productsList[0].name !== '' || productsList[0].unit !== '' || productsList[0].description !== ''

  const formError = validationError ?? serverError

  const addProductRow = () => {
    setProductsList((prev) => [
      ...prev,
      { name: '', category: INVENTORY_CATEGORIES[0], unit: '', description: '' }
    ])
  }

  const removeProductRow = (index: number) => {
    setProductsList((prev) => prev.filter((_, idx) => idx !== index))
  }

  const updateProductRow = (index: number, patch: Partial<DraftProduct>) => {
    setProductsList((prev) => prev.map((item, idx) => idx === index ? { ...item, ...patch } : item))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (initial) {
      // Modo Edición
      if (!name.trim()) {
        setValidationError('El nombre del producto es requerido')
        return
      }
      if (!unit.trim()) {
        setValidationError('La unidad de medida es requerida')
        return
      }

      onSubmit({
        name: name.trim(),
        category,
        unit: unit.trim(),
        description: description.trim(),
      })
    } else {
      // Modo Creación (Múltiple)
      for (let i = 0; i < productsList.length; i++) {
        const prod = productsList[i]
        if (!prod.name.trim()) {
          setValidationError(`Producto #${i + 1}: El nombre es requerido`)
          return
        }
        if (!prod.unit.trim()) {
          setValidationError(`Producto #${i + 1}: La unidad de medida es requerida`)
          return
        }
      }

      onSubmit(
        productsList.map((prod) => ({
          name: prod.name.trim(),
          category: prod.category,
          unit: prod.unit.trim(),
          description: prod.description.trim(),
        }))
      )
    }
  }

  return (
    <FormSheet
      title={title}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="lg"
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={requestClose}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200 active:scale-[0.97] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        {formError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center">
            <span className="font-semibold">Error:</span> {formError}
          </div>
        )}

        {initial ? (
          // Vista única de edición
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                Nombre del Producto
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Agua embotellada, Harina de maíz, Gasas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#152D46]/40 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#4A89C0]/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#152D46] border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 cursor-pointer"
                >
                  {INVENTORY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                  Unidad de Medida
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. litros, kg, unidades, paquetes"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#152D46]/40 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#4A89C0]/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                Descripción
              </label>
              <textarea
                rows={3}
                placeholder="Detalles sobre el suministro, especificaciones o empaque..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#152D46]/40 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#4A89C0]/50 resize-none"
              />
            </div>
          </div>
        ) : (
          // Vista múltiple de creación
          <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-1">
            {productsList.map((prod, idx) => (
              <div key={idx} className="relative p-5 rounded-2xl border border-[#2B5F8E]/30 bg-[#152D46]/30 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#C8DCF0]/80 uppercase tracking-wider">
                    Producto #{idx + 1}
                  </span>
                  {productsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductRow(idx)}
                      className="p-1 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200 cursor-pointer"
                      title="Eliminar este producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Agua embotellada, Harina de maíz, Gasas"
                    value={prod.name}
                    onChange={(e) => updateProductRow(idx, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#152D46]/40 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#4A89C0]/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                      Categoría
                    </label>
                    <select
                      value={prod.category}
                      onChange={(e) => updateProductRow(idx, { category: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-[#152D46] border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 cursor-pointer"
                    >
                      {INVENTORY_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                      Unidad de Medida
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. litros, kg, unidades, paquetes"
                      value={prod.unit}
                      onChange={(e) => updateProductRow(idx, { unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#152D46]/40 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#4A89C0]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C8DCF0]/60 mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre el suministro, especificaciones o empaque..."
                    value={prod.description}
                    onChange={(e) => updateProductRow(idx, { description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#152D46]/40 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#4A89C0]/50 resize-none"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addProductRow}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#2B5F8E]/40 bg-[#152D46]/20 hover:bg-[#1E4A6E]/40 text-[#C8DCF0]/80 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Añadir otro producto
            </button>
          </div>
        )}
      </div>
    </FormSheet>
  )
}
