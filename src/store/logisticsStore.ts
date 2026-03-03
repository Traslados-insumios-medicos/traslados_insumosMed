import { create } from 'zustand'
import type {
  AppPersistedState,
  Cliente,
  EstadoGuia,
  EstadoRuta,
  Foto,
  Novedad,
  Ruta,
  SeguimientoNovedad,
  Stop,
  TipoNovedad,
  Usuario,
} from '../types/models'
import { generateId } from '../utils/generateId'
import { seedState } from '../data/seed'
import { loadState, saveState, resetState } from '../utils/storage'
import { MAX_FOTOS_POR_GUIA, MAX_FOTOS_HOJA_RUTA } from '../utils/constants'

interface LogisticsState extends AppPersistedState {
  addCliente: (cliente: Cliente) => void
  updateCliente: (cliente: Cliente) => void
  toggleClienteActivo: (clienteId: string) => void

  addChofer: (chofer: Usuario) => void
  updateChofer: (chofer: Usuario) => void
  toggleChoferActivo: (choferId: string) => void

  addRuta: (ruta: Ruta, stops: Stop[]) => void
  updateRuta: (ruta: Ruta) => void
  assignRutaToChofer: (rutaId: string, choferId: string) => void
  updateRutaEstado: (rutaId: string, estado: EstadoRuta) => void

  updateGuiaEstado: (guiaId: string, estado: EstadoGuia) => void
  addNovedadToGuia: (guiaId: string, tipo: TipoNovedad, descripcion: string) => void
  addFotosToGuia: (guiaId: string, fotos: Foto[]) => void

  addFotosToRuta: (rutaId: string, fotos: Foto[]) => void
  removePhoto: (photoId: string) => void

  addSeguimientoToNovedad: (novedadId: string, nota: string) => void

  resetDemoData: () => void
}

const initialState = loadState(seedState)

export const useLogisticsStore = create<LogisticsState>((set) => ({
  ...initialState,

  addCliente: (cliente) =>
    set(
      (state) => ({
        clientes: [...state.clientes, cliente],
      }),
      false,
    ),

  updateCliente: (cliente) =>
    set(
      (state) => ({
        clientes: state.clientes.map((c) => (c.id === cliente.id ? cliente : c)),
      }),
      false,
    ),

  toggleClienteActivo: (clienteId) =>
    set(
      (state) => ({
        clientes: state.clientes.map((c) =>
          c.id === clienteId ? { ...c, activo: !c.activo } : c,
        ),
      }),
      false,
    ),

  addChofer: (chofer) =>
    set(
      (state) => ({
        usuarios: [...state.usuarios, chofer],
      }),
      false,
    ),

  updateChofer: (chofer) =>
    set(
      (state) => ({
        usuarios: state.usuarios.map((u) => (u.id === chofer.id ? chofer : u)),
      }),
      false,
    ),

  toggleChoferActivo: (choferId) =>
    set(
      (state) => ({
        usuarios: state.usuarios.map((u) =>
          u.id === choferId ? { ...u, activo: !u.activo } : u,
        ),
      }),
      false,
    ),

  addRuta: (ruta, stops) =>
    set(
      (state) => ({
        rutas: [...state.rutas, ruta],
        stops: [...state.stops, ...stops],
      }),
      false,
    ),

  updateRuta: (ruta) =>
    set(
      (state) => ({
        rutas: state.rutas.map((r) => (r.id === ruta.id ? ruta : r)),
      }),
      false,
    ),

  assignRutaToChofer: (rutaId, choferId) =>
    set(
      (state) => ({
        rutas: state.rutas.map((r) =>
          r.id === rutaId ? { ...r, choferId } : r,
        ),
      }),
      false,
    ),

  updateRutaEstado: (rutaId, estado) =>
    set(
      (state) => ({
        rutas: state.rutas.map((r) =>
          r.id === rutaId ? { ...r, estado } : r,
        ),
      }),
      false,
    ),

  updateGuiaEstado: (guiaId, estado) =>
    set(
      (state) => ({
        guias: state.guias.map((g) =>
          g.id === guiaId ? { ...g, estado, updatedAt: new Date().toISOString() } : g,
        ),
      }),
      false,
    ),

  addNovedadToGuia: (guiaId, tipo, descripcion) =>
    set(
      (state) => {
        const nueva: Novedad = {
          id: `nov-${Date.now()}`,
          guiaId,
          tipo,
          descripcion,
          createdAt: new Date().toISOString(),
        }
        return {
          novedades: [...state.novedades, nueva],
        }
      },
      false,
    ),

  addFotosToGuia: (guiaId, nuevasFotos) =>
    set(
      (state) => {
        const existentes = state.fotos.filter((f) => f.guiaId === guiaId)
        if (existentes.length + nuevasFotos.length > MAX_FOTOS_POR_GUIA) {
          const disponibles = Math.max(MAX_FOTOS_POR_GUIA - existentes.length, 0)
          return {
            fotos: [...state.fotos, ...nuevasFotos.slice(0, disponibles)],
          }
        }
        return {
          fotos: [...state.fotos, ...nuevasFotos],
        }
      },
      false,
    ),

  addFotosToRuta: (rutaId, nuevasFotos) =>
    set(
      (state) => {
        const existentes = state.fotos.filter((f) => f.rutaId === rutaId && f.tipo === 'HOJA_RUTA')
        const disponibles = Math.max(MAX_FOTOS_HOJA_RUTA - existentes.length, 0)
        const aAgregar = nuevasFotos
          .slice(0, disponibles)
          .map((f) => ({ ...f, rutaId, tipo: 'HOJA_RUTA' as const }))
        return { fotos: [...state.fotos, ...aAgregar] }
      },
      false,
    ),

  removePhoto: (photoId) =>
    set(
      (state) => ({
        fotos: state.fotos.filter((f) => f.id !== photoId),
      }),
      false,
    ),

  addSeguimientoToNovedad: (novedadId, nota) =>
    set(
      (state) => {
        const nuevo: SeguimientoNovedad = {
          id: generateId('seg'),
          novedadId,
          nota,
          createdAt: new Date().toISOString(),
        }
        return {
          seguimientosNovedades: [...(state.seguimientosNovedades ?? []), nuevo],
        }
      },
      false,
    ),

  resetDemoData: () => {
    const reset = resetState(seedState)
    set((state) => ({
      ...reset,
      addCliente: state.addCliente,
      updateCliente: state.updateCliente,
      toggleClienteActivo: state.toggleClienteActivo,
      addChofer: state.addChofer,
      updateChofer: state.updateChofer,
      toggleChoferActivo: state.toggleChoferActivo,
      addRuta: state.addRuta,
      updateRuta: state.updateRuta,
      assignRutaToChofer: state.assignRutaToChofer,
      updateRutaEstado: state.updateRutaEstado,
      updateGuiaEstado: state.updateGuiaEstado,
      addNovedadToGuia: state.addNovedadToGuia,
      addFotosToGuia: state.addFotosToGuia,
      addFotosToRuta: state.addFotosToRuta,
      removePhoto: state.removePhoto,
      addSeguimientoToNovedad: state.addSeguimientoToNovedad,
      resetDemoData: state.resetDemoData,
    }))
  },
}))

useLogisticsStore.subscribe((state) => {
  const { resetDemoData, ...persist } = state
  saveState(persist)
})

