import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { RouteMap } from '../../components/map/RouteMap'
import { PhotoUploader } from './PhotoUploader'
import { SeguimientoChoferStepper } from '../../components/cliente/SeguimientoChoferStepper'
import { ModalMotion } from '../../components/ui/ModalMotion'
interface GuiaApi {
  id: string; numeroGuia: string; descripcion: string; estado: string
  receptorNombre?: string | null; horaLlegada?: string | null
  horaSalida?: string | null; temperatura?: string | null; observaciones?: string | null
  stopId: string
  updatedAt?: string
  fotos?: FotoApi[]
}

type TipoNovedad = 'CLIENTE_AUSENTE' | 'MERCADERIA_DANADA' | 'DIRECCION_INCORRECTA' | 'OTRO'

interface GuiaDetalleForm {
  receptorNombre: string
  temperatura: string
  horaLlegada: string
  horaSalida: string
  observaciones: string
  tipoIncidencia: TipoNovedad
}

type GuiaDetalleErrorFields = Pick<GuiaDetalleForm, 'receptorNombre' | 'temperatura' | 'horaLlegada' | 'horaSalida'>

interface StopApi {
  id: string; orden: number; direccion: string; lat: number; lng: number
  notas?: string | null; cliente: { id: string; nombre: string }
  guias: GuiaApi[]
}

interface FotoApi { id: string; urlPreview: string; createdAt: string; tipo: string }

interface RutaApi {
  id: string; fecha: string; estado: string; createdAt: string
  seguimientoChofer?: string
  chofer: { id: string; nombre: string }
  stops: StopApi[]; guias: GuiaApi[]; fotos: FotoApi[]
}

function guiaTieneDetallePersistido(g: GuiaApi) {
  // Para incidencias: verificar que tenga tipo de incidencia en receptorNombre
  const esIncidencia = g.estado === 'INCIDENCIA'
  
  const tieneFotos = !!(g.fotos && g.fotos.length > 0)
  const tieneTemperatura = !!g.temperatura?.trim()
  const tieneHoraLlegada = !!g.horaLlegada?.trim()
  const tieneHoraSalida = !!g.horaSalida?.trim()
  
  if (esIncidencia) {
    // Para incidencias: debe tener temperatura, horas y al menos 1 foto
    const resultado = tieneFotos && tieneTemperatura && tieneHoraLlegada && tieneHoraSalida
    console.log(`[VALIDACIÓN INCIDENCIA] Guía ${g.numeroGuia}:`, {
      resultado,
      tieneFotos,
      tieneTemperatura,
      tieneHoraLlegada,
      tieneHoraSalida,
      cantidadFotos: g.fotos?.length ?? 0
    })
    return resultado
  }
  
  // Para entregas normales: debe tener receptor, temperatura, horas y al menos 1 foto
  const tieneReceptor = !!g.receptorNombre?.trim()
  const resultado = tieneReceptor && tieneFotos && tieneTemperatura && tieneHoraLlegada && tieneHoraSalida
  console.log(`[VALIDACIÓN ENTREGA] Guía ${g.numeroGuia}:`, {
    resultado,
    tieneReceptor,
    tieneFotos,
    tieneTemperatura,
    tieneHoraLlegada,
    tieneHoraSalida,
    cantidadFotos: g.fotos?.length ?? 0,
    receptorNombre: g.receptorNombre
  })
  return resultado
}

export function ChoferRutaDetallePage() {
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
  
  const TIPOS_INCIDENCIA: { value: TipoNovedad; label: string }[] = [
    { value: 'CLIENTE_AUSENTE', label: 'Cliente no estuvo / ausente' },
    { value: 'MERCADERIA_DANADA', label: 'Mercadería dañada' },
    { value: 'DIRECCION_INCORRECTA', label: 'Dirección incorrecta' },
    { value: 'OTRO', label: 'Otra' },
  ]
  
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)

  const [ruta, setRuta] = useState<RutaApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0)
  const [ubicacionActiva, setUbicacionActiva] = useState(false)
  const [miUbicacion, setMiUbicacion] = useState<{ lat: number; lng: number } | null>(null)
  const geoWatchRef = useRef<number | null>(null)
  const miUbicacionRef = useRef<{ lat: number; lng: number } | null>(null)
  const [detalleFormPorGuia, setDetalleFormPorGuia] = useState<Record<string, GuiaDetalleForm>>({})
  const [erroresDetallePorGuia, setErroresDetallePorGuia] = useState<Record<string, Partial<GuiaDetalleErrorFields>>>({})
  const [guardandoGuiaId, setGuardandoGuiaId] = useState<string | null>(null)
  const [guiaIdsDetalleGuardado, setGuiaIdsDetalleGuardado] = useState<Set<string>>(() => new Set())
  const [guiaIdsEnEdicion, setGuiaIdsEnEdicion] = useState<Set<string>>(() => new Set())
  const [fotosBorradorPorGuia, setFotosBorradorPorGuia] = useState<Record<string, File[]>>({})
  const rutaIdParaDetalleRef = useRef<string | null>(null)
  const [ultimaActualizacionSeguimiento, setUltimaActualizacionSeguimiento] = useState<string | null>(null)
  const [showUbicacionErrorModal, setShowUbicacionErrorModal] = useState(false)
  const ubicacionErrorShownRef = useRef(false)
  const [procesandoFotos, setProcesandoFotos] = useState(false)

  const fetchRuta = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get<RutaApi>(`/rutas/${id}`)
      setRuta(res.data)
    } catch {
      addToast('Error al cargar la ruta', 'error')
    } finally {
      setLoading(false)
      setProcesandoFotos(false) // Terminar procesamiento después de recargar
    }
  }, [id, addToast])

  const handleFotosStart = useCallback(() => {
    setProcesandoFotos(true)
  }, [])

  const handleFotosEnd = useCallback(() => {
    // fetchRuta ya maneja setProcesandoFotos(false)
  }, [])

  useEffect(() => { fetchRuta() }, [fetchRuta])

  const stopsRuta = useMemo(
    () => ruta ? [...ruta.stops].sort((a, b) => a.orden - b.orden) : [],
    [ruta],
  )

  // Map StopApi to the Stop shape that RouteMap expects
  const stopsParaMapa = useMemo(() => stopsRuta.map((s) => {
    const completada =
      s.guias.length > 0 && s.guias.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA')
    return {
      id: s.id, orden: s.orden, direccion: s.direccion,
      lat: s.lat, lng: s.lng, notas: s.notas ?? undefined,
      clienteId: s.cliente.id,
      guiaIds: s.guias.map((g) => g.id),
      completada,
    }
  }), [stopsRuta])

  const rutaDetalleSyncKey = useMemo(
    () => (ruta ? ruta.guias.map((g) => `${g.id}:${g.updatedAt ?? ''}`).join('|') : ''),
    [ruta],
  )

  useEffect(() => {
    if (!ruta) return
    setDetalleFormPorGuia((prev) => {
      const next = { ...prev }
      ruta.guias.forEach((g) => {
        // Solo actualizar si:
        // 1. No existe en el formulario (primera carga)
        // 2. Los datos están persistidos Y no está en modo edición
        const estaEnEdicion = guiaIdsEnEdicion.has(g.id)
        const yaExiste = !!prev[g.id]
        
        if (!yaExiste || (guiaTieneDetallePersistido(g) && !estaEnEdicion)) {
          next[g.id] = {
            receptorNombre: g.receptorNombre ?? '',
            temperatura: g.temperatura ?? '',
            horaLlegada: g.horaLlegada ?? '',
            horaSalida: g.horaSalida ?? '',
            observaciones: g.observaciones ?? '',
            tipoIncidencia: 'CLIENTE_AUSENTE',
          }
        }
      })
      return next
    })
  }, [rutaDetalleSyncKey, ruta, guiaIdsEnEdicion])

  useEffect(() => {
    if (!ruta) return
    const mergePersistidos = (base: Set<string>) => {
      const next = new Set(base)
      ruta.guias.forEach((g) => {
        if (guiaTieneDetallePersistido(g)) next.add(g.id)
      })
      return next
    }
    if (rutaIdParaDetalleRef.current !== ruta.id) {
      rutaIdParaDetalleRef.current = ruta.id
      setGuiaIdsDetalleGuardado(mergePersistidos(new Set()))
    } else {
      setGuiaIdsDetalleGuardado((prev) => mergePersistidos(prev))
    }
  }, [ruta, rutaDetalleSyncKey])

  useEffect(() => {
    miUbicacionRef.current = miUbicacion
  }, [miUbicacion])

  const detenerUbicacion = useCallback(() => {
    if (geoWatchRef.current != null) {
      navigator.geolocation.clearWatch(geoWatchRef.current)
      geoWatchRef.current = null
    }
    setUbicacionActiva(false)
    setMiUbicacion(null)
    miUbicacionRef.current = null
  }, [])

  const activarUbicacion = useCallback(() => {
    if (!navigator.geolocation) {
      if (!ubicacionErrorShownRef.current) {
        ubicacionErrorShownRef.current = true
        setShowUbicacionErrorModal(true)
      }
      return
    }
    
    // Limpiar watch anterior si existe
    if (geoWatchRef.current != null) {
      navigator.geolocation.clearWatch(geoWatchRef.current)
      geoWatchRef.current = null
    }
    
    // Primero intentar obtener posición actual una vez
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('✅ Ubicación obtenida:', pos.coords)
        const ubicacion = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setMiUbicacion(ubicacion)
        miUbicacionRef.current = ubicacion
        setUbicacionActiva(true)
        addToast('Ubicación GPS activada correctamente', 'success')
        
        // Luego iniciar el watch
        geoWatchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            console.log('📍 Ubicación actualizada:', pos.coords)
            const nuevaUbicacion = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }
            setMiUbicacion(nuevaUbicacion)
            miUbicacionRef.current = nuevaUbicacion
          },
          (error) => {
            console.error('⚠️ Error de geolocalización (watch):', error)
            // No detener si ya tenemos una posición inicial
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 10000,
            timeout: 10000
          },
        )
      },
      (error) => {
        console.error('❌ Error de geolocalización (inicial):', error)
        
        // Detener ubicación activa cuando hay error
        detenerUbicacion()
        
        if (!ubicacionErrorShownRef.current) {
          ubicacionErrorShownRef.current = true
          setShowUbicacionErrorModal(true)
        }
        
        // Mostrar mensaje específico según el tipo de error
        if (error.code === error.PERMISSION_DENIED) {
          addToast('Permisos de ubicación denegados', 'error')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          addToast('Ubicación no disponible. Verifica que el GPS esté activado.', 'error')
        } else if (error.code === error.TIMEOUT) {
          addToast('Tiempo de espera agotado al obtener ubicación', 'error')
        }
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 0, // No usar caché para la primera posición
        timeout: 15000 // Más tiempo para la primera obtención
      },
    )
  }, [addToast, detenerUbicacion])

  useEffect(() => () => {
    if (geoWatchRef.current != null) navigator.geolocation.clearWatch(geoWatchRef.current)
  }, [])

  useEffect(() => {
    setUbicacionActiva(false)
    setMiUbicacion(null)
    miUbicacionRef.current = null
    if (geoWatchRef.current != null) {
      navigator.geolocation.clearWatch(geoWatchRef.current)
      geoWatchRef.current = null
    }
  }, [id])

  // Enviar posición al servidor (cliente en tiempo real) mientras la ruta está en curso
  useEffect(() => {
    if (!ubicacionActiva || ruta?.estado !== 'EN_CURSO' || !id) {
      console.log('❌ No se envía ubicación:', { ubicacionActiva, rutaEstado: ruta?.estado, rutaId: id })
      return
    }
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('❌ No hay token para socket')
      return
    }
    
    console.log('🔌 Conectando socket para enviar ubicación...')
    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    })
    
    socket.on('connect', () => {
      console.log('✅ Socket conectado para ubicación')
      socket.emit('join:ruta', id)
    })
    
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión socket:', error)
    })
    
    const enviar = () => {
      const p = miUbicacionRef.current
      if (p && socket.connected) {
        console.log('📍 Enviando posición:', p)
        socket.emit('posicion_chofer', { rutaId: id, lat: p.lat, lng: p.lng })
      } else {
        console.log('⚠️ No se puede enviar posición:', { 
          tienePosicion: !!p, 
          socketConectado: socket.connected,
          posicion: p 
        })
      }
    }
    
    // Enviar inmediatamente al conectar
    enviar()
    
    const interval = window.setInterval(enviar, 4000)
    return () => {
      console.log('🔌 Desconectando socket de ubicación')
      window.clearInterval(interval)
      socket.disconnect()
    }
  }, [ubicacionActiva, ruta?.estado, id])

  // Escuchar actualizaciones en tiempo real de la ruta
  useEffect(() => {
    if (!id) return
    const token = localStorage.getItem('token')
    if (!token) return
    
    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    })
    
    socket.emit('join:ruta', id)
    
    // Escuchar cuando cambia el estado de una guía
    socket.on('guia:incidencia', () => {
      console.log('🔄 Incidencia detectada, recargando ruta...')
      void fetchRuta()
    })
    
    socket.on('guia:entregada', () => {
      console.log('🔄 Guía entregada detectada, recargando ruta...')
      void fetchRuta()
    })
    
    // Escuchar cuando se actualiza el seguimiento
    socket.on('seguimiento_ruta', (p: { rutaId: string; seguimientoChofer: string }) => {
      if (p.rutaId === id) {
        console.log('🔄 Seguimiento actualizado:', p.seguimientoChofer)
        setRuta((prev) => prev ? { ...prev, seguimientoChofer: p.seguimientoChofer } : prev)
        setUltimaActualizacionSeguimiento(new Date().toISOString())
      }
    })
    
    // Escuchar cuando la ruta se completa
    socket.on('ruta:completada', (p: { rutaId: string }) => {
      if (p.rutaId === id) {
        console.log('🔄 Ruta completada, recargando...')
        void fetchRuta()
      }
    })
    
    return () => {
      socket.disconnect()
    }
  }, [id, fetchRuta])

  // All guias flat from stops
  const guiasPorRuta = useMemo(() => ruta?.guias ?? [], [ruta])

  const entregadas = guiasPorRuta.filter((g) => g.estado === 'ENTREGADO').length
  const conIncidencia = guiasPorRuta.filter((g) => g.estado === 'INCIDENCIA').length
  const total = guiasPorRuta.length
  const progreso = total ? Math.round(((entregadas + conIncidencia) / total) * 100) : 0

  const totalFotos = ruta?.fotos?.length ?? 0
  
  // Verificar que todas las guías tengan datos guardados (lo que implica que tienen fotos)
  const todasLasGuiasTienenDatosGuardados = guiasPorRuta.every((g) => {
    const tieneDatos = guiaTieneDetallePersistido(g)
    console.log(`Guía ${g.numeroGuia}:`, {
      tieneDatos,
      estado: g.estado,
      receptorNombre: g.receptorNombre,
      temperatura: g.temperatura,
      horaLlegada: g.horaLlegada,
      horaSalida: g.horaSalida,
      observaciones: g.observaciones,
      cantidadFotos: g.fotos?.length ?? 0,
      fotosArray: g.fotos
    })
    return tieneDatos
  })
  
  console.log('=== RESUMEN VALIDACIÓN ===')
  console.log('Total guías:', total)
  console.log('Guías con datos guardados:', guiasPorRuta.filter(g => guiaTieneDetallePersistido(g)).length)
  console.log('Guías SIN datos guardados:', guiasPorRuta.filter(g => !guiaTieneDetallePersistido(g)).map(g => g.numeroGuia))
  
  console.log('Validación finalizar jornada:', {
    total,
    totalFotos,
    todasConEstadoFinal: guiasPorRuta.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA'),
    todasLasGuiasTienenDatosGuardados,
    guiasEnEdicion: guiaIdsEnEdicion.size,
    puedeFinalizar: total > 0 &&
      guiasPorRuta.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA') &&
      todasLasGuiasTienenDatosGuardados &&
      totalFotos > 0 &&
      guiaIdsEnEdicion.size === 0
  })
  
  // La hoja de ruta es OBLIGATORIA para finalizar
  const puedeFinalizar =
    total > 0 &&
    guiasPorRuta.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA') &&
    todasLasGuiasTienenDatosGuardados &&
    totalFotos > 0 && // Debe tener al menos 1 foto de hoja de ruta
    guiaIdsEnEdicion.size === 0 && // No debe haber guías en modo edición
    !procesandoFotos // No debe estar procesando fotos

  const handleMarkIncidencia = (guiaId: string) => {
    // Solo cambiar el estado localmente, no llamar al API
    setRuta((prev) => prev ? {
      ...prev,
      guias: prev.guias.map((g) => g.id === guiaId ? { ...g, estado: 'INCIDENCIA' } : g),
      stops: prev.stops.map((s) => ({
        ...s,
        guias: s.guias.map((g) => g.id === guiaId ? { ...g, estado: 'INCIDENCIA' } : g),
      })),
    } : prev)
    
    // Limpiar errores del campo receptorNombre cuando cambias a incidencia
    setErroresDetallePorGuia((prev) => {
      const next = { ...prev }
      if (next[guiaId]) {
        next[guiaId] = { ...next[guiaId], receptorNombre: '' }
      }
      return next
    })
  }

  const handleMarkEntregado = (guiaId: string) => {
    // Solo cambiar el estado localmente, no llamar al API
    setRuta((prev) => prev ? {
      ...prev,
      guias: prev.guias.map((g) => g.id === guiaId ? { ...g, estado: 'ENTREGADO' } : g),
      stops: prev.stops.map((s) => ({
        ...s,
        guias: s.guias.map((g) => g.id === guiaId ? { ...g, estado: 'ENTREGADO' } : g),
      })),
    } : prev)
  }

  const patchDetalleGuiaEnEstado = (guiaId: string, patch: Partial<GuiaApi>) => {
    setRuta((prev) =>
      prev
        ? {
            ...prev,
            guias: prev.guias.map((g) => (g.id === guiaId ? { ...g, ...patch } : g)),
            stops: prev.stops.map((s) => ({
              ...s,
              guias: s.guias.map((g) => (g.id === guiaId ? { ...g, ...patch } : g)),
            })),
          }
        : prev,
    )
  }

  const setCampoDetalle = (guiaId: string, campo: keyof GuiaDetalleForm, valor: string) => {
    setDetalleFormPorGuia((prev) => ({
      ...prev,
      [guiaId]: { ...(prev[guiaId] ?? { receptorNombre: '', temperatura: '', horaLlegada: '', horaSalida: '', observaciones: '' }), [campo]: valor },
    }))
  }

  const setErrorCampoDetalle = (guiaId: string, campo: keyof GuiaDetalleErrorFields, mensaje: string) => {
    setErroresDetallePorGuia((prev) => ({
      ...prev,
      [guiaId]: { ...(prev[guiaId] ?? {}), [campo]: mensaje },
    }))
  }

  const limpiarErrorCampoDetalle = (guiaId: string, campo: keyof GuiaDetalleErrorFields) => {
    setErrorCampoDetalle(guiaId, campo, '')
  }

  const marcarErroresObligatoriosDetalle = (guiaId: string, form: GuiaDetalleForm, esIncidencia: boolean) => {
    if (esIncidencia) {
      // Para incidencias, validar tipo de incidencia en lugar de receptor
      const nuevosErrores: Partial<GuiaDetalleErrorFields> = {
        receptorNombre: '', // No se valida para incidencias
        temperatura: form.temperatura.trim() ? '' : REQUIRED_MESSAGE,
        horaLlegada: form.horaLlegada ? '' : REQUIRED_MESSAGE,
        horaSalida: form.horaSalida ? '' : REQUIRED_MESSAGE,
      }
      setErroresDetallePorGuia((prev) => ({ ...prev, [guiaId]: { ...(prev[guiaId] ?? {}), ...nuevosErrores } }))
      return Boolean(
        nuevosErrores.temperatura ||
        nuevosErrores.horaLlegada ||
        nuevosErrores.horaSalida,
      )
    }
    
    // Para entregas normales, validar todos los campos
    const nuevosErrores: Partial<GuiaDetalleErrorFields> = {
      receptorNombre: form.receptorNombre.trim() ? '' : REQUIRED_MESSAGE,
      temperatura: form.temperatura.trim() ? '' : REQUIRED_MESSAGE,
      horaLlegada: form.horaLlegada ? '' : REQUIRED_MESSAGE,
      horaSalida: form.horaSalida ? '' : REQUIRED_MESSAGE,
    }
    setErroresDetallePorGuia((prev) => ({ ...prev, [guiaId]: { ...(prev[guiaId] ?? {}), ...nuevosErrores } }))
    return Boolean(
      nuevosErrores.receptorNombre ||
      nuevosErrores.temperatura ||
      nuevosErrores.horaLlegada ||
      nuevosErrores.horaSalida,
    )
  }

  const handleHabilitarEdicion = (guiaId: string) => {
    setGuiaIdsEnEdicion((prev) => new Set(prev).add(guiaId))
  }

  const handleGuardarDetalleGuia = async (guiaId: string) => {
    const f = detalleFormPorGuia[guiaId]
    if (!f) return
    
    // Buscar la guía para saber si es incidencia
    const guia = guiasPorRuta.find((g) => g.id === guiaId)
    const esIncidencia = guia?.estado === 'INCIDENCIA'
    
    if (marcarErroresObligatoriosDetalle(guiaId, f, esIncidencia)) return
    
    setGuardandoGuiaId(guiaId)
    try {
      // 1. Guardar estado de la guía (ENTREGADO o INCIDENCIA)
      await api.patch(`/guias/${guiaId}/estado`, { estado: guia?.estado ?? 'ENTREGADO' })
      
      // 2. Guardar datos del formulario
      const res = await api.patch<{
        id: string
        receptorNombre: string | null
        horaLlegada: string | null
        horaSalida: string | null
        temperatura: string | null
        observaciones: string | null
        updatedAt: string
      }>(`/guias/${guiaId}/detalle`, {
        receptorNombre: esIncidencia ? `INCIDENCIA: ${f.tipoIncidencia}` : (f.receptorNombre.trim() || undefined),
        temperatura: f.temperatura.trim() || undefined,
        horaLlegada: f.horaLlegada.trim() || undefined,
        horaSalida: f.horaSalida.trim() || undefined,
        observaciones: f.observaciones.trim() || undefined,
      })
      
      // 3. Subir fotos en borrador
      const fotosBorrador = fotosBorradorPorGuia[guiaId] || []
      if (fotosBorrador.length > 0) {
        for (const file of fotosBorrador) {
          const formData = new FormData()
          formData.append('foto', file)
          await api.post(`/fotos/guia/${guiaId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
        // Limpiar fotos en borrador
        setFotosBorradorPorGuia((prev) => {
          const next = { ...prev }
          delete next[guiaId]
          return next
        })
      }
      
      const row = res.data
      patchDetalleGuiaEnEstado(guiaId, {
        receptorNombre: row.receptorNombre,
        horaLlegada: row.horaLlegada,
        horaSalida: row.horaSalida,
        temperatura: row.temperatura,
        observaciones: row.observaciones,
        updatedAt: row.updatedAt,
      })
      
      // NO actualizar el formulario aquí, dejar que el efecto lo haga después de recargar
      setGuiaIdsEnEdicion((prev) => {
        const next = new Set(prev)
        next.delete(guiaId)
        return next
      })
      
      addToast('Datos y fotos guardados. El administrador los ve en Rutas • expandir ruta.', 'success')
      
      // Recargar para mostrar las fotos subidas y actualizar validaciones
      await fetchRuta()
    } catch {
      addToast('No se pudieron guardar los datos de entrega', 'error')
    } finally {
      setGuardandoGuiaId(null)
    }
  }

  const handleIniciarRuta = async () => {
    if (!id) return
    try {
      const res = await api.patch<RutaApi>(`/rutas/${id}/estado`, { estado: 'EN_CURSO' })
      setRuta(res.data)
      addToast('Ruta iniciada', 'success')
      // Activar ubicación automáticamente al iniciar la ruta
      activarUbicacion()
    } catch {
      addToast('Error al iniciar ruta', 'error')
    }
  }

  const handleSeguimientoCliente = async (seguimientoChofer: 'EN_CAMINO' | 'CERCA_DESTINO') => {
    if (!id) return
    try {
      const res = await api.patch<RutaApi>(`/rutas/${id}/seguimiento`, { seguimientoChofer })
      setRuta(res.data)
      setUltimaActualizacionSeguimiento(new Date().toISOString())
      addToast('Estado enviado al cliente', 'success')
    } catch {
      addToast('No se pudo actualizar el seguimiento', 'error')
    }
  }

  const handleFinalizarRuta = async () => {
    if (!id || !puedeFinalizar) return
    try {
      const res = await api.patch<RutaApi>(`/rutas/${id}/estado`, { estado: 'COMPLETADA' })
      setRuta(res.data)
      addToast('Ruta finalizada', 'success')
    } catch {
      addToast('Error al finalizar ruta', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
      </div>
    )
  }

  if (!ruta) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-500">Ruta no encontrada.</p>
        <Link to="/chofer/rutas" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Volver a Mis rutas
        </Link>
      </div>
    )
  }

  const hoy = new Date()
  const mes = hoy.toLocaleString('es-ES', { month: 'short' }).toUpperCase()
  const dia = hoy.getDate()
  const effectiveSelectedStopId = selectedStopId ?? stopsRuta[0]?.id ?? null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4 md:border-0 md:bg-transparent md:p-0">
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 rounded-full border-2 border-primary/20 bg-slate-200" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Chofer Logística</p>
            <h2 className="text-lg font-bold leading-tight text-slate-900">Hola, {currentUser?.nombre}</h2>
          </div>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-primary/10 p-2 text-primary">
          <span className="text-xs font-bold">{mes}</span>
          <span className="text-lg font-bold leading-none">{dia}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] lg:gap-6">
        {/* Columna izquierda */}
        <div className="flex min-h-0 flex-col gap-4 lg:flex-1">
          {/* Resumen */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">RUTA #{ruta.id.slice(-6).toUpperCase()}</h3>
                <p className="text-xs text-slate-500">Distribución de Insumos Médicos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Creada: {new Date(ruta.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                ruta.estado === 'EN_CURSO' ? 'bg-emerald-100 text-emerald-700' :
                ruta.estado === 'COMPLETADA' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
              }`}>
                {ruta.estado === 'PENDIENTE' ? 'Planificada' : ruta.estado === 'EN_CURSO' ? 'En Curso' : ruta.estado}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Progreso: {progreso}%</span>
                <span className="font-bold text-primary">{entregadas + conIncidencia} / {total} guías</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          </div>

          {/* Estados visibles para el cliente */}
          {ruta.estado === 'EN_CURSO' && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <span className="material-symbols-outlined text-primary text-base">share_location</span>
                Avance para el cliente
              </h4>
              <p className="mb-2 text-[10px] text-slate-600">
                Toca el estado que coincida con tu situación; el cliente lo verá en los pasos del envío.
              </p>
              <p className="mb-2 text-[10px] font-medium text-slate-500">
                Actual:{' '}
                <span className="text-primary">
                  {ruta.seguimientoChofer === 'EN_CAMINO'
                    ? 'En camino'
                    : ruta.seguimientoChofer === 'CERCA_DESTINO'
                        ? 'Cerca del destino'
                        : 'Sin reportar aún'}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSeguimientoCliente('EN_CAMINO')}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                    ruta.seguimientoChofer === 'EN_CAMINO'
                      ? 'bg-primary text-white'
                      : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  En camino
                </button>
                <button
                  type="button"
                  onClick={() => handleSeguimientoCliente('CERCA_DESTINO')}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                    ruta.seguimientoChofer === 'CERCA_DESTINO'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  Cerca del destino
                </button>
              </div>
              <p className="mt-2 text-[9px] text-slate-500">
                Última actualización:{' '}
                {ultimaActualizacionSeguimiento
                  ? new Date(ultimaActualizacionSeguimiento).toLocaleString('es-ES')
                  : '•'}
              </p>
            </div>
          )}

          {ruta.estado === 'EN_CURSO' && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <span className="material-symbols-outlined text-primary text-base">visibility</span>
                Vista cliente (preview)
              </h4>
              <p className="mb-2 text-[10px] text-slate-500">
                Así se está mostrando tu avance en el panel del cliente.
              </p>
              <SeguimientoChoferStepper
                rutaEstado={ruta.estado}
                seguimiento={ruta.seguimientoChofer ?? 'NINGUNO'}
                title="Toca un paso para actualizar tu estado"
                onStepClick={(v) => { if (v !== 'NINGUNO') void handleSeguimientoCliente(v) }}
              />
            </div>
          )}

          {/* Mapa */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">Recorrido</span>
                {ruta.estado === 'EN_CURSO' && (
                  <button
                    type="button"
                    onClick={() => (ubicacionActiva ? detenerUbicacion() : activarUbicacion())}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      ubicacionActiva
                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                        : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined align-middle text-sm">my_location</span>{' '}
                    {ubicacionActiva ? 'Ubicación activa' : 'Activar mi ubicación'}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setFitBoundsTrigger((t) => t + 1)}
                className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
                Ver ruta completa
              </button>
            </div>
            {ubicacionActiva && ruta.estado === 'EN_CURSO' && (
              <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                La línea azul sigue calles desde tu posición hacia las paradas pendientes. Las completadas se muestran en verde (
                •) y ya no forman parte del trazado activo.
              </p>
            )}
            <div className="h-64 sm:h-72 lg:h-[360px]">
              <RouteMap
                stops={stopsParaMapa}
                currentPosition={ubicacionActiva ? miUbicacion : null}
                highlightedStopId={selectedStopId}
                fitBoundsTrigger={fitBoundsTrigger}
                trazarRutaDesdeMiPosicion={ubicacionActiva && miUbicacion != null}
              />
            </div>
          </div>

          {/* Paradas: una card por parada */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:overflow-hidden">
            <h4 className="flex flex-shrink-0 items-center gap-2 px-0.5 font-bold text-slate-900">
              <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
              Paradas y guías
            </h4>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-1 pr-0.5">
              {stopsRuta.map((stop) => {
                const guiasStop = stop.guias
                const paradaDetalleCompleto =
                  guiasStop.length > 0 &&
                  guiasStop.every((g) => guiaIdsDetalleGuardado.has(g.id))
                const isSelected = effectiveSelectedStopId === stop.id
                return (
                  <div
                    key={stop.id}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm ring-1 transition-colors ${
                      paradaDetalleCompleto
                        ? 'border-emerald-300 bg-emerald-50/50 ring-emerald-200/70'
                        : isSelected
                          ? 'border-primary/40 ring-primary/15'
                          : 'border-slate-200 ring-slate-900/5'
                    } ${isSelected && !paradaDetalleCompleto ? 'ring-primary/25' : ''}`}
                  >
                    <button type="button" onClick={() => setSelectedStopId(effectiveSelectedStopId === stop.id ? null : stop.id)}
                      className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-slate-50/80">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase text-primary">Parada #{stop.orden}</p>
                        <h5 className="text-base font-bold text-slate-900">{stop.cliente.nombre}</h5>
                        <p className="text-xs text-slate-500">{stop.direccion}</p>
                        {stop.notas && <p className="text-xs text-slate-400">{stop.notas}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {guiasStop.length} guía(s)
                        </span>
                      </div>
                    </button>

                    {isSelected && (
                      <div className="space-y-3 border-t border-slate-100 bg-slate-50/30 px-4 py-4">
                        {guiasStop.map((g) => (
                          <div key={g.id} className={`rounded-lg border p-3 ${
                            g.estado === 'INCIDENCIA' ? 'border-amber-200 bg-amber-50' :
                            'border-slate-100 bg-slate-50'
                          }`}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-700">Guía: #{g.numeroGuia}</span>
                              <div className="flex flex-wrap gap-1">
                                <button type="button" onClick={() => handleMarkEntregado(g.id)} 
                                  disabled={
                                    ruta.estado === 'PENDIENTE' ||
                                    ruta.estado === 'COMPLETADA'
                                  }
                                  className={`rounded px-2 py-1 text-[10px] font-medium ${
                                    g.estado === 'ENTREGADO' ? 'bg-emerald-600 text-white' :
                                    ruta.estado === 'PENDIENTE' || ruta.estado === 'COMPLETADA' ? 'border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' :
                                    'border border-slate-200 bg-white hover:bg-slate-50'
                                  }`}>
                                  Entregado
                                </button>
                                <button type="button" onClick={() => handleMarkIncidencia(g.id)}
                                  disabled={
                                    ruta.estado === 'PENDIENTE' ||
                                    ruta.estado === 'COMPLETADA'
                                  }
                                  className={`rounded px-2 py-1 text-[10px] font-medium ${
                                    g.estado === 'INCIDENCIA' ? 'bg-amber-600 text-white' :
                                    ruta.estado === 'PENDIENTE' || ruta.estado === 'COMPLETADA' ? 'border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' :
                                    'border border-slate-200 bg-white hover:bg-amber-50'
                                  }`}>
                                  Incidencia
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600">{g.descripcion}</p>

                            {/* Entrega: formulario • fotos • guardar (todo el bloque de esta guía) */}
                            {ruta.estado === 'PENDIENTE' || ruta.estado === 'COMPLETADA' ? (
                              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <p className="flex items-center gap-2 text-xs font-medium text-amber-800">
                                  <span className="material-symbols-outlined text-base">lock</span>
                                  {ruta.estado === 'PENDIENTE' 
                                    ? 'Debes iniciar la ruta para ingresar datos y subir fotos'
                                    : 'La ruta está finalizada y no se puede editar'}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-3 space-y-4">
                                {g.estado === 'INCIDENCIA' ? (
                                  /* Formulario para INCIDENCIAS */
                                  <>
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
                                      <p className="flex items-center gap-2 text-xs font-medium text-amber-800">
                                        <span className="material-symbols-outlined text-base">warning</span>
                                        Esta guía tiene una incidencia registrada
                                      </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tipo de incidencia *</label>
                                        <select
                                          value={detalleFormPorGuia[g.id]?.tipoIncidencia ?? 'CLIENTE_AUSENTE'}
                                          onChange={(e) => setCampoDetalle(g.id, 'tipoIncidencia', e.target.value as TipoNovedad)}
                                          disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                                        >
                                          {TIPOS_INCIDENCIA.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Temperatura (•C)</label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Ej: 18"
                                            value={detalleFormPorGuia[g.id]?.temperatura ?? ''}
                                            onChange={(e) => {
                                              const value = e.target.value
                                              if (value === '' || value === '-' || /^-?\d{0,3}(\.\d?)?$/.test(value)) {
                                                setCampoDetalle(g.id, 'temperatura', value)
                                                if (value.trim() && value !== '-' && value !== '.' && !value.endsWith('.')) {
                                                  limpiarErrorCampoDetalle(g.id, 'temperatura')
                                                }
                                              }
                                            }}
                                            onBlur={() => {
                                              const value = detalleFormPorGuia[g.id]?.temperatura ?? ''
                                              const isValid = value.trim() && value !== '-' && value !== '.' && !value.endsWith('.')
                                              setErrorCampoDetalle(g.id, 'temperatura', isValid ? '' : REQUIRED_MESSAGE)
                                            }}
                                            maxLength={6}
                                            disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                            className={`w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                                              erroresDetallePorGuia[g.id]?.temperatura ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                                            }`}
                                          />
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">•C</span>
                                        </div>
                                        {erroresDetallePorGuia[g.id]?.temperatura && (
                                          <p className="mt-1 text-xs text-red-500">{erroresDetallePorGuia[g.id]?.temperatura}</p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hora llegada</label>
                                        <input type="time" value={detalleFormPorGuia[g.id]?.horaLlegada ?? ''}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            setCampoDetalle(g.id, 'horaLlegada', value)
                                            if (value) limpiarErrorCampoDetalle(g.id, 'horaLlegada')
                                          }}
                                          onBlur={() => {
                                            const value = detalleFormPorGuia[g.id]?.horaLlegada ?? ''
                                            setErrorCampoDetalle(g.id, 'horaLlegada', value ? '' : REQUIRED_MESSAGE)
                                          }}
                                          disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                                            erroresDetallePorGuia[g.id]?.horaLlegada ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                                          }`} />
                                        {erroresDetallePorGuia[g.id]?.horaLlegada && (
                                          <p className="mt-1 text-xs text-red-500">{erroresDetallePorGuia[g.id]?.horaLlegada}</p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hora salida</label>
                                        <input type="time" value={detalleFormPorGuia[g.id]?.horaSalida ?? ''}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            setCampoDetalle(g.id, 'horaSalida', value)
                                            if (value) limpiarErrorCampoDetalle(g.id, 'horaSalida')
                                          }}
                                          onBlur={() => {
                                            const value = detalleFormPorGuia[g.id]?.horaSalida ?? ''
                                            setErrorCampoDetalle(g.id, 'horaSalida', value ? '' : REQUIRED_MESSAGE)
                                          }}
                                          disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                                            erroresDetallePorGuia[g.id]?.horaSalida ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                                          }`} />
                                        {erroresDetallePorGuia[g.id]?.horaSalida && (
                                          <p className="mt-1 text-xs text-red-500">{erroresDetallePorGuia[g.id]?.horaSalida}</p>
                                        )}
                                      </div>
                                      <div className="sm:col-span-2">
                                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Observaciones (máx. 255 caracteres)</label>
                                        <div className="relative">
                                          <textarea
                                            rows={3}
                                            placeholder="Detalles adicionales sobre la incidencia (opcional)"
                                            value={detalleFormPorGuia[g.id]?.observaciones ?? ''}
                                            onChange={(e) => setCampoDetalle(g.id, 'observaciones', e.target.value)}
                                            maxLength={255}
                                            disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                          />
                                          <span className={`absolute -bottom-4 right-0 text-[10px] ${(detalleFormPorGuia[g.id]?.observaciones?.length || 0) > 240 ? 'text-amber-600' : 'text-slate-400'}`}>
                                            {detalleFormPorGuia[g.id]?.observaciones?.length || 0}/255
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <PhotoUploader 
                                      key={`photo-uploader-${g.id}`}
                                      scope="guia" 
                                      guiaId={g.id} 
                                      label="Fotos de la incidencia" 
                                      draftMode={!guiaIdsDetalleGuardado.has(g.id) || guiaIdsEnEdicion.has(g.id)}
                                      onDraftChange={(files) => {
                                        setFotosBorradorPorGuia((prev) => ({
                                          ...prev,
                                          [g.id]: files
                                        }))
                                      }}
                                      initialDraftFiles={fotosBorradorPorGuia[g.id]}
                                      onUploaded={fetchRuta}
                                      readOnly={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                      onProcessingStart={handleFotosStart}
                                      onProcessingEnd={handleFotosEnd}
                                    />

                                    <div className="border-t border-slate-200 pt-4">
                                      <div className="w-full sm:flex sm:justify-end sm:gap-2">
                                        {guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id) ? (
                                          <button
                                            type="button"
                                            onClick={() => handleHabilitarEdicion(g.id)}
                                            className="w-full rounded-lg border border-primary bg-white px-4 py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-primary/5 sm:w-auto"
                                          >
                                            Editar datos
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleGuardarDetalleGuia(g.id)}
                                            disabled={
                                              guardandoGuiaId === g.id ||
                                              !detalleFormPorGuia[g.id]?.temperatura?.trim() ||
                                              !detalleFormPorGuia[g.id]?.horaLlegada ||
                                              !detalleFormPorGuia[g.id]?.horaSalida ||
                                              ((fotosBorradorPorGuia[g.id]?.length ?? 0) + (g.fotos?.length ?? 0)) === 0
                                            }
                                            className="w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
                                          >
                                            {guardandoGuiaId === g.id ? 'Guardando…' : 'Guardar datos de incidencia'}
                                          </button>
                                        )}
                                      </div>
                                      {(!detalleFormPorGuia[g.id]?.temperatura?.trim() ||
                                        !detalleFormPorGuia[g.id]?.horaLlegada ||
                                        !detalleFormPorGuia[g.id]?.horaSalida ||
                                        ((fotosBorradorPorGuia[g.id]?.length ?? 0) + (g.fotos?.length ?? 0)) === 0) && (
                                        <p className="mt-2 text-xs text-amber-600 text-center sm:text-right">
                                          {((fotosBorradorPorGuia[g.id]?.length ?? 0) + (g.fotos?.length ?? 0)) === 0
                                            ? 'Debes subir al menos 1 foto para guardar'
                                            : 'Completa todos los campos obligatorios para guardar'}
                                        </p>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  /* Formulario para ENTREGAS NORMALES */
                                  <>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recibido por</label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        placeholder="Nombre de quien recibe"
                                        value={detalleFormPorGuia[g.id]?.receptorNombre ?? ''}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          // Solo permitir letras, espacios y caracteres especiales comunes en nombres
                                          if (value === '' || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(value)) {
                                            setCampoDetalle(g.id, 'receptorNombre', value)
                                            if (value.trim()) limpiarErrorCampoDetalle(g.id, 'receptorNombre')
                                          }
                                        }}
                                        onBlur={() => {
                                          const value = detalleFormPorGuia[g.id]?.receptorNombre ?? ''
                                          setErrorCampoDetalle(g.id, 'receptorNombre', value.trim() ? '' : REQUIRED_MESSAGE)
                                        }}
                                        maxLength={50}
                                        disabled={ruta.estado === 'COMPLETADA' || (guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id))}
                                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                                          erroresDetallePorGuia[g.id]?.receptorNombre ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                                        }`}
                                      />
                                      <span className={`absolute -bottom-4 right-0 text-[10px] ${(detalleFormPorGuia[g.id]?.receptorNombre?.length || 0) > 45 ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {detalleFormPorGuia[g.id]?.receptorNombre?.length || 0}/50
                                      </span>
                                    </div>
                                    {erroresDetallePorGuia[g.id]?.receptorNombre && (
                                      <p className="mt-1 text-xs text-red-500">{erroresDetallePorGuia[g.id]?.receptorNombre}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Temperatura (•C)</label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Ej: 18"
                                        value={detalleFormPorGuia[g.id]?.temperatura ?? ''}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          // Solo permitir números de máximo 3 dígitos enteros y 1 decimal (ej: 123.5 o -12.5)
                                          if (value === '' || value === '-' || /^-?\d{0,3}(\.\d?)?$/.test(value)) {
                                            setCampoDetalle(g.id, 'temperatura', value)
                                            if (value.trim() && value !== '-' && value !== '.' && !value.endsWith('.')) {
                                              limpiarErrorCampoDetalle(g.id, 'temperatura')
                                            }
                                          }
                                        }}
                                        onBlur={() => {
                                          const value = detalleFormPorGuia[g.id]?.temperatura ?? ''
                                          const isValid = value.trim() && value !== '-' && value !== '.' && !value.endsWith('.')
                                          setErrorCampoDetalle(g.id, 'temperatura', isValid ? '' : REQUIRED_MESSAGE)
                                        }}
                                        maxLength={6}
                                        disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                        className={`w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                                          erroresDetallePorGuia[g.id]?.temperatura ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                                        }`}
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">•C</span>
                                    </div>
                                    {erroresDetallePorGuia[g.id]?.temperatura && (
                                      <p className="mt-1 text-xs text-red-500">{erroresDetallePorGuia[g.id]?.temperatura}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hora llegada</label>
                                    <input type="time" value={detalleFormPorGuia[g.id]?.horaLlegada ?? ''}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        setCampoDetalle(g.id, 'horaLlegada', value)
                                        if (value) limpiarErrorCampoDetalle(g.id, 'horaLlegada')
                                      }}
                                      onBlur={() => {
                                        const value = detalleFormPorGuia[g.id]?.horaLlegada ?? ''
                                        setErrorCampoDetalle(g.id, 'horaLlegada', value ? '' : REQUIRED_MESSAGE)
                                      }}
                                      disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                                        erroresDetallePorGuia[g.id]?.horaLlegada ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                                      }`} />
                                    {erroresDetallePorGuia[g.id]?.horaLlegada && (
                                      <p className="mt-1 text-xs text-red-500">{erroresDetallePorGuia[g.id]?.horaLlegada}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hora salida</label>
                                    <input type="time" value={detalleFormPorGuia[g.id]?.horaSalida ?? ''}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        setCampoDetalle(g.id, 'horaSalida', value)
                                        if (value) limpiarErrorCampoDetalle(g.id, 'horaSalida')
                                      }}
                                      onBlur={() => {
                                        const value = detalleFormPorGuia[g.id]?.horaSalida ?? ''
                                        setErrorCampoDetalle(g.id, 'horaSalida', value ? '' : REQUIRED_MESSAGE)
                                      }}
                                      disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                                        erroresDetallePorGuia[g.id]?.horaSalida ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                                      }`} />
                                    {erroresDetallePorGuia[g.id]?.horaSalida && (
                                      <p className="mt-1 text-xs text-red-500">{erroresDetallePorGuia[g.id]?.horaSalida}</p>
                                    )}
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Observaciones (máx. 255 caracteres)</label>
                                    <div className="relative">
                                      <textarea
                                        rows={2}
                                        placeholder="Novedades o comentarios (opcional)"
                                        value={detalleFormPorGuia[g.id]?.observaciones ?? ''}
                                        onChange={(e) => setCampoDetalle(g.id, 'observaciones', e.target.value)}
                                        maxLength={255}
                                        disabled={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                      />
                                      <span className={`absolute -bottom-4 right-0 text-[10px] ${(detalleFormPorGuia[g.id]?.observaciones?.length || 0) > 240 ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {detalleFormPorGuia[g.id]?.observaciones?.length || 0}/255
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <PhotoUploader 
                                  key={`photo-uploader-${g.id}`}
                                  scope="guia" 
                                  guiaId={g.id} 
                                  label="Fotos de entrega" 
                                  draftMode={!guiaIdsDetalleGuardado.has(g.id) || guiaIdsEnEdicion.has(g.id)}
                                  onDraftChange={(files) => {
                                    setFotosBorradorPorGuia((prev) => ({
                                      ...prev,
                                      [g.id]: files
                                    }))
                                  }}
                                  initialDraftFiles={fotosBorradorPorGuia[g.id]}
                                  onUploaded={fetchRuta}
                                  readOnly={guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id)}
                                  onProcessingStart={handleFotosStart}
                                  onProcessingEnd={handleFotosEnd}
                                />

                                <div className="border-t border-slate-200 pt-4">
                                  <div className="w-full sm:flex sm:justify-end sm:gap-2">
                                    {guiaIdsDetalleGuardado.has(g.id) && !guiaIdsEnEdicion.has(g.id) ? (
                                      <button
                                        type="button"
                                        onClick={() => handleHabilitarEdicion(g.id)}
                                        className="w-full rounded-lg border border-primary bg-white px-4 py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-primary/5 sm:w-auto"
                                      >
                                        Editar datos
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleGuardarDetalleGuia(g.id)}
                                        disabled={
                                          guardandoGuiaId === g.id ||
                                          !detalleFormPorGuia[g.id]?.receptorNombre?.trim() ||
                                          !detalleFormPorGuia[g.id]?.temperatura?.trim() ||
                                          !detalleFormPorGuia[g.id]?.horaLlegada ||
                                          !detalleFormPorGuia[g.id]?.horaSalida ||
                                          g.estado === 'PENDIENTE' ||
                                          ((fotosBorradorPorGuia[g.id]?.length ?? 0) + (g.fotos?.length ?? 0)) === 0
                                        }
                                        className="w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
                                      >
                                        {guardandoGuiaId === g.id ? 'Guardando…' : 'Guardar datos de entrega'}
                                      </button>
                                    )}
                                  </div>
                                  {(!detalleFormPorGuia[g.id]?.receptorNombre?.trim() ||
                                    !detalleFormPorGuia[g.id]?.temperatura?.trim() ||
                                    !detalleFormPorGuia[g.id]?.horaLlegada ||
                                    !detalleFormPorGuia[g.id]?.horaSalida ||
                                    g.estado === 'PENDIENTE' ||
                                    ((fotosBorradorPorGuia[g.id]?.length ?? 0) + (g.fotos?.length ?? 0)) === 0) && (
                                    <p className="mt-2 text-xs text-amber-600 text-center sm:text-right">
                                      {((fotosBorradorPorGuia[g.id]?.length ?? 0) + (g.fotos?.length ?? 0)) === 0
                                        ? 'Debes subir al menos 1 foto para guardar'
                                        : g.estado === 'PENDIENTE'
                                          ? 'Marca la guía como "Entregado" para guardar'
                                          : 'Completa todos los campos obligatorios para guardar'}
                                    </p>
                                  )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4 lg:w-[380px] lg:flex-shrink-0">
          {/* Incidencias */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
              Incidencias de esta ruta
            </h4>
            {(ruta.stops.flatMap((s) => s.guias).filter((g) => g.estado === 'INCIDENCIA')).length === 0 ? (
              <p className="text-xs text-slate-500">Ninguna incidencia registrada.</p>
            ) : (
              <p className="text-xs text-amber-600">{ruta.stops.flatMap((s) => s.guias).filter((g) => g.estado === 'INCIDENCIA').length} guía(s) con incidencia</p>
            )}
          </div>

          {/* Hoja de ruta */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="mb-2 block text-xs font-bold text-slate-700">Hoja de ruta finalizada</label>
            {ruta.estado === 'PENDIENTE' ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="flex items-center gap-1.5 text-[10px] font-medium text-amber-800">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  Debes iniciar la ruta para subir fotos
                </p>
              </div>
            ) : ruta.estado === 'COMPLETADA' ? (
              <>
                <PhotoUploader scope="hoja_ruta" rutaId={id} label="Fotos del documento" onUploaded={fetchRuta} readOnly={true} />
                <p className="mt-1.5 text-[9px] text-slate-500 dark:text-slate-400">La ruta está finalizada. No se pueden agregar o eliminar fotos.</p>
              </>
            ) : !todasLasGuiasTienenDatosGuardados ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="flex items-center gap-1.5 text-[10px] font-medium text-amber-800">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  Todas las guías deben tener datos y fotos guardados para subir la hoja de ruta
                </p>
              </div>
            ) : (
              <>
                <PhotoUploader 
                  scope="hoja_ruta" 
                  rutaId={id} 
                  label="Fotos del documento" 
                  onUploaded={fetchRuta}
                  onProcessingStart={handleFotosStart}
                  onProcessingEnd={handleFotosEnd}
                />
                <p className="mt-1.5 text-[9px] text-slate-500 dark:text-slate-400">
                  Sube la foto del documento firmado (obligatorio para finalizar la jornada).
                </p>
              </>
            )}
          </div>

          {/* Acciones */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {ruta.estado === 'PENDIENTE' && (
              <button type="button" onClick={handleIniciarRuta}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg hover:bg-primary/90 active:scale-[0.98]">
                <span className="material-symbols-outlined">play_arrow</span>
                Iniciar ruta
              </button>
            )}
            {ruta.estado === 'EN_CURSO' && (
              <>
                <button type="button" onClick={handleFinalizarRuta} disabled={!puedeFinalizar}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined">check_circle</span>
                  Finalizar jornada
                </button>
                {!puedeFinalizar && (
                  <div className="mt-2 space-y-1">
                    <p className="text-center text-xs font-semibold text-slate-700">
                      Requisitos para finalizar:
                    </p>
                    <ul className="space-y-0.5 text-[10px] text-slate-600">
                      <li className={`flex items-center gap-1 ${guiasPorRuta.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA') ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <span className="material-symbols-outlined text-xs">
                          {guiasPorRuta.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA') ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        Todas las guías marcadas como Entregado o Incidencia
                      </li>
                      <li className={`flex items-center gap-1 ${todasLasGuiasTienenDatosGuardados ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <span className="material-symbols-outlined text-xs">
                          {todasLasGuiasTienenDatosGuardados ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        Todas las guías con datos y fotos guardados
                      </li>
                      <li className={`flex items-center gap-1 ${totalFotos > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <span className="material-symbols-outlined text-xs">
                          {totalFotos > 0 ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        Al menos 1 foto de hoja de ruta subida ({totalFotos} foto{totalFotos !== 1 ? 's' : ''})
                      </li>
                      <li className={`flex items-center gap-1 ${guiaIdsEnEdicion.size === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <span className="material-symbols-outlined text-xs">
                          {guiaIdsEnEdicion.size === 0 ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        Ninguna guía en modo edición ({guiaIdsEnEdicion.size} en edición)
                      </li>
                    </ul>
                  </div>
                )}
              </>
            )}
            {ruta.estado === 'COMPLETADA' && (
              <p className="text-center text-sm font-medium text-slate-600">Ruta completada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Nav móvil */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-200 bg-white pb-safe md:hidden">
        <Link to={`/chofer/rutas/${id}`} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-primary">
          <span className="material-symbols-outlined text-xl">route</span>
          <p className="text-[9px] font-bold uppercase tracking-tight">Mi Ruta</p>
        </Link>
        <Link to="/chofer/rutas" className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-400">
          <span className="material-symbols-outlined text-xl">history</span>
          <p className="text-[9px] font-bold uppercase tracking-tight">Historial</p>
        </Link>
      </nav>

      <AnimatePresence>
        {showUbicacionErrorModal && (
          <ModalMotion
            show={showUbicacionErrorModal}
            backdropClassName="bg-black/45"
            panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="material-symbols-outlined text-amber-600">location_off</span>
                Ubicación no disponible
              </h3>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-slate-700">
                No se pudo acceder a tu ubicación. Para usar el seguimiento GPS, debes activar los permisos de ubicación.
              </p>
              
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold text-slate-900">Cómo activar la ubicación:</p>
                <ol className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Busca el ícono de candado o información en la barra de direcciones del navegador</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>Haz clic y busca la opción "Permisos" o "Configuración del sitio"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Cambia "Ubicación" de "Bloqueado" a "Permitir"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>Recarga la página y vuelve a iniciar la ruta</span>
                  </li>
                </ol>
              </div>

              <p className="text-xs text-slate-500">
                Si el problema persiste, verifica que tu dispositivo tenga el GPS activado y que el navegador tenga permisos de ubicación en la configuración del sistema.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUbicacionErrorModal(false)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  Entendido
                </button>
              </div>
            </div>
          </ModalMotion>
        )}
      </AnimatePresence>
    </div>
  )
}
