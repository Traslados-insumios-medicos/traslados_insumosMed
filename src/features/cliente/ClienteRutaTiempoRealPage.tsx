import { useMemo } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { RouteMap } from '../../components/map/RouteMap'
import { useSimulatedRoute } from '../../utils/mapSimulation'

export function ClienteRutaTiempoRealPage() {
  const { currentUser } = useAuthStore()
  const { guias, rutas, stops, usuarios, clientes } = useLogisticsStore()

  // Clientes secundarios del principal logueado
  const idsSecundarios = useMemo(
    () => clientes.filter((c) => c.clientePrincipalId === currentUser?.clienteId).map((c) => c.id),
    [clientes, currentUser],
  )

  const guiaActiva = useMemo(() => {
    const enCurso = guias.find(
      (g) =>
        idsSecundarios.includes(g.clienteId) &&
        (g.estado === 'PENDIENTE' || g.estado === 'INCIDENCIA') &&
        rutas.find((r) => r.id === g.rutaId)?.estado === 'EN_CURSO',
    )
    if (enCurso) return enCurso
    return guias.find(
      (g) =>
        idsSecundarios.includes(g.clienteId) &&
        (g.estado === 'PENDIENTE' || g.estado === 'INCIDENCIA'),
    )
  }, [guias, rutas, idsSecundarios])

  const ruta = rutas.find((r) => r.id === guiaActiva?.rutaId)
  const chofer = usuarios.find((u) => u.id === ruta?.choferId)

  const stopsRuta = useMemo(
    () =>
      ruta
        ? stops.filter((s) => ruta.stopIds.includes(s.id)).sort((a, b) => a.orden - b.orden)
        : [],
    [ruta, stops],
  )

  // Parada correspondiente a la guía del cliente
  const stopCliente = stops.find((s) => s.id === guiaActiva?.stopId)

  const coordinates = useMemo(
    () => stopsRuta.map((s) => ({ lat: s.lat, lng: s.lng })),
    [stopsRuta],
  )
  const { currentPosition } = useSimulatedRoute({ coordinates, intervalMs: 4000 })

  // Paradas anteriores a la del cliente = entregadas antes
  const paradasAnteriores = stopCliente
    ? stopsRuta.filter((s) => s.orden < stopCliente.orden).length
    : 0
  const paradasRestantes = stopCliente ? paradasAnteriores : 0
  const etaMinutos = 10 + paradasRestantes * 12

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ruta en tiempo real</h1>
        <p className="text-sm text-slate-500">
          Seguimiento en vivo de tu envío
        </p>
      </div>

      {!guiaActiva || !ruta ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">map</span>
          <p className="mt-2 text-sm text-slate-500">
            No hay envíos activos en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Mapa */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-slate-700">En vivo</span>
              </div>
              <span className="text-xs text-slate-400">Actualización cada 4s</span>
            </div>
            <div className="h-72 sm:h-96 lg:h-[460px]">
              <RouteMap
                stops={stopsRuta}
                currentPosition={currentPosition}
                highlightedStopId={guiaActiva.stopId}
              />
            </div>
            <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
              Posición simulada · OpenStreetMap · Leaflet
            </p>
          </div>

          {/* Panel lateral */}
          <div className="flex flex-col gap-4">
            {/* ETA */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">ETA estimado</p>
              <p className="mt-1 text-3xl font-black text-slate-900">~{etaMinutos} min</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {paradasRestantes > 0
                  ? `${paradasRestantes} parada${paradasRestantes > 1 ? 's' : ''} antes de la tuya`
                  : 'Tu parada es la próxima'}
              </p>
            </div>

            {/* Info guía */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Tu envío</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Guía</span>
                  <span className="font-semibold text-primary">{guiaActiva.numeroGuia}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Estado</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    guiaActiva.estado === 'INCIDENCIA'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {guiaActiva.estado === 'INCIDENCIA' ? 'Incidencia' : 'En tránsito'}
                  </span>
                </div>
                {stopCliente && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500 shrink-0">Destino</span>
                    <span className="text-right text-xs text-slate-700">{stopCliente.direccion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info chofer */}
            {chofer && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Chofer asignado</p>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{chofer.nombre}</p>
                    <p className="text-xs text-slate-500">
                      Ruta #{ruta.id.replace('ruta-', '')} · {stopsRuta.length} paradas
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Paradas de la ruta */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Paradas de la ruta</p>
              <ul className="space-y-2">
                {stopsRuta.map((s) => {
                  const esMia = s.id === guiaActiva.stopId
                  const guiasStop = guias.filter((g) => g.stopId === s.id)
                  const entregada = guiasStop.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA')
                  return (
                    <li key={s.id} className={`flex items-start gap-2 rounded-lg p-2 text-xs ${esMia ? 'bg-primary/10 font-semibold text-primary' : ''}`}>
                      <span className={`mt-0.5 size-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        entregada ? 'bg-emerald-500 text-white' : esMia ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {s.orden}
                      </span>
                      <span className={`line-clamp-2 ${esMia ? 'text-primary' : 'text-slate-600'}`}>
                        {s.direccion}
                        {esMia && <span className="ml-1 text-[10px]">← tu parada</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
