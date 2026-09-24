import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'
import { draft, initLibrary, library, ui } from './store'

createApp(App).mount('#app')
initLibrary()

// Handy for inspecting state from the browser console during development.
if (import.meta.env.DEV) window.__studio = { draft, ui, library }
