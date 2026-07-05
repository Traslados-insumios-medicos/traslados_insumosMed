export type ProgressTaskType =
  | 'PDF_GENERAL'
  | 'EXCEL_REPORT'
  | 'PHOTO_UPLOAD'
  | 'EXCEL_IMPORT'
  | 'GENERIC_TASK';

export interface ProgressEvent {
  step?: string;
  message?: string;
  subMessage?: string;
  current?: number;
  total?: number;
  percent?: number;
  taskType?: ProgressTaskType;
}

export interface SseProgressCallbacks {
  onProgress?: (event: ProgressEvent) => void;
  onCompleted?: (event: ProgressEvent) => void;
  onError?: (message: string) => void;
}

/**
 * Inicia una escucha SSE genérica en /api/progress/stream para monitorear tareas largas.
 * Es completamente pura y desacoplada de tiendas globales o componentes UI específicos.
 *
 * @param jobId     UUID de la tarea a monitorear
 * @param callbacks Funciones de respuesta ante avance, finalización o error
 * @returns Función de cancelación para abortar el flujo y liberar recursos
 */
export function listenSseProgress(
  jobId: string,
  callbacks: SseProgressCallbacks = {},
): () => void {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const abortController = new AbortController();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  fetch(`${apiUrl}/progress/stream?jobId=${jobId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: abortController.signal,
  })
    .then(async (res) => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          const line = chunk.trim();
          if (line.startsWith('data: ')) {
            try {
              const event: ProgressEvent = JSON.parse(line.slice(6));
              if (event.step === 'completed') {
                callbacks.onCompleted?.(event);
                break;
              } else if (event.step === 'error') {
                callbacks.onError?.(event.message || 'Error en el proceso en servidor');
                break;
              } else {
                callbacks.onProgress?.(event);
              }
            } catch {
              // Ignorar tramas malformadas en el stream
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('[SSE] Error de conexión o pérdida de stream:', err);
        callbacks.onError?.('Pérdida de conexión con el servidor durante el proceso.');
      }
    });

  return () => {
    abortController.abort();
  };
}
