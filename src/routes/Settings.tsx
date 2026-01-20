import { Shield } from 'lucide-react'

export default function Settings() {
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-text-secondary">Settings</div>
        <div className="text-2xl font-semibold text-text-primary">Configuration</div>
      </div>

      <div className="rounded-card border border-border bg-sidebar/60 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-success" />
          <div>
            <div className="text-sm font-semibold text-text-primary">API Keys</div>
            <div className="text-sm text-text-secondary">
              All API keys are securely stored on the server. No configuration needed.
            </div>
          </div>
        </div>

        <div className="rounded-card border border-success/30 bg-success/10 p-4">
          <div className="flex items-center gap-2 text-success text-sm font-medium">
            <span>Server-side configuration active</span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Claude API and Supabase credentials are configured via environment variables on the server.
            This ensures your API keys are never exposed to the browser.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-border bg-sidebar/60 p-5 space-y-4">
        <div className="text-sm font-semibold text-text-primary">Environment</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">API Endpoint</span>
            <span className="text-text-primary font-mono text-xs">
              {import.meta.env.VITE_API_URL || 'Default (same origin)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Build Mode</span>
            <span className="text-text-primary font-mono text-xs">
              {import.meta.env.MODE}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
