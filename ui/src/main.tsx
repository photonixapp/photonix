import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { RouterProvider } from '@tanstack/react-router'

import { apolloClient } from './lib/apollo-client'
import { AuthProvider, useAuth } from './lib/auth/auth-context'
import { createAppRouter } from './router'

import './index.css'

function AppWithRouter() {
  const auth = useAuth()
  const router = createAppRouter(auth)
  return <RouterProvider router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <AppWithRouter />
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>
)
