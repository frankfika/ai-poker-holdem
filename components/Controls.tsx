
import React from 'react';
import { PlayerAction } from '../types';

interface ControlsProps {
  onAction: (action: PlayerAction, amount?: number) => void;
  canCheck: boolean;
  minRaise: number;
  maxBet: number;
  disabled: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ onAction, canCheck, minRaise, maxBet, disabled }) => {
  return (
    <div className={`fixed bottom-0 left-0 w-full bg-gradient-to-t from-black via-gray-900 to-transparent pt-8 pb-6 px-4 md:px-8 border-t-0 flex flex-col items-center justify-end gap-3 z-50 transition-transform duration-300 pb-safe ${disabled ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}`}>
      
      {/* Mobile-friendly button grid */}
      <div className="flex gap-2 w-full max-w-3xl justify-center items-end">
        
        {/* Fold - Smaller emphasis */}
        <button
          onClick={() => onAction(PlayerAction.FOLD)}
          className="flex-1 max-w-[100px] h-14 bg-red-900/90 hover:bg-red-800 text-red-100 font-bold text-sm md:text-base rounded-xl border-b-4 border-red-950 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider shadow-lg backdrop-blur-sm"
        >
          Fold
        </button>
        
        {/* Check / Call - Primary Action */}
        {canCheck ? (
          <button
            onClick={() => onAction(PlayerAction.CHECK)}
            className="flex-[2] h-16 bg-gray-700/90 hover:bg-gray-600 text-white font-bold text-lg md:text-xl rounded-xl border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider shadow-lg backdrop-blur-sm"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction(PlayerAction.CALL)}
            className="flex-[2] h-16 bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-lg md:text-xl rounded-xl border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider shadow-lg backdrop-blur-sm animate-pulse-slow"
          >
            Call
          </button>
        )}

        {/* Raise - Secondary */}
        <button
          onClick={() => onAction(PlayerAction.RAISE, minRaise)}
          className="flex-1 max-w-[120px] h-14 bg-yellow-600/90 hover:bg-yellow-500 text-yellow-950 font-bold text-sm md:text-base rounded-xl border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider shadow-lg backdrop-blur-sm flex flex-col items-center justify-center leading-tight"
        >
          <span>Raise</span>
          <span className="text-[10px] opacity-75">${minRaise}</span>
        </button>
      </div>

      <style>{`
        /* iOS Safe Area handling */
        .pb-safe {
            padding-bottom: env(safe-area-inset-bottom, 20px);
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.95; transform: scale(0.98); }
        }
        .animate-pulse-slow {
            animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};
