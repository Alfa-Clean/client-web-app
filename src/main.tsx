import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { initTheme } from './hooks/useTheme'
import { registerServiceWorker } from './api/push'

initTheme()
registerServiceWorker()
render(<App />, document.getElementById('app')!)
