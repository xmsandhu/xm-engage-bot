import React from 'react'
import ChatBot from 'react-chatbotify'
import bot from './assets/bot.png'

const DEFAULT_API = import.meta.env.VITE_API_URL || '/api/chat'

export default function App() {
  const apiUrlRef = React.useRef(DEFAULT_API)
  const [apiUrl, setApiUrl] = React.useState(DEFAULT_API)
  const apiKeyRef = React.useRef(import.meta.env.VITE_API_KEY || '')
  const [apiKey, setApiKey] = React.useState(apiKeyRef.current)
  const historyRef = React.useRef([])
  const collectedRef = React.useRef({})
  const [ended, setEnded] = React.useState(false)
  const [sessionKey, setSessionKey] = React.useState(0)
  const [aiSummary, setAiSummary] = React.useState('')
  const [building, setBuilding] = React.useState(false)
  const contactStageRef = React.useRef('name') // 'name' -> 'email'
  const contactDoneRef = React.useRef(false) // guard to avoid re-entering contact after completion

  // tighten email validation (require at least 2-char TLD)
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
  const handleBuildAiSummary = async () => {
    if (building) return
    setBuilding(true)
    try {
      const res = await fetch(apiUrlRef.current, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiUrlRef.current.startsWith('http') && apiKeyRef.current ? { 'x-api-key': apiKeyRef.current } : {})
        },
        body: JSON.stringify({ action: 'summarize', mode: 'summary', history: historyRef.current, collected: collectedRef.current, summary: aiSummary })
      })
      let json
      try { json = await res.json() } catch { const txt = await res.text(); try { json = JSON.parse(txt) } catch { json = {} } }
      if (json && typeof json === 'object' && 'body' in json && typeof json.body === 'string') {
        try { json = JSON.parse(json.body) } catch {}
      }
      const sum = json?.summary || json?.control?.summary || ''
      if (sum) setAiSummary(sum)
    } catch (e) {
      // no-op; keep previous summary
    } finally {
      setBuilding(false)
    }
  }

  const buildSummary = () => {
    const c = collectedRef.current || {}
    const lines = []
    if (c.name) lines.push(`Name: ${c.name}`)
    if (c.email) lines.push(`Email: ${c.email}`)
    Object.keys(c).forEach(k => { if (!['name','email'].includes(k)) lines.push(`${k.replaceAll('_',' ')}: ${String(c[k])}`) })
    return lines.join('\n') || 'No details collected yet.'
  }

  const flow = {
    start: {
      message: "Hi! I’m your friendly project assistant. Ready to get started?",
      options: { items: ["Yes, let’s start"], sendOutput: false },
      chatDisabled: true,
      path: 'contact'
    },
    // Unified contact node to capture name then email without switching nodes
    contact: {
      message: "Before we begin, what's your name?",
      async function(params) {
        // If contact is already completed, immediately route to talkLoop so input is handled by the chat handler
        if (contactStageRef.current === 'done' || contactDoneRef.current) {
          return 'talkLoop'
        }
        const raw = params.userInput
        const text = String(raw || '').trim()
        const stage = contactStageRef.current || 'name'
        if (typeof raw === 'undefined') return // wait for input
        // Stage: name
        if (stage === 'name') {
          if (!text) return
          collectedRef.current = { ...collectedRef.current, name: text }
          await params.injectMessage(`Nice to meet you, ${text}!`)
          await params.injectMessage("Great. What's the best email to reach you?")
          contactStageRef.current = 'email'
          return 'contact' // stay on this node and wait for email
        }
        // Stage: email
        if (!text) return 'contact'
        if (!isValidEmail(text)) {
          await params.injectMessage('Please enter a valid email address (e.g. name@example.com).')
          return 'contact'
        }
        collectedRef.current = { ...collectedRef.current, email: text }
        // Mark contact as complete before routing to avoid any race on next input
        contactStageRef.current = 'done'
        contactDoneRef.current = true
        await params.injectMessage("Thanks! Let's talk about your project.")
        await params.injectMessage('Tell me a bit about your project.')
        return 'talkLoop'
      }
    },
    talkIntro: { message: "Tell me a bit about your project.", path: 'talkLoop' },
    // Renamed talk node to avoid immediate re-entry before showing the prompt
    talkLoop: {
      message: "",
      async function(params) {
        const user = String(params.userInput || '').trim()
        if (!user || ended) return 'talkLoop'
        const payload = {
          mode: 'guided',
          message: user,
          history: historyRef.current,
          collected: collectedRef.current,
        }
        try {
          console.log('[chat] POST', apiUrlRef.current, payload)
          const res = await fetch(apiUrlRef.current, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiUrlRef.current.startsWith('http') && apiKeyRef.current ? { 'x-api-key': apiKeyRef.current } : {})
            },
            body: JSON.stringify(payload)
          })
          let json
          try { json = await res.json() } catch { const txt = await res.text(); try { json = JSON.parse(txt) } catch { json = {} } }
          if (json && typeof json === 'object' && 'body' in json && typeof json.body === 'string') {
            try { json = JSON.parse(json.body) } catch {}
          }
          const reply = json?.reply || 'Sorry, I had trouble responding.'
          historyRef.current.push({ role: 'user', content: user })
          historyRef.current.push({ role: 'assistant', content: reply })
          if (json?.control?.collected) {
            collectedRef.current = { ...collectedRef.current, ...json.control.collected }
          }
          await params.simulateStreamMessage(reply)
          if (json?.control?.done) {
            await params.simulateStreamMessage('Thanks! I\'ve captured your details. We\'ll be in touch shortly.')
          }
        } catch (e) {
          await params.simulateStreamMessage('Sorry, something went wrong. Please try again.')
        }
        return 'talkLoop'
      }
    }
  }

  const handleEndChat = () => setEnded(true)
  const handleRestart = () => { setEnded(false); historyRef.current = []; collectedRef.current = {}; contactStageRef.current = 'name'; contactDoneRef.current = false; setSessionKey(k => k + 1); setAiSummary('') }

  return (
    <div className="app">
      <div className="header pro">
        <div className="brand">
          <img src={bot} alt="logo" className="brand-logo" />
          <span className="brand-name">Xminds Connect</span>
        </div>
        <div className="toolbar">
          <input type="text" className="input" placeholder="API URL (e.g. https://your-api.execute-api.<region>.amazonaws.com/<stage>/execute or /api/chat)" value={apiUrl} onChange={(e)=>{ setApiUrl(e.target.value); apiUrlRef.current = e.target.value; }} />
          <input type="password" className="input" placeholder="API Key (x-api-key)" value={apiKey} onChange={(e)=>{ setApiKey(e.target.value); apiKeyRef.current = e.target.value; }} />
          {/* End/Restart button moved next to chat box */}
        </div>
      </div>
      <div className="container">
        <div className="layout">
          <div className="card pro" style={{ position: 'relative' }}>
            {!ended ? (
              <>
                <button
                  className="btn btn-primary"
                  style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff', fontWeight: 700, borderRadius: 9999, padding: '8px 14px', boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }}
                  onClick={handleEndChat}
                  title="End chat"
                  aria-label="End chat"
                >⛔ End</button>
                <ChatBot
                  key={sessionKey}
                  settings={{
                    general: { embedded: true, primaryColor: '#7c3aed', secondaryColor: '#22d3ee', showFooter: false, showHeader: true },
                    chatInput: { disabled: ended },
                    footer: { text: '' },
                    header: { title: 'Xminds Connect', showAvatar: true, avatar: bot },
                  }}
                  styles={{
                    headerStyle: { background: '#0b1220', color: '#f8fafc', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: '10px 14px', borderBottom: '1px solid #1f2937' },
                    chatWindowStyle: { backgroundColor: '#0f172a', border: '1px solid #1f2937', borderRadius: 12 },
                    botBubbleStyle: { background: '#111827', color: '#e5e7eb' },
                    userBubbleStyle: { background: '#7c3aed', color: '#ffffff' },
                    footerStyle: { background: '#0b1220', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTop: '1px solid #1f2937' },
                    sendButtonStyle: { backgroundColor: '#7c3aed' },
                    sendIconStyle: { color: '#ffffff' },
                    chatInputAreaStyle: { background: '#0b1220', color: '#e5e7eb' },
                    chatInputAreaFocusedStyle: { background: '#0b1220', color: '#e5e7eb' },
                    chatInputContainerStyle: { background: '#0b1220', color: '#e5e7eb' }
                  }}
                  flow={flow}
                />
              </>
            ) : (
              <div className="ended">
                <h2>Chat ended</h2>
                <p>Thank you for your time. You can restart the conversation anytime.</p>
                <button className="btn btn-primary" onClick={handleRestart}>Restart Chat</button>
              </div>
            )}
          </div>
          <aside className="side pro">
            <div className="side-header">
              <h3>Summary</h3>
            </div>
            <div className="side-body">
              <button className="btn btn-primary" onClick={handleBuildAiSummary} disabled={building}>
                {building ? 'Building…' : 'Build AI Summary'}
              </button>
              <pre className="summary" style={{ marginTop: 12 }}>{aiSummary || buildSummary()}</pre>
              <button className="btn btn-ghost" onClick={()=>{ navigator.clipboard?.writeText(aiSummary || buildSummary()) }}>Copy Summary</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
