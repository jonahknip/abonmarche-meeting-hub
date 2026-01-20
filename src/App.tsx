import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { BarChart3, CalendarClock, CheckSquare, ChevronDown, LayoutDashboard, MessageSquare, Settings as SettingsIcon, Users, Upload } from 'lucide-react'
import { useAppStore } from './state/useAppStore'
import Dashboard from './routes/Dashboard'
import Meetings from './routes/Meetings'
import ActionItems from './routes/ActionItems'
import People from './routes/People'
import Analytics from './routes/Analytics'
import Settings from './routes/Settings'
import { UploadModal } from './components/UploadModal'
import MeetingDetail from './routes/MeetingDetail'
import { ToastProvider } from './components/Toast'
import { CommandPalette } from './components/CommandPalette'
import { ShortcutsModal } from './components/ShortcutsModal'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meetings', label: 'All Meetings', icon: CalendarClock },
  { to: '/action-items', label: 'Action Items', icon: CheckSquare },
  { to: '/people', label: 'People', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function Sidebar() {
  const toggleUploadModal = useAppStore((s) => s.toggleUploadModal)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const sidebarOpen = useAppStore((s) => s.ui.sidebarOpen)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        toggleSidebar(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [toggleSidebar])

  return (
    <aside
      className={`flex h-screen w-[260px] flex-col border-r border-border bg-sidebar/90 backdrop-blur transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} tablet:translate-x-0`}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="h-9 w-9 rounded-lg bg-primary/20 border border-border grid place-items-center text-primary font-semibold">A</div>
        <div className="leading-tight">
          <div className="text-sm text-text-secondary">Abonmarche</div>
          <div className="text-base font-semibold text-text-primary">Meeting Hub</div>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="relative">
          <input
            className="w-full rounded-button bg-background/70 border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="Search meetings..."
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-2 py-0.5 text-[10px] text-text-secondary">Cmd+K</kbd>
        </div>
      </div>

      <nav className="px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 ${
                isActive ? 'bg-primary/15 text-text-primary border border-primary/40' : 'text-text-secondary'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-border px-4 py-4">
        <button
          onClick={() => toggleUploadModal(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-button bg-primary px-3 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" /> Upload Transcript
        </button>
        <div className="flex items-center justify-between rounded-button border border-border px-3 py-2 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-border grid place-items-center text-primary font-semibold">JL</div>
            <div>
              <div className="text-text-primary text-sm">Jordan Lee</div>
              <div className="text-[11px] text-success">Online</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </aside>
  )
}

function ShellLayout() {
  const toggleUploadModal = useAppStore((s) => s.toggleUploadModal)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const uploadModalOpen = useAppStore((s) => s.ui.uploadModalOpen)
  const commandPaletteOpen = useAppStore((s) => s.ui.commandPaletteOpen)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette)

  useEffect(() => {
    ;(window as unknown as { _setShortcutsOpen: typeof setShortcutsOpen })._setShortcutsOpen = setShortcutsOpen
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleCommandPalette(true)
      }
      if (meta && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        toggleUploadModal(true)
      }
      if (e.key === 'Escape') {
        toggleUploadModal(false)
        toggleCommandPalette(false)
        setShortcutsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleUploadModal, toggleCommandPalette])

  return (
    <div className="flex bg-background text-text-primary">
      <Sidebar />
      <div className="flex-1 min-h-screen overflow-y-auto bg-background/90">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 shadow-sm shadow-black/20 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleSidebar()}
              className="tablet:hidden rounded-button border border-border bg-sidebar/80 px-2 py-1 text-text-secondary hover:text-text-primary"
            >
              Menu
            </button>
            <div className="text-sm text-text-secondary">Workspace</div>
            <div className="text-base font-semibold text-text-primary">Abonmarche Meeting Hub</div>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            <MessageSquare className="h-4 w-4" />
            <SettingsIcon className="h-4 w-4" />
          </div>
        </header>
        <main className="px-4 py-6 tablet:px-6 desktop:px-10">
          <Outlet />
        </main>
      </div>
      <UploadModal open={uploadModalOpen} onOpenChange={toggleUploadModal} />
      <CommandPalette open={commandPaletteOpen} onOpenChange={toggleCommandPalette} />
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <button
        onClick={() => setShortcutsOpen(true)}
        title="Keyboard shortcuts"
        className="fixed bottom-4 left-4 z-40 grid h-10 w-10 place-items-center rounded-full border border-border bg-white/5 text-text-secondary hover:bg-white/10"
      >
        ?
      </button>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ShellLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="meetings/:id" element={<MeetingDetail />} />
            <Route path="action-items" element={<ActionItems />} />
            <Route path="people" element={<People />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
