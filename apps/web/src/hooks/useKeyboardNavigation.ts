import { useEffect } from 'react'

// Alterna a classe "keyboard-navigation" no body para exibir focus rings apenas durante navegação por teclado.
export function useKeyboardNavigation() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        document.body.classList.add('keyboard-navigation')
      }
    }

    function handleMouseDown() {
      document.body.classList.remove('keyboard-navigation')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])
}
