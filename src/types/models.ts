export type Rol = 'ADMIN' | 'CHOFER' | 'CLIENTE'

export interface Cliente {
  id: string
  nombre: string
  ruc: string
  direccion: string
  telefonoContacto?: string
  emailContacto?: string
  activo: boolean
}

export interface Usuario {
  id: string
  nombre: string
  rol: Rol
  activo: boolean
  clienteId?: string
}

export interface Stop {
  id: string
  orden: number
  direccion: string
  lat: number
  lng: number
  clienteId: string
  notas?: string
  guiaIds: string[]
}

export interface GuiaEntrega {
  id: string
  numeroGuia: string
  descripcion: string
  clienteId: string
  rutaId: string
  stopId: string
  estado: EstadoGuia
  createdAt: string
  updatedAt?: string
}

export type EstadoRuta = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'

export type EstadoGuia = 'PENDIENTE' | 'ENTREGADO' | 'INCIDENCIA'

export type TipoNovedad =
  | 'DIRECCION_INCORRECTA'
  | 'CLIENTE_AUSENTE'
  | 'MERCADERIA_DANADA'
  | 'OTRO'

export interface Ruta {
  id: string
  fecha: string
  choferId: string
  estado: EstadoRuta
  stopIds: string[]
}

export type TipoFoto = 'GUIA' | 'HOJA_RUTA'

export interface Foto {
  id: string
  guiaId?: string
  rutaId?: string
  tipo: TipoFoto
  urlPreview: string
  createdAt: string
}

export interface Novedad {
  id: string
  guiaId: string
  tipo: TipoNovedad
  descripcion: string
  createdAt: string
}

export interface AppPersistedState {
  clientes: Cliente[]
  usuarios: Usuario[]
  rutas: Ruta[]
  stops: Stop[]
  guias: GuiaEntrega[]
  fotos: Foto[]
  novedades: Novedad[]
}

