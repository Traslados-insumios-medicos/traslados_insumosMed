import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function ImageSourceSheet({
  open,
  onClose,
  onCamera,
  onGallery,
}: Props) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="image-source-backdrop"
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            key="image-source-panel"
            className="w-full max-w-lg rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.28, ease }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-source-title"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <p
              id="image-source-title"
              className="mb-3 text-center text-sm font-semibold text-slate-800"
            >
              Agregar imagen
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onCamera}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-primary hover:bg-primary/5 active:bg-primary/10"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-xl">
                    photo_camera
                  </span>
                </span>
                Tomar foto
              </button>
              <button
                type="button"
                onClick={onGallery}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-primary hover:bg-primary/5 active:bg-primary/10"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-xl">
                    photo_library
                  </span>
                </span>
                Seleccionar de galería
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
