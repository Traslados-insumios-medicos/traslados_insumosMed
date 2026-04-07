import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

const ease = [0.16, 1, 0.3, 1] as const

interface ModalMotionProps {
  show: boolean
  backdropClassName?: string
  panelClassName: string
  children: ReactNode
  panelProps?: HTMLMotionProps<'div'>
}

export function ModalMotion({
  show,
  backdropClassName = 'bg-black/50',
  panelClassName,
  children,
  panelProps,
}: ModalMotionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="modal-backdrop"
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${backdropClassName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={panelClassName}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease }}
            onClick={(e) => e.stopPropagation()}
            {...panelProps}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
