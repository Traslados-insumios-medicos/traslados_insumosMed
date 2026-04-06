/**
 * ENTITY: ruta
 * Modelo de dominio compartido entre features.
 * FSD: entities son más estables que features, no dependen de ellas.
 */
export type { Ruta, EstadoRuta, Stop } from '../../types/models'

export function getRutaProgress(
  guias: { rutaId: string; estado: string }[],
  rutaId: string,
): number {
  const guiasRuta = guias.filter((g) => g.rutaId === rutaId)
  if (!guiasRuta.length) return 0
  const entregadas = guiasRuta.filter((g) => g.estado === 'ENTREGADO').length
  return Math.round((entregadas / guiasRuta.length) * 100)
}
