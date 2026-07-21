import React, { useEffect, useCallback } from 'react';
import { Delete, Check } from 'lucide-react';

interface NumpadLoginProps {
  pin: string;
  setPin: (pin: string) => void;
  onSubmit: (pinToSubmit?: string) => void;
  error: boolean;
  isLoading: boolean;
  onBack: () => void;
  userName: string;
}

const PIN_LENGTH = 4;

export function NumpadLogin({ pin, setPin, onSubmit, error, isLoading, onBack, userName }: NumpadLoginProps) {
  
  const handleInput = useCallback((value: string) => {
    if (isLoading) return;
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + value;
      setPin(newPin);
      if (newPin.length === PIN_LENGTH) {
        setTimeout(() => onSubmit(newPin), 50);
      }
    }
  }, [pin, setPin, onSubmit, isLoading]);

  const handleDelete = useCallback(() => {
    if (isLoading) return;
    setPin(pin.slice(0, -1));
  }, [pin, setPin, isLoading]);

  // Manejador para teclado físico (soporte para PC + Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (e.key >= '0' && e.key <= '9') {
        handleInput(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && pin.length === PIN_LENGTH) {
        onSubmit(pin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, handleDelete, isLoading, pin, onSubmit]);

  return (
    <div className={`w-full max-w-sm mx-auto flex flex-col items-center transition-transform duration-300 ${error ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-8">
        ← Cambiar de usuario
      </button>

      <h2 className="text-xl font-medium mb-2">Hola, {userName}</h2>
      <p className="text-muted-foreground mb-8">Ingresa tu PIN de acceso</p>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-4 mb-8">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-colors duration-200 ${
              i < pin.length ? 'bg-primary' : 'bg-secondary border border-border'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-destructive mb-4 text-sm font-medium">PIN incorrecto. Intenta nuevamente.</p>}
      {isLoading && <p className="text-muted-foreground mb-4 text-sm font-medium animate-pulse">Validando PIN...</p>}

      {/* Touch Numpad */}
      <div className="grid grid-cols-3 gap-4 w-full mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => handleInput(num.toString())}
            disabled={isLoading}
            className="h-20 text-3xl font-medium rounded-2xl bg-secondary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
        
        {/* Botón Borrar */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading || pin.length === 0}
          className="h-20 flex justify-center items-center rounded-2xl bg-secondary text-muted-foreground hover:text-foreground active:scale-95 transition-all disabled:opacity-40"
        >
          <Delete size={28} />
        </button>

        {/* Cero */}
        <button
          type="button"
          onClick={() => handleInput('0')}
          disabled={isLoading}
          className="h-20 text-3xl font-medium rounded-2xl bg-secondary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all"
        >
          0
        </button>

        {/* Botón Confirmar/Enter */}
        <button
          type="button"
          onClick={() => onSubmit(pin)}
          disabled={isLoading || pin.length !== PIN_LENGTH}
          className="h-20 flex justify-center items-center rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-95 transition-all disabled:opacity-30 disabled:bg-secondary disabled:text-muted-foreground"
          title="Ingresar"
        >
          <Check size={32} />
        </button>
      </div>

      {/* Botón de Confirmación Expreso debajo */}
      <button
        type="button"
        onClick={() => onSubmit(pin)}
        disabled={isLoading || pin.length !== PIN_LENGTH}
        className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none text-base flex items-center justify-center gap-2"
      >
        <span>Ingresar</span>
        <Check size={18} />
      </button>
    </div>
  );
}
