import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { RouterContext } from '../router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})
