import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CodeBlock({ code, language = 'bash', label }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
          {label && <span className="text-xs font-medium text-muted font-mono ml-2">{label}</span>}
        </div>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-text-base transition-colors px-2 py-1 rounded hover:bg-surface-2">
          {copied ? <><Check size={12} className="text-success" /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-surface-2 m-0 rounded-none text-sm">
        <code className="font-mono text-text-base/90">{code}</code>
      </pre>
    </div>
  )
}
