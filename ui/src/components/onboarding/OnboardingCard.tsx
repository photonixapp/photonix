import type { ReactNode } from 'react'

interface OnboardingCardProps {
  title: string
  description?: string
  children: ReactNode
}

export function OnboardingCard({ title, description, children }: OnboardingCardProps) {
  return (
    <div className="w-full max-w-lg rounded-xl bg-neutral-800 p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {description && (
        <p className="mt-2 text-neutral-400">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  )
}
