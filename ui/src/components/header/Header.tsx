import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  MoreVertical,
  CircleUser,
  Library,
  Settings,
  LogOut,
} from 'lucide-react'
import Logo from '../../assets/logo.svg'

interface UserProfile {
  username: string
  email: string
}

interface LibraryItem {
  id: string
  name: string
}

interface HeaderProps {
  profile?: UserProfile | null
  libraries?: LibraryItem[]
  activeLibraryId?: string | null
  onLibraryChange?: (library: LibraryItem) => void
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [ref, onClose])
}

export function Header({
  profile,
  libraries,
  activeLibraryId,
  onLibraryChange,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useClickOutside(menuRef, () => setIsMenuOpen(false))

  const isActiveLibrary = (id: string) => activeLibraryId === id

  return (
    <header className="h-[50px] flex items-center justify-between bg-[#444] z-20 flex-none">
      {/* Logo and brand */}
      <div className="flex items-center mx-2.5 text-white">
        <img
          src={Logo}
          alt="Photonix Logo"
          className="w-[30px] h-[30px] mr-2 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.5)]"
        />
        <span className="text-[26px] font-normal leading-tight">Photonix</span>
      </div>

      {/* Navigation spacer */}
      <div className="flex-grow" />

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
          aria-label="Open menu"
          data-testid="header-menu-button"
        >
          <MoreVertical className="w-[30px] h-[30px] text-white/90" />
        </button>

        {isMenuOpen && (
          <ul className="absolute right-0 top-[50px] w-[200px] bg-[#444] shadow-[-3px_8px_17px_rgba(0,0,0,0.15)] list-none m-0 p-0 z-10">
            {/* Profile section */}
            {profile && (
              <li
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-4 py-3 cursor-pointer text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <CircleUser className="w-6 h-6 mr-2.5 text-white/90" />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm leading-[18px] truncate">
                    {profile.username}
                  </span>
                  <span className="text-[10px] leading-3 text-neutral-400 truncate">
                    {profile.email}
                  </span>
                </div>
              </li>
            )}

            {/* Libraries */}
            {libraries?.map((lib) => (
              <li
                key={lib.id}
                onClick={() => {
                  onLibraryChange?.(lib)
                  setIsMenuOpen(false)
                }}
                className="flex items-center px-4 py-3 cursor-pointer text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                data-testid={`library-item-${lib.id}`}
              >
                <Library className="w-6 h-6 mr-2.5 text-white/90" />
                <span className="flex-1 text-sm" data-testid={`library-name-${lib.id}`}>
                  {lib.name}
                </span>
                {isActiveLibrary(lib.id) ? (
                  <span
                    className="w-2.5 h-2.5 bg-teal-500 rounded-full"
                    data-testid={`library-active-indicator-${lib.id}`}
                  />
                ) : (
                  <span className="w-2.5" />
                )}
              </li>
            ))}

            {/* Settings - TODO: Add /settings route */}
            <li
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center px-4 py-3 cursor-pointer text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="w-6 h-6 mr-2.5 text-white/90" />
              <span className="text-sm">Settings</span>
            </li>

            {/* Logout */}
            <Link to="/logout" onClick={() => setIsMenuOpen(false)} data-testid="logout-link">
              <li className="flex items-center px-4 py-3 cursor-pointer text-neutral-300 hover:bg-white/10 hover:text-white transition-colors">
                <LogOut className="w-6 h-6 mr-2.5 text-white/90" />
                <span className="text-sm">Logout</span>
              </li>
            </Link>
          </ul>
        )}
      </div>
    </header>
  )
}

export default Header
