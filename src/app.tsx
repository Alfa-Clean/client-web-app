import WebApp from '@twa-dev/sdk'
import { useEffect } from 'preact/hooks'

export function App() {
  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  return (
    <div class="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <h1 class="text-2xl font-semibold text-gray-900 mb-2">AlfaClean</h1>
      <p class="text-gray-500 text-sm">Заказ уборки — скоро здесь</p>
    </div>
  )
}
