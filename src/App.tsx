import nodeLogo from "./assets/node.svg"
import { useState } from 'react'

console.log('[App.tsx]', `Hello world from Electron ${process.versions.electron}!`)

function App() {

  return (
    <div className="container py-4 px-3 mx-auto">
      <h1>Hello, Bootstrap and Vite!</h1>
      <button className="btn btn-primary">Primary button</button>
    </div>
  )
}

export default App
