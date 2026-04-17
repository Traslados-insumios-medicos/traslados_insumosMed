import { useCallback } from 'react'

/**
 * Hook para descargar imágenes desde Cloudinary u otras URLs
 * Usa fetch + blob para mejor compatibilidad cross-browser
 */
export function useImageDownload() {
  const downloadImage = useCallback(async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando imagen:', error)
      // Fallback: abrir en nueva pestaña
      window.open(imageUrl, '_blank')
    }
  }, [])

  return { downloadImage }
}
