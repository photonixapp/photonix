import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth/auth-context'

export const Route = createFileRoute('/logout')({
  component: LogoutPage,
})

function LogoutPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    logout().then(() => {
      setTimeout(() => void navigate({ to: '/login', search: { next: '/' } }), 1500)
    })
  }, [logout, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white text-xl" data-testid="logout-message">Logging out...</p>
    </div>
  )
}
