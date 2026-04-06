/**
 * Store del módulo chofer — consume la API real del backend.
 * Reemplaza el uso de logisticsStore en las pantallas de chofer.
 */
import { create } from 'zustand'
import { api } from '../../../services/api'

// ── Tipos que devuelve el backend ─────────────────────────────

export interface FotoAPI {
  id: string
  tipo: 'GUIA' | 'HOJA_RUTA'
  urlPreview: string
  publicId: string | null
  guiaId: string | null
  rutaId: string | null
  createdAt: string
}

export interface NovedadAPI {
  id: string
  tipo: string
  descripcion: string
  createdAt: string
  guiaId: string
  seguimientos: { id: string; nota: string; createdAt: string }[]
}

export interface GuiaAPI {
  id: string
  numeroGuia: string
  descripcion: string
  estado: 'PENDIENTE' | 'ENTREGADO' | 'INCIDENCIA'
  clienteId: string
  rutaId: string
  stopId: string
  receptorNombre: string | null
  horaLlegada: string | null
  horaSalida: string | null
  temperatura: string | null
  observaciones: string | null
  fotos: FotoAPI[]
  novedades: NovedadAPI[]
}

export interface StopAPI {
  id: string
  orden: number
  direccion: string
  lat: number
  lng: number
  notas: string | null
  clienteId: string
  cliente: { id: string; nombre: string }
  guias: GuiaAPI[]
}

export interface RutaAPI {
  id: string
  fecha: string
  estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'
  choferId: string
  chofer: { id: string; nombre: string }
  stops: StopAPI[]
  guias: GuiaAPI[]
  fotos: FotoAPI[]
}

// ── Estado ────────────────────────────────────────────────────

interface ChoferState {
  rutas: RutaAPI[]
  rutaActual: RutaAPI | null
  loading: boolean
  loadingDetalle: boolean
  error: string | null

  // Acciones
  fetchMisRutas: () => Promise<void>
  fetchRuta: (id: string) => Promise<void>
  iniciarRuta: (id: string) => Promise<void>
  finalizarRuta: (id: string) => Promise<void>
  marcarEntregado: (guiaId: string) => Promise<void>
  guardarDetalle: (guiaId: string, detalle: {
    receptorNombre?: string
    horaLlegada?: string
    horaSalida?: string
    temperatura?: string
    observaciones?: string
  }) => Promise<void>
  registrarIncidencia: (guiaId: string, tipo: string, descripcion: string) => Promise<void>
  subirFotoGuia: (guiaId: string, file: File) => Promise<FotoAPI>
  subirFotoRuta: (rutaId: string, file: File) => Promise<FotoAPI>
  eliminarFoto: (fotoId: string) => Promise<void>
}

// ── Helper: actualiza una guía dentro de rutaActual ───────────
function patchGuia(rutas: RutaAPI[], rutaActual: RutaAPI | null, guiaId: string, patch: Partial<GuiaAPI>) {
  const updateGuias = (guias: GuiaAPI[]) =>
    guias.map((g) => (g.id === guiaId ? { ...g, ...patch } : g))

  const updateStops = (stops: StopAPI[]) =>
    stops.map((s) => ({ ...s, guias: updateGuias(s.guias) }))

  return {
    rutas: rutas.map((r) => ({
      ...r,
      guias: updateGuias(r.guias),
      stops: updateStops(r.stops),
    })),
    rutaActual: rutaActual
      ? { ...rutaActual, guias: updateGuias(rutaActual.guias), stops: updateStops(rutaActual.stops) }
      : null,
  }
}

// ── Store ─────────────────────────────────────────────────────

export const useChoferStore = create<ChoferState>((set, get) => ({
  rutas: [],
  rutaActual: null,
  loading: false,
  loadingDetalle: false,
  error: null,

  fetchMisRutas: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get<RutaAPI[]>('/rutas/mis-rutas')
      set({ rutas: data, loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message ?? 'Error al cargar rutas', loading: false })
    }
  },

  fetchRuta: async (id) => {
    set({ loadingDetalle: true, error: null })
    try {
      const { data } = await api.get<RutaAPI>(`/rutas/${id}`)
      set({ rutaActual: data, loadingDetalle: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message ?? 'Error al cargar ruta', loadingDetalle: false })
    }
  },

  iniciarRuta: async (id) => {
    const { data } = await api.patch(`/rutas/${id}/estado`, { estado: 'EN_CURSO' })
    set((s) => ({
      rutas: s.rutas.map((r) => (r.id === id ? { ...r, estado: 'EN_CURSO' } : r)),
      rutaActual: s.rutaActual?.id === id ? { ...s.rutaActual, estado: 'EN_CURSO' } : s.rutaActual,
    }))
    return data
  },

  finalizarRuta: async (id) => {
    const { data } = await api.patch(`/rutas/${id}/estado`, { estado: 'COMPLETADA' })
    set((s) => ({
      rutas: s.rutas.map((r) => (r.id === id ? { ...r, estado: 'COMPLETADA' } : r)),
      rutaActual: s.rutaActual?.id === id ? { ...s.rutaActual, estado: 'COMPLETADA' } : s.rutaActual,
    }))
    return data
  },

  marcarEntregado: async (guiaId) => {
    await api.patch(`/guias/${guiaId}/estado`, { estado: 'ENTREGADO' })
    const { rutas, rutaActual } = get()
    set(patchGuia(rutas, rutaActual, guiaId, { estado: 'ENTREGADO' }))
  },

  guardarDetalle: async (guiaId, detalle) => {
    const { data } = await api.patch<GuiaAPI>(`/guias/${guiaId}/detalle`, detalle)
    const { rutas, rutaActual } = get()
    set(patchGuia(rutas, rutaActual, guiaId, detalle))
    return data
  },

  registrarIncidencia: async (guiaId, tipo, descripcion) => {
    await api.post('/novedades', { guiaId, tipo, descripcion })
    // El backend cambia la guía a INCIDENCIA automáticamente
    const { rutas, rutaActual } = get()
    set(patchGuia(rutas, rutaActual, guiaId, { estado: 'INCIDENCIA' }))
  },

  subirFotoGuia: async (guiaId, file) => {
    const form = new FormData()
    form.append('foto', file)
    const { data } = await api.post<FotoAPI>(`/fotos/guia/${guiaId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    // Agregar foto a la guía en el store
    const { rutas, rutaActual } = get()
    const addFoto = (guias: GuiaAPI[]) =>
      guias.map((g) => g.id === guiaId ? { ...g, fotos: [...g.fotos, data] } : g)
    const addFotoStops = (stops: StopAPI[]) =>
      stops.map((s) => ({ ...s, guias: addFoto(s.guias) }))
    set({
      rutas: rutas.map((r) => ({ ...r, guias: addFoto(r.guias), stops: addFotoStops(r.stops) })),
      rutaActual: rutaActual
        ? { ...rutaActual, guias: addFoto(rutaActual.guias), stops: addFotoStops(rutaActual.stops) }
        : null,
    })
    return data
  },

  subirFotoRuta: async (rutaId, file) => {
    const form = new FormData()
    form.append('foto', file)
    const { data } = await api.post<FotoAPI>(`/fotos/ruta/${rutaId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    set((s) => ({
      rutaActual: s.rutaActual?.id === rutaId
        ? { ...s.rutaActual, fotos: [...s.rutaActual.fotos, data] }
        : s.rutaActual,
    }))
    return data
  },

  eliminarFoto: async (fotoId) => {
    await api.delete(`/fotos/${fotoId}`)
    // Remover de guías y de fotos de ruta
    const removeFoto = (fotos: FotoAPI[]) => fotos.filter((f) => f.id !== fotoId)
    const removeFromGuias = (guias: GuiaAPI[]) =>
      guias.map((g) => ({ ...g, fotos: removeFoto(g.fotos) }))
    const removeFromStops = (stops: StopAPI[]) =>
      stops.map((s) => ({ ...s, guias: removeFromGuias(s.guias) }))
    set((s) => ({
      rutas: s.rutas.map((r) => ({
        ...r,
        fotos: removeFoto(r.fotos),
        guias: removeFromGuias(r.guias),
        stops: removeFromStops(r.stops),
      })),
      rutaActual: s.rutaActual
        ? {
            ...s.rutaActual,
            fotos: removeFoto(s.rutaActual.fotos),
            guias: removeFromGuias(s.rutaActual.guias),
            stops: removeFromStops(s.rutaActual.stops),
          }
        : null,
    }))
  },
}))
