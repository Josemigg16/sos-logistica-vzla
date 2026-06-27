import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Search,
  Layers,
  Inbox,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole } from '@/lib/session'
import { INVENTORY_CATEGORIES, type ProductMaster } from '@sos/shared'
import { API_URL } from '@/lib/auth/config'

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

function AdminCatalogPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery<ProductMaster[]>({
    queryKey: ['productos'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/productos`)
      if (!res.ok) throw new Error('Error al cargar productos')
      return res.json()
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
      <div className="mb-6 sm:mb-8">
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
              className="p-5 rounded-2xl border border-[#2B5F8E]/30 bg-[#152D46]/50 backdrop-blur-sm flex flex-col justify-between hover:border-[#4A89C0]/50 transition-all duration-300"
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
                <span className="text-[9px] text-white/20 font-mono">
                  {prod.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
