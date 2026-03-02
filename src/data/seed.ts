import type {
  AppPersistedState,
  Cliente,
  Usuario,
  Ruta,
  Stop,
  GuiaEntrega,
  Foto,
  Novedad,
} from '../types/models'

const clientes: Cliente[] = [
  {
    id: 'cliente-metrored',
    nombre: 'Metrored',
    ruc: '1790010010001',
    direccion: 'Av. Amazonas y Naciones Unidas, Quito',
    telefonoContacto: '+593 2 123 4567',
    emailContacto: 'logistica@metrored.ec',
    activo: true,
  },
  {
    id: 'cliente-asistanet',
    nombre: 'Asistanet',
    ruc: '1790010010002',
    direccion: 'Av. 6 de Diciembre y Portugal, Quito',
    telefonoContacto: '+593 2 234 5678',
    emailContacto: 'compras@asistanet.ec',
    activo: true,
  },
  {
    id: 'cliente-fybeca',
    nombre: 'Fybeca',
    ruc: '1790010010003',
    direccion: 'Av. República del Salvador, Quito',
    telefonoContacto: '+593 2 345 6789',
    emailContacto: 'bodega@fybeca.ec',
    activo: true,
  },
]

const usuarios: Usuario[] = [
  {
    id: 'chofer-1',
    nombre: 'Carlos Pérez',
    rol: 'CHOFER',
    activo: true,
  },
  {
    id: 'chofer-2',
    nombre: 'María García',
    rol: 'CHOFER',
    activo: true,
  },
  {
    id: 'cliente-user-metrored',
    nombre: 'Ana Metrored',
    rol: 'CLIENTE',
    activo: true,
    clienteId: 'cliente-metrored',
  },
  {
    id: 'cliente-user-fybeca',
    nombre: 'Juan Fybeca',
    rol: 'CLIENTE',
    activo: true,
    clienteId: 'cliente-fybeca',
  },
]

const rutaUnica: Ruta = {
  id: 'ruta-1',
  fecha: new Date().toISOString().slice(0, 10),
  choferId: 'chofer-1',
  estado: 'EN_CURSO',
  stopIds: ['stop-1', 'stop-2', 'stop-3'],
}

const stops: Stop[] = [
  {
    id: 'stop-1',
    orden: 1,
    direccion: clientes[0].direccion,
    lat: -0.180653,
    lng: -78.467834,
    clienteId: clientes[0].id,
    guiaIds: ['guia-1'],
  },
  {
    id: 'stop-2',
    orden: 2,
    direccion: clientes[1].direccion,
    lat: -0.186,
    lng: -78.48,
    clienteId: clientes[1].id,
    guiaIds: ['guia-2'],
  },
  {
    id: 'stop-3',
    orden: 3,
    direccion: clientes[2].direccion,
    lat: -0.19,
    lng: -78.49,
    clienteId: clientes[2].id,
    guiaIds: ['guia-3'],
  },
]

const guias: GuiaEntrega[] = [
  {
    id: 'guia-1',
    numeroGuia: 'G-0001',
    descripcion: 'Insumos médicos para Metrored',
    clienteId: clientes[0].id,
    rutaId: rutaUnica.id,
    stopId: 'stop-1',
    estado: 'PENDIENTE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'guia-2',
    numeroGuia: 'G-0002',
    descripcion: 'Medicinas y material de curación Asistanet',
    clienteId: clientes[1].id,
    rutaId: rutaUnica.id,
    stopId: 'stop-2',
    estado: 'ENTREGADO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guia-3',
    numeroGuia: 'G-0003',
    descripcion: 'Inventario farmacéutico Fybeca',
    clienteId: clientes[2].id,
    rutaId: rutaUnica.id,
    stopId: 'stop-3',
    estado: 'INCIDENCIA',
    createdAt: new Date().toISOString(),
  },
]

const fotos: Foto[] = [
  {
    id: 'foto-1',
    guiaId: 'guia-2',
    tipo: 'GUIA',
    urlPreview: 'https://via.placeholder.com/400x300?text=Entrega+Guia+G-0002',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'foto-2',
    rutaId: rutaUnica.id,
    tipo: 'HOJA_RUTA',
    urlPreview: 'https://via.placeholder.com/400x300?text=Hoja+de+Ruta',
    createdAt: new Date().toISOString(),
  },
]

const novedades: Novedad[] = [
  {
    id: 'novedad-1',
    guiaId: 'guia-3',
    tipo: 'CLIENTE_AUSENTE',
    descripcion: 'Cliente no se encontraba en el punto de entrega, se reprograma visita.',
    createdAt: new Date().toISOString(),
  },
]

export const seedState: AppPersistedState = {
  clientes,
  usuarios,
  rutas: [rutaUnica],
  stops,
  guias,
  fotos,
  novedades,
}

