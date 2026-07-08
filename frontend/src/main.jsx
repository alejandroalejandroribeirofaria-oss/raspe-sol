import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { translations } from './i18n.js'

const DEFAULT_LANG = 'pt'

window.t = (key, lang = DEFAULT_LANG) => {
  const dict = translations[lang] || translations[DEFAULT_LANG]
  return dict[key] || key // se não achar a key, retorna a própria key pra não quebrar
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

