const fs = require('fs')
const files = [
  'src/features/admin/AdminChoferesPage.tsx',
  'src/features/admin/AdminReportesPage.tsx',
  'src/features/chofer/ChoferRutasPage.tsx',
  'src/features/chofer/ChoferRutaDetallePage.tsx',
  'src/features/cliente/ClienteEnviosPage.tsx',
  'src/features/cliente/ClienteEnvioDetallePage.tsx',
  'src/features/cliente/ClienteRutaTiempoRealPage.tsx',
  'src/components/map/RouteMap.tsx',
]
files.forEach((f) => {
  let s = fs.readFileSync(f, 'utf8')
  s = s.replace(/\s+dark:[a-zA-Z0-9/\-[\]\.]+/g, '')
  fs.writeFileSync(f, s)
})
console.log('Done')
