import './styles.css'
import { createPreloader } from './preloader'
import { sceneReady } from './boot'

// Preloader gates only on fonts + the hero scene. Later sections stream after.
const pre = createPreloader()
pre.track(document.fonts.load('900 1em Archivo'), 1)
pre.track(document.fonts.load('400 1em "JetBrains Mono"'), 1)
pre.track(import('./App').then((m) => m.mount(pre.done, pre.skipped)), 2)
pre.track(sceneReady, 2)
