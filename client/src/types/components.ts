export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}
