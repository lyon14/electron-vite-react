import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import store from "./store";
import './samples/node-api'
import { Provider } from 'react-redux'
import './index.scss'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

postMessage({ payload: 'removeLoading' }, '*')
