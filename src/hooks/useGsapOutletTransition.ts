import gsap from 'gsap'
import { useLayoutEffect, type RefObject } from 'react'

/**
 * Entrada suave al cambiar de ruta (skill gsap-core + accesibilidad matchMedia).
 */
export function useGsapOutletTransition(
  containerRef: RefObject<HTMLElement | null>,
  routeKey: string,
) {
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const mm = gsap.matchMedia()
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const reduceMotion = Boolean(context.conditions?.reduceMotion)
        gsap.fromTo(
          el,
          { autoAlpha: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: reduceMotion ? 0 : 0.45,
            ease: 'power3.out',
          },
        )
        return () => {
          gsap.killTweensOf(el)
        }
      },
    )
    return () => {
      mm.revert()
    }
  }, [routeKey])
}
