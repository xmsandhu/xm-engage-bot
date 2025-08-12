import React from 'react'
import ChatBot from 'react-chatbotify'

const DEFAULT_API = import.meta.env.VITE_API_URL || '/api/chat'

export default function App() {
  const apiUrlRef = React.useRef(DEFAULT_API)
  const [apiUrl, setApiUrl] = React.useState(DEFAULT_API)
  const apiKeyRef = React.useRef(import.meta.env.VITE_API_KEY || '')
  const [apiKey, setApiKey] = React.useState(apiKeyRef.current)
  const historyRef = React.useRef([])
  const collectedRef = React.useRef({})

  const flow = {
    start: {
      message: "Hi! I’m your friendly project assistant. Ready to get started?",
      options: { items: ["Yes, let’s start"], sendOutput: false },
      chatDisabled: true,
      path: 'talk'
    },
    talk: {
      message: "Tell me a bit about your project.",
      async function(params) {
        const user = String(params.userInput || '').trim()
        if (!user) return 'talk'
        const payload = {
          mode: 'guided',
          message: user,
          history: historyRef.current,
          collected: collectedRef.current,
        }
        try {
          const res = await fetch(apiUrlRef.current, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiUrlRef.current.startsWith('http') && apiKeyRef.current ? { 'x-api-key': apiKeyRef.current } : {})
            },
            body: JSON.stringify(payload)
          })
          const json = await res.json()
          const reply = json.reply || 'Sorry, I had trouble responding.'
          historyRef.current.push({ role: 'user', content: user })
          historyRef.current.push({ role: 'assistant', content: reply })
          if (json.control?.collected) {
            collectedRef.current = { ...collectedRef.current, ...json.control.collected }
          }
          await params.simulateStreamMessage(reply)
          if (json.control?.done) {
            await params.simulateStreamMessage('Thanks! I\'ve captured your details. We\'ll be in touch shortly.')
          }
        } catch (e) {
          await params.simulateStreamMessage('Sorry, something went wrong. Please try again.')
        }
        return 'talk'
      }
    }
  }

  return (
    <div className="app">
      <div className="header">
        <span className="badge">Xminds Connect</span>
        <a href="https://xminds.com" target="_blank" rel="noreferrer" className="hint">xminds.com</a>
        <input
          type="text"
          placeholder="API URL (e.g. https://your-api.execute-api.<region>.amazonaws.com/<stage>/execute or /api/chat)"
          value={apiUrl}
          onChange={(e)=>{ setApiUrl(e.target.value); apiUrlRef.current = e.target.value; }}
        />
        <input
          type="password"
          placeholder="API Key (x-api-key)"
          value={apiKey}
          onChange={(e)=>{ setApiKey(e.target.value); apiKeyRef.current = e.target.value; }}
        />
      </div>
      <div className="container">
        <div className="card">
          <ChatBot
            settings={{
              general: { embedded: true, primaryColor: '#7c3aed', secondaryColor: '#22d3ee' },
              chatHistory: { storageKey: 'xm_engage_bot_history' }
            }}
            flow={flow}
          />
        </div>
      </div>
    </div>
  )
}
