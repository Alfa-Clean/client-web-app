import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { initTheme } from './hooks/useTheme'

initTheme()
render(<App />, document.getElementById('app')!)
