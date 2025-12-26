
import React from 'react';
import { Player as PlayerType } from '../types';
import { Card } from './Card';

interface PlayerProps {
  player: PlayerType;
  isActive: boolean;
  isWinner?: boolean;
}

export const Player: React.FC<PlayerProps> = ({ player, isActive, isWinner }) => {
  return (
    // Mobile: scale-60, Tablet: scale-75, Desktop: scale-90
    // Transition opacity for folding
    <div className={`relative flex flex-col items-center transition-all duration-300 
      ${player.hasFolded ? 'opacity-40 grayscale' : 'opacity-100'} 
      origin-center scale-[0.60] sm:scale-75 md:scale-90`}
    >
      
      {/* AI Thought Bubble - Adjusted positioning for mobile */}
      {player.isAi && player.actionReasoning && !player.hasFolded && isActive && (
        <div className="absolute -top-16 z-50 w-40 md:w-48 bg-white text-gray-800 p-2 rounded-lg shadow-xl text-[9px] md:text-[10px] leading-tight animate-fade-in border-l-4 border-poker-gold pointer-events-none">
          <p className="font-bold text-poker-green mb-1">Thinking...</p>
          "{player.actionReasoning.slice(0, 60)}..."
        </div>
      )}

      {/* Cards */}
      <div className="flex -space-x-6 md:-space-x-8 mb-1 relative z-10 h-14 md:h-16 items-end">
        {player.hand.map((card, idx) => (
          <div key={idx} className={`transform origin-bottom ${idx === 0 ? '-rotate-12' : 'rotate-12 translate-y-1'}`}>
            <Card 
                card={card} 
                hidden={player.isAi && !isWinner} 
                className="w-10 h-14 md:w-12 md:h-16 text-[10px]" // Responsive card size
            />
          </div>
        ))}
      </div>

      {/* Avatar & Info Container */}
      <div className={`relative flex items-center gap-1.5 md:gap-2 bg-gray-900/95 backdrop-blur-sm px-2 md:px-3 py-1.5 md:py-2 rounded-full border shadow-lg w-28 md:w-40
        ${isActive ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-yellow-400/20' : 'border-gray-600'}
        ${isWinner ? 'border-green-400 ring-4 ring-green-400/50 scale-110 z-20' : ''}
      `}>
        {/* Avatar Image */}
        <div className="relative shrink-0">
            <img 
            src={player.avatarUrl} 
            alt={player.name} 
            className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/50 object-cover"
            />
            {player.isDealer && (
                <div className="absolute -bottom-1 -right-1 bg-white text-black font-bold text-[8px] w-3 h-3 md:w-4 md:h-4 flex items-center justify-center rounded-full border border-gray-400 shadow-sm z-10">
                    D
                </div>
            )}
        </div>
        
        {/* Name & Chips */}
        <div className="flex flex-col overflow-hidden w-full">
          <span className="font-bold text-white text-[10px] md:text-xs truncate">{player.name}</span>
          <span className="text-yellow-400 font-mono text-[9px] md:text-[10px] flex items-center truncate">
            <i className="fas fa-coins mr-1 text-[7px]"></i> {player.chips}
          </span>
        </div>

        {/* Action Badge (Call/Raise/Check) */}
        {player.lastAction && (
             <div className="absolute -right-1 -top-2 md:-right-2 md:-top-2 bg-blue-600 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-sm border border-blue-400 animate-bounce z-20">
                {player.lastAction}
             </div>
        )}
      </div>

      {/* Current Bet Bubble */}
      {player.currentBet > 0 && (
          <div className="absolute top-full mt-1 flex items-center justify-center bg-black/70 px-2 py-0.5 rounded-full text-white font-mono text-xs border border-yellow-500/30 z-20">
             <span className="text-yellow-500 text-[9px] mr-0.5">$</span><span className="text-[10px] md:text-xs">{player.currentBet}</span>
          </div>
      )}
    </div>
  );
};
