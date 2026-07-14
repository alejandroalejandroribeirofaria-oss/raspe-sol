import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Tenta iniciar o AppKit, se der erro só ignora e continua
const initAppKit = async () => {
  try {
    const { createAppKit } = await import('@reown/appkit/react')
    const { SolanaAdapter } = await import('@reown/appkit-adapter-solana/react')
    const { solana } = await import('@reown/appkit/networks')

    const projectId = import.meta.env.VITE_WC_PROJECT_ID

    if(projectId) {
      const solanaAdapter = new SolanaAdapter()
      createAppKit({
        adapters: [solanaAdapter],
        projectId,
        networks: [solana],
        defaultNetwork: solana,
        metadata: {
          name: 'Raspe Sol',
          description: 'Raspe e Ganhe',
          url: 'https://raspe-sol-oficial.onrender.com',
          icons: ['https://raspe-sol-oficial.onrender.com/logo.png']
        }
      })
    }
  } catch (e) {
    console.error("AppKit falhou:", e) // se quebrar não trava a tela
  }
}

initAppKit()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
