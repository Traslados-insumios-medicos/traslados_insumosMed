import type {
  AppPersistedState, Cliente, Usuario, Ruta, Stop, GuiaEntrega, Foto, Novedad,
} from '../types/models'

const hoy = new Date().toISOString().slice(0, 10)
const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const antier = new Date(Date.now() - 172800000).toISOString().slice(0, 10)
const ts = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString()

// ── CLIENTES ──────────────────────────────────────────
const clientes: Cliente[] = [
  // ── Clientes PRINCIPALES (tienen acceso al panel) ──
  { id: 'cp-cimed',      nombre: 'CIMED',       ruc: '1790020010001', direccion: 'Av. Shyris N36-188, Quito',          telefonoContacto: '+593 2 111 2233', emailContacto: 'logistica@cimed.ec',      activo: true, tipo: 'PRINCIPAL' },
  { id: 'cp-viva',       nombre: 'VIVA',         ruc: '1790020010002', direccion: 'Av. Eloy Alfaro N32-650, Quito',    telefonoContacto: '+593 2 222 3344', emailContacto: 'operaciones@viva.ec',     activo: true, tipo: 'PRINCIPAL' },
  { id: 'cp-gimpromed',  nombre: 'GIMPROMED',    ruc: '1790020010003', direccion: 'Av. 10 de Agosto N31-120, Quito',   telefonoContacto: '+593 2 333 4455', emailContacto: 'compras@gimpromed.ec',    activo: true, tipo: 'PRINCIPAL' },

  // ── Clientes SECUNDARIOS de CIMED ──
  { id: 'cliente-metrored',     nombre: 'Metrored',              ruc: '1790010010001', direccion: 'Av. Amazonas y Naciones Unidas, Quito', telefonoContacto: '+593 2 123 4567', emailContacto: 'logistica@metrored.ec',  activo: true, tipo: 'SECUNDARIO', clientePrincipalId: 'cp-cimed' },
  { id: 'cliente-asistanet',    nombre: 'Asistanet',             ruc: '1790010010002', direccion: 'Av. 6 de Diciembre y Portugal, Quito',  telefonoContacto: '+593 2 234 5678', emailContacto: 'compras@asistanet.ec',   activo: true, tipo: 'SECUNDARIO', clientePrincipalId: 'cp-cimed' },
  { id: 'cliente-fybeca',       nombre: 'Fybeca',                ruc: '1790010010003', direccion: 'Av. República del Salvador, Quito',     telefonoContacto: '+593 2 345 6789', emailContacto: 'bodega@fybeca.ec',       activo: true, tipo: 'SECUNDARIO', clientePrincipalId: 'cp-cimed' },

  // ── Clientes SECUNDARIOS de VIVA ──
  { id: 'cliente-cruz-roja',    nombre: 'Cruz Roja Ecuatoriana', ruc: '1790010010004', direccion: 'Av. Colombia y Sodiro, Quito',          telefonoContacto: '+593 2 456 7890', emailContacto: 'suministros@cruzroja.ec', activo: true, tipo: 'SECUNDARIO', clientePrincipalId: 'cp-viva' },
  { id: 'cliente-hospital-voz', nombre: 'Hospital Voz Andes',   ruc: '1790010010005', direccion: 'Av. Villalengua 267, Quito',            telefonoContacto: '+593 2 567 8901', emailContacto: 'farmacia@vozandes.ec',   activo: true, tipo: 'SECUNDARIO', clientePrincipalId: 'cp-viva' },

  // ── Clientes SECUNDARIOS de GIMPROMED ──
  { id: 'cliente-solca',        nombre: 'SOLCA Quito',           ruc: '1790010010006', direccion: 'Av. 6 de Diciembre N36-109, Quito',    telefonoContacto: '+593 2 678 9012', emailContacto: 'insumos@solca.ec',       activo: true, tipo: 'SECUNDARIO', clientePrincipalId: 'cp-gimpromed' },
  { id: 'cliente-metropolitano',nombre: 'Hospital Metropolitano',ruc: '1790010010007', direccion: 'Av. Mariana de Jesús s/n, Quito',      telefonoContacto: '+593 2 789 0123', emailContacto: 'compras@hmetropolitano.ec', activo: true, tipo: 'SECUNDARIO', clientePrincipalId: 'cp-gimpromed' },
]

// ── USUARIOS ──────────────────────────────────────────
const usuarios: Usuario[] = [
  { id: 'chofer-1', nombre: 'Carlos Pérez',  cedula: '1712345678', rol: 'CHOFER', activo: true },
  { id: 'chofer-2', nombre: 'María García',  cedula: '1723456789', rol: 'CHOFER', activo: true },
  { id: 'chofer-3', nombre: 'Luis Morales',  cedula: '1734567890', rol: 'CHOFER', activo: true },
  // Solo los clientes PRINCIPALES tienen acceso al panel
  { id: 'user-cimed',     nombre: 'Admin CIMED',     rol: 'CLIENTE', activo: true, clienteId: 'cp-cimed' },
  { id: 'user-viva',      nombre: 'Admin VIVA',      rol: 'CLIENTE', activo: true, clienteId: 'cp-viva' },
  { id: 'user-gimpromed', nombre: 'Admin GIMPROMED', rol: 'CLIENTE', activo: true, clienteId: 'cp-gimpromed' },
]

// ── RUTAS ──────────────────────────────────────────────
// Carlos: ruta EN_CURSO hoy (3 paradas), ruta PENDIENTE hoy (2 paradas), ruta COMPLETADA ayer (3 paradas), ruta COMPLETADA antier (2 paradas)
// María: ruta EN_CURSO hoy (3 paradas), ruta COMPLETADA ayer (2 paradas)
// Luis: ruta PENDIENTE hoy (2 paradas)
const rutas: Ruta[] = [
  { id: 'ruta-1', fecha: hoy,    choferId: 'chofer-1', estado: 'EN_CURSO',   stopIds: ['s1','s2','s3'] },
  { id: 'ruta-2', fecha: hoy,    choferId: 'chofer-1', estado: 'PENDIENTE',  stopIds: ['s4','s5'] },
  { id: 'ruta-3', fecha: ayer,   choferId: 'chofer-1', estado: 'COMPLETADA', stopIds: ['s6','s7','s8'] },
  { id: 'ruta-4', fecha: antier, choferId: 'chofer-1', estado: 'COMPLETADA', stopIds: ['s9','s10'] },
  { id: 'ruta-5', fecha: hoy,    choferId: 'chofer-2', estado: 'EN_CURSO',   stopIds: ['s11','s12','s13'] },
  { id: 'ruta-6', fecha: ayer,   choferId: 'chofer-2', estado: 'COMPLETADA', stopIds: ['s14','s15'] },
  { id: 'ruta-7', fecha: hoy,    choferId: 'chofer-3', estado: 'PENDIENTE',  stopIds: ['s16','s17'] },
]

// ── STOPS ──────────────────────────────────────────────
const stops: Stop[] = [
  // Ruta 1 — Carlos hoy EN_CURSO
  { id: 's1', orden: 1, direccion: 'Av. Amazonas y Naciones Unidas, Quito',   lat: -0.1806, lng: -78.4678, clienteId: 'cliente-metrored',      guiaIds: ['g1','g2'] },
  { id: 's2', orden: 2, direccion: 'Av. 6 de Diciembre y Portugal, Quito',    lat: -0.1860, lng: -78.4800, clienteId: 'cliente-asistanet',     guiaIds: ['g3'] },
  { id: 's3', orden: 3, direccion: 'Av. República del Salvador, Quito',       lat: -0.1900, lng: -78.4900, clienteId: 'cliente-fybeca',        guiaIds: ['g4'] },
  // Ruta 2 — Carlos hoy PENDIENTE
  { id: 's4', orden: 1, direccion: 'Av. Colombia y Sodiro, Quito',            lat: -0.2070, lng: -78.4950, clienteId: 'cliente-cruz-roja',     guiaIds: ['g5','g6'] },
  { id: 's5', orden: 2, direccion: 'Av. Villalengua 267, Quito',              lat: -0.1720, lng: -78.4830, clienteId: 'cliente-hospital-voz',  guiaIds: ['g7'] },
  // Ruta 3 — Carlos ayer COMPLETADA
  { id: 's6', orden: 1, direccion: 'Av. 6 de Diciembre N36-109, Quito',       lat: -0.1950, lng: -78.4870, clienteId: 'cliente-solca',         guiaIds: ['g8'] },
  { id: 's7', orden: 2, direccion: 'Av. Mariana de Jesús s/n, Quito',         lat: -0.1780, lng: -78.4920, clienteId: 'cliente-metropolitano', guiaIds: ['g9'] },
  { id: 's8', orden: 3, direccion: 'Av. Amazonas y Naciones Unidas, Quito',   lat: -0.1806, lng: -78.4678, clienteId: 'cliente-metrored',      guiaIds: ['g10'] },
  // Ruta 4 — Carlos antier COMPLETADA
  { id: 's9',  orden: 1, direccion: 'Av. República del Salvador, Quito',      lat: -0.1900, lng: -78.4900, clienteId: 'cliente-fybeca',        guiaIds: ['g11'] },
  { id: 's10', orden: 2, direccion: 'Av. Colombia y Sodiro, Quito',           lat: -0.2070, lng: -78.4950, clienteId: 'cliente-cruz-roja',     guiaIds: ['g12'] },
  // Ruta 5 — María hoy EN_CURSO
  { id: 's11', orden: 1, direccion: 'Av. 6 de Diciembre y Portugal, Quito',   lat: -0.1860, lng: -78.4800, clienteId: 'cliente-asistanet',     guiaIds: ['g13'] },
  { id: 's12', orden: 2, direccion: 'Av. Villalengua 267, Quito',             lat: -0.1720, lng: -78.4830, clienteId: 'cliente-hospital-voz',  guiaIds: ['g14','g15'] },
  { id: 's13', orden: 3, direccion: 'Av. 6 de Diciembre N36-109, Quito',      lat: -0.1950, lng: -78.4870, clienteId: 'cliente-solca',         guiaIds: ['g16'] },
  // Ruta 6 — María ayer COMPLETADA
  { id: 's14', orden: 1, direccion: 'Av. Amazonas y Naciones Unidas, Quito',  lat: -0.1806, lng: -78.4678, clienteId: 'cliente-metrored',      guiaIds: ['g17'] },
  { id: 's15', orden: 2, direccion: 'Av. Mariana de Jesús s/n, Quito',        lat: -0.1780, lng: -78.4920, clienteId: 'cliente-metropolitano', guiaIds: ['g18'] },
  // Ruta 7 — Luis hoy PENDIENTE
  { id: 's16', orden: 1, direccion: 'Av. República del Salvador, Quito',      lat: -0.1900, lng: -78.4900, clienteId: 'cliente-fybeca',        guiaIds: ['g19'] },
  { id: 's17', orden: 2, direccion: 'Av. Colombia y Sodiro, Quito',           lat: -0.2070, lng: -78.4950, clienteId: 'cliente-cruz-roja',     guiaIds: ['g20'] },
]

// ── GUÍAS ──────────────────────────────────────────────
const guias: GuiaEntrega[] = [
  // Ruta 1 — Carlos hoy EN_CURSO (mix de estados)
  { id: 'g1', numeroGuia: 'G-0001', descripcion: 'Material de curación y gasas estériles', clienteId: 'cliente-metrored', rutaId: 'ruta-1', stopId: 's1', estado: 'ENTREGADO', createdAt: ts(-7200000), updatedAt: ts(-5400000), receptorNombre: 'Jorge Andrade', horaLlegada: '08:15', horaSalida: '08:35', temperatura: '18°C' },
  { id: 'g2', numeroGuia: 'G-0002', descripcion: 'Jeringas 5ml y guantes quirúrgicos', clienteId: 'cliente-metrored', rutaId: 'ruta-1', stopId: 's1', estado: 'PENDIENTE', createdAt: ts(-7200000) },
  { id: 'g3', numeroGuia: 'G-0003', descripcion: 'Medicamentos según pedido Asistanet', clienteId: 'cliente-asistanet', rutaId: 'ruta-1', stopId: 's2', estado: 'INCIDENCIA', createdAt: ts(-7200000) },
  { id: 'g4', numeroGuia: 'G-0004', descripcion: 'Inventario farmacéutico Fybeca lote A', clienteId: 'cliente-fybeca', rutaId: 'ruta-1', stopId: 's3', estado: 'PENDIENTE', createdAt: ts(-7200000) },
  // Ruta 2 — Carlos hoy PENDIENTE
  { id: 'g5', numeroGuia: 'G-0005', descripcion: 'Equipos de diagnóstico Cruz Roja', clienteId: 'cliente-cruz-roja', rutaId: 'ruta-2', stopId: 's4', estado: 'PENDIENTE', createdAt: ts() },
  { id: 'g6', numeroGuia: 'G-0006', descripcion: 'Material de primeros auxilios Cruz Roja', clienteId: 'cliente-cruz-roja', rutaId: 'ruta-2', stopId: 's4', estado: 'PENDIENTE', createdAt: ts() },
  { id: 'g7', numeroGuia: 'G-0007', descripcion: 'Medicamentos esenciales Voz Andes', clienteId: 'cliente-hospital-voz', rutaId: 'ruta-2', stopId: 's5', estado: 'PENDIENTE', createdAt: ts() },
  // Ruta 3 — Carlos ayer COMPLETADA
  { id: 'g8',  numeroGuia: 'G-0008', descripcion: 'Reactivos oncológicos SOLCA', clienteId: 'cliente-solca', rutaId: 'ruta-3', stopId: 's6', estado: 'ENTREGADO', createdAt: ts(-86400000), updatedAt: ts(-82800000), receptorNombre: 'Patricia Vega', horaLlegada: '09:00', horaSalida: '09:20', temperatura: '17°C' },
  { id: 'g9',  numeroGuia: 'G-0009', descripcion: 'Insumos UCI Hospital Metropolitano', clienteId: 'cliente-metropolitano', rutaId: 'ruta-3', stopId: 's7', estado: 'ENTREGADO', createdAt: ts(-86400000), updatedAt: ts(-79200000), receptorNombre: 'Roberto Salinas', horaLlegada: '10:05', horaSalida: '10:25', temperatura: '19°C' },
  { id: 'g10', numeroGuia: 'G-0010', descripcion: 'Suministros quirúrgicos Metrored', clienteId: 'cliente-metrored', rutaId: 'ruta-3', stopId: 's8', estado: 'ENTREGADO', createdAt: ts(-86400000), updatedAt: ts(-75600000), receptorNombre: 'Jorge Andrade', horaLlegada: '11:10', horaSalida: '11:30', temperatura: '18°C' },
  // Ruta 4 — Carlos antier COMPLETADA
  { id: 'g11', numeroGuia: 'G-0011', descripcion: 'Reactivos laboratorio Fybeca', clienteId: 'cliente-fybeca', rutaId: 'ruta-4', stopId: 's9', estado: 'ENTREGADO', createdAt: ts(-172800000), updatedAt: ts(-169200000), receptorNombre: 'Mónica Torres', horaLlegada: '08:30', horaSalida: '08:50', temperatura: '20°C' },
  { id: 'g12', numeroGuia: 'G-0012', descripcion: 'Vendas y material de curación Cruz Roja', clienteId: 'cliente-cruz-roja', rutaId: 'ruta-4', stopId: 's10', estado: 'ENTREGADO', createdAt: ts(-172800000), updatedAt: ts(-165600000), receptorNombre: 'Diego Muñoz', horaLlegada: '09:45', horaSalida: '10:00', temperatura: '19°C' },
  // Ruta 5 — María hoy EN_CURSO
  { id: 'g13', numeroGuia: 'G-0013', descripcion: 'Antibióticos y antivirales Asistanet', clienteId: 'cliente-asistanet', rutaId: 'ruta-5', stopId: 's11', estado: 'ENTREGADO', createdAt: ts(-3600000), updatedAt: ts(-1800000), receptorNombre: 'Carmen Ríos', horaLlegada: '07:50', horaSalida: '08:10', temperatura: '18°C' },
  { id: 'g14', numeroGuia: 'G-0014', descripcion: 'Equipos de protección Voz Andes', clienteId: 'cliente-hospital-voz', rutaId: 'ruta-5', stopId: 's12', estado: 'PENDIENTE', createdAt: ts(-3600000) },
  { id: 'g15', numeroGuia: 'G-0015', descripcion: 'Suero fisiológico y soluciones IV', clienteId: 'cliente-hospital-voz', rutaId: 'ruta-5', stopId: 's12', estado: 'PENDIENTE', createdAt: ts(-3600000) },
  { id: 'g16', numeroGuia: 'G-0016', descripcion: 'Medicamentos oncológicos SOLCA', clienteId: 'cliente-solca', rutaId: 'ruta-5', stopId: 's13', estado: 'PENDIENTE', createdAt: ts(-3600000) },
  // Ruta 6 — María ayer COMPLETADA
  { id: 'g17', numeroGuia: 'G-0017', descripcion: 'Alcohol 70% y desinfectantes Metrored', clienteId: 'cliente-metrored', rutaId: 'ruta-6', stopId: 's14', estado: 'ENTREGADO', createdAt: ts(-86400000), updatedAt: ts(-82800000), receptorNombre: 'Jorge Andrade', horaLlegada: '08:00', horaSalida: '08:20', temperatura: '17°C' },
  { id: 'g18', numeroGuia: 'G-0018', descripcion: 'Material descartable Metropolitano', clienteId: 'cliente-metropolitano', rutaId: 'ruta-6', stopId: 's15', estado: 'ENTREGADO', createdAt: ts(-86400000), updatedAt: ts(-79200000), receptorNombre: 'Roberto Salinas', horaLlegada: '09:15', horaSalida: '09:35', temperatura: '18°C' },
  // Ruta 7 — Luis hoy PENDIENTE
  { id: 'g19', numeroGuia: 'G-0019', descripcion: 'Lote farmacéutico Fybeca B', clienteId: 'cliente-fybeca', rutaId: 'ruta-7', stopId: 's16', estado: 'PENDIENTE', createdAt: ts() },
  { id: 'g20', numeroGuia: 'G-0020', descripcion: 'Insumos emergencia Cruz Roja', clienteId: 'cliente-cruz-roja', rutaId: 'ruta-7', stopId: 's17', estado: 'PENDIENTE', createdAt: ts() },
]

// ── FOTOS ──────────────────────────────────────────────
const fotos: Foto[] = [
  { id: 'f1',  guiaId: 'g1',  tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0001', createdAt: ts(-5400000) },
  { id: 'f2',  guiaId: 'g2',  tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0002', createdAt: ts(-5400000) },
  { id: 'f3',  rutaId: 'ruta-1', tipo: 'HOJA_RUTA', urlPreview: 'https://placehold.co/400x300?text=Hoja+Ruta+1', createdAt: ts(-3600000) },
  { id: 'f4',  guiaId: 'g8',  tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0008', createdAt: ts(-82800000) },
  { id: 'f5',  guiaId: 'g9',  tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0009', createdAt: ts(-79200000) },
  { id: 'f6',  guiaId: 'g10', tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0010', createdAt: ts(-75600000) },
  { id: 'f7',  rutaId: 'ruta-3', tipo: 'HOJA_RUTA', urlPreview: 'https://placehold.co/400x300?text=Hoja+Ruta+3', createdAt: ts(-72000000) },
  { id: 'f8',  guiaId: 'g11', tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0011', createdAt: ts(-169200000) },
  { id: 'f9',  guiaId: 'g12', tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0012', createdAt: ts(-165600000) },
  { id: 'f10', rutaId: 'ruta-4', tipo: 'HOJA_RUTA', urlPreview: 'https://placehold.co/400x300?text=Hoja+Ruta+4', createdAt: ts(-162000000) },
  { id: 'f11', guiaId: 'g13', tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0013', createdAt: ts(-1800000) },
  { id: 'f12', guiaId: 'g17', tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0017', createdAt: ts(-82800000) },
  { id: 'f13', guiaId: 'g18', tipo: 'GUIA',      urlPreview: 'https://placehold.co/400x300?text=Entrega+G-0018', createdAt: ts(-79200000) },
  { id: 'f14', rutaId: 'ruta-6', tipo: 'HOJA_RUTA', urlPreview: 'https://placehold.co/400x300?text=Hoja+Ruta+6', createdAt: ts(-75600000) },
]

// ── NOVEDADES ──────────────────────────────────────────
const novedades: Novedad[] = [
  { id: 'nov-1', guiaId: 'g3',  tipo: 'CLIENTE_AUSENTE',    descripcion: 'Cliente no se encontraba en el punto de entrega. Se reprograma visita para la tarde.', createdAt: ts(-3600000) },
  { id: 'nov-2', guiaId: 'g6',  tipo: 'MERCADERIA_DANADA',  descripcion: 'Caja de material de primeros auxilios llegó con golpe visible en la esquina inferior derecha.', createdAt: ts(-1800000) },
  { id: 'nov-3', guiaId: 'g16', tipo: 'DIRECCION_INCORRECTA', descripcion: 'La dirección registrada no corresponde al punto de recepción actual de SOLCA. Se requiere actualización.', createdAt: ts(-900000) },
]

export const seedState: AppPersistedState = {
  clientes,
  usuarios,
  rutas,
  stops,
  guias,
  fotos,
  novedades,
  seguimientosNovedades: [],
}
