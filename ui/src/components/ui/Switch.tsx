import { type InputHTMLAttributes, forwardRef } from 'react'

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
  'data-testid'?: string
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, id, className = '', ...props }, ref) => {
    const inputId = id || props.name

    return (
      <label
        htmlFor={inputId}
        data-testid={props['data-testid'] ? `${props['data-testid']}-label` : undefined}
        className={`flex cursor-pointer items-center justify-between gap-4 ${className}`}
      >
        <div className="flex-1">
          <span className="block text-sm font-medium text-neutral-200">
            {label}
          </span>
          {description && (
            <span className="block text-sm text-neutral-500">{description}</span>
          )}
        </div>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <div
            className="
              h-6 w-11 rounded-full bg-neutral-700
              transition-colors duration-200
              peer-checked:bg-blue-600
              peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-neutral-900
              peer-disabled:cursor-not-allowed peer-disabled:opacity-50
            "
          />
          <div
            className="
              absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white
              shadow transition-transform duration-200
              peer-checked:translate-x-5
            "
          />
        </div>
      </label>
    )
  }
)

Switch.displayName = 'Switch'
