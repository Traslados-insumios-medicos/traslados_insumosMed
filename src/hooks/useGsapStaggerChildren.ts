import gsap from 'gsap'
import { useLayoutEffect, type RefObject } from 'react'

/**
 * Revela hijos con stagger (skill gsap-core). Sin animación si prefers-reduced-motion.
 */
export function useGsapStaggerChildren(
  parentRef: RefObject<HTMLElement | null>,
  selector: string,
  deps: readonly unknown[],
) {
  useLayoutEffect(() => {
    const parent = parentRef.current
    if (!parent) return
    const items = parent.querySelectorAll<HTMLElement>(selector)
    if (!items.length) return

    const mm = gsap.matchMedia()
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const rm = Boolean(context.conditions?.reduceMotion)
        gsap.from(items, {
          autoAlpha: rm ? 1 : 0,
          y: rm ? 0 : 22,
          duration: rm ? 0 : 0.48,
          stagger: rm ? 0 : 0.075,
          ease: 'power3.out',
        })
        return () => {
          gsap.killTweensOf(items)
        }
      },
    )
    return () => {
      mm.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed explicitly
  }, deps)
}
