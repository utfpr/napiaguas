import * as React from 'react'
import { cn } from '@/lib/utils'

export interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
  name?: string
}

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  name: string
}>({ name: 'radio-group' })

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, children, value, onValueChange, name = 'radio-group', ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
        <div ref={ref} className={cn('grid gap-2', className)} {...props} role="radiogroup">
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'type'> {
  value: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    const isChecked = context.value === value

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked && context.onValueChange) {
        context.onValueChange(value)
      }
    }

    return (
      <input
        type="radio"
        ref={ref}
        name={context.name}
        value={value}
        checked={isChecked}
        onChange={handleChange}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-primary text-primary',
          'ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
