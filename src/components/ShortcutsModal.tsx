import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

const shortcuts = [
  { key: '⌘ / Ctrl + K', action: 'Open search' },
  { key: '⌘ / Ctrl + U', action: 'Upload meeting' },
  { key: 'Esc', action: 'Close modal' },
  { key: '↑ ↓', action: 'Navigate lists' },
  { key: 'Enter', action: 'Select item' },
]

export function ShortcutsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(520px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-sidebar/95 p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</Dialog.Title>
            <Dialog.Close className="text-text-secondary hover:text-text-primary">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="mt-4 grid gap-2 rounded-card border border-border bg-background/60 p-3 text-sm text-text-primary">
            {shortcuts.map((s) => (
              <div key={s.key} className="grid grid-cols-[160px_1fr] items-center gap-3">
                <kbd className="inline-flex items-center justify-center rounded-button bg-white/10 px-3 py-1 text-xs font-mono text-text-primary border border-border">{s.key}</kbd>
                <span className="text-text-secondary">{s.action}</span>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
