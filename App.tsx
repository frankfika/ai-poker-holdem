
import React, { useState, useEffect, useCallback } from 'react';
import { Card as CardType, GamePhase, GameState, Player, PlayerAction, HandEvaluation } from './types';
import { createDeck, evaluateHand } from './services/pokerLogic';
import { getAiDecision } from './services/aiService';
import { Card } from './components/Card';
import { Player as PlayerComponent } from './components/Player';
import { Controls } from './components/Controls';

const INITIAL_CHIPS = 2000;
const SMALL_BLIND = 25;
const BIG_BLIND = 50;
const MAX_PLAYERS = 8;

const AI_BOTS = [
  { name: 'DeepSeek', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeepSeek' },
  { name: 'AlphaGo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AlphaGo' },
  { name: 'DeepBlue', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeepBlue' },
  { name: 'Watson', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Watson' },
  { name: 'Siri', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Siri' },
  { name: 'Alexa', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alexa' },
  { name: 'Cortana', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cortana' }
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    communityCards: [],
    pot: 0,
    phase: GamePhase.GAME_OVER,
    currentPlayerId: '',
    dealerId: 'p0', 
    players: [],
    minBet: BIG_BLIND,
    message: "Welcome to AI Poker",
    winnerIds: []
  });

  const [aiThinking, setAiThinking] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [dealerIndex, setDealerIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.log("Fullscreen not supported or allowed", e);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // --- Layout Positioning ---
  // We use percentage-based positioning for better responsiveness across aspect ratios.
  // 8 Players:
  // 0: Human (Bottom Center)
  // 1: Bottom Left
  // 2: Left
  // 3: Top Left
  // 4: Top Center
  // 5: Top Right
  // 6: Right
  // 7: Bottom Right

  // Note: We use style objects instead of pure tailwind classes for the specific % offsets to fine-tune the oval.
  const getPlayerStyle = (index: number) => {
    // Mobile Layout (Portrait-ish optimized, though landscape is better)
    // We push players to the very edges.
    
    // Config: [top%, left%, translate]
    // Translate is handled by classes for center alignment, here we set the anchor point.
    
    const positions = [
        { bottom: '0%', left: '50%', transform: 'translate(-50%, 10%)' },    // 0: Human (Bottom)
        { bottom: '15%', left: '2%', transform: 'translate(0%, 0%)' },       // 1: Bottom Left
        { top: '50%', left: '0%', transform: 'translate(-20%, -50%)' },      // 2: Left
        { top: '12%', left: '2%', transform: 'translate(0%, 0%)' },          // 3: Top Left
        { top: '0%', left: '50%', transform: 'translate(-50%, -15%)' },      // 4: Top (Opponent)
        { top: '12%', right: '2%', transform: 'translate(0%, 0%)' },         // 5: Top Right
        { top: '50%', right: '0%', transform: 'translate(20%, -50%)' },      // 6: Right
        { bottom: '15%', right: '2%', transform: 'translate(0%, 0%)' },      // 7: Bottom Right
    ];

    return positions[index];
  };

  const startNewGame = useCallback(() => {
    const deck = createDeck();
    let players: Player[] = [];
    
    if (gameState.players.length === MAX_PLAYERS) {
        players = gameState.players.map(p => ({
            ...p,
            hand: [deck.pop()!, deck.pop()!],
            currentBet: 0,
            hasFolded: p.chips <= 0,
            isAllIn: false,
            lastAction: undefined,
            isDealer: false,
            actionReasoning: undefined
        }));
    } else {
        players.push({
            id: 'p0',
            name: 'You',
            isAi: false,
            hand: [deck.pop()!, deck.pop()!],
            chips: INITIAL_CHIPS,
            currentBet: 0,
            hasFolded: false,
            isAllIn: false,
            isDealer: false,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Player'
        });

        AI_BOTS.forEach((bot, i) => {
            players.push({
                id: `p${i+1}`,
                name: bot.name,
                isAi: true,
                hand: [deck.pop()!, deck.pop()!],
                chips: INITIAL_CHIPS,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isDealer: false,
                avatarUrl: bot.avatar
            });
        });
    }

    const currentDealerIdx = (dealerIndex + 1) % players.length;
    setDealerIndex(currentDealerIdx);
    players.forEach(p => p.isDealer = false);
    players[currentDealerIdx].isDealer = true;

    const sbIdx = (currentDealerIdx + 1) % players.length;
    const bbIdx = (currentDealerIdx + 2) % players.length;
    
    const sbPlayer = players[sbIdx];
    const sbAmount = Math.min(sbPlayer.chips, SMALL_BLIND);
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;

    const bbPlayer = players[bbIdx];
    const bbAmount = Math.min(bbPlayer.chips, BIG_BLIND);
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;

    const pot = sbAmount + bbAmount;
    const firstActorIdx = (bbIdx + 1) % players.length;

    setGameState({
      deck,
      communityCards: [],
      pot,
      phase: GamePhase.PRE_FLOP,
      currentPlayerId: players[firstActorIdx].id,
      dealerId: players[currentDealerIdx].id,
      players,
      minBet: BIG_BLIND,
      message: "Pre-Flop: UTG to act.",
      winnerIds: []
    });
    setShowWinnerModal(false);
  }, [dealerIndex, gameState.players]);

  const getNextActivePlayerIndex = (players: Player[], currentIdx: number): number => {
    let nextIdx = (currentIdx + 1) % players.length;
    for (let i = 0; i < players.length; i++) {
        const p = players[nextIdx];
        if (!p.hasFolded && !p.isAllIn) {
            return nextIdx;
        }
        nextIdx = (nextIdx + 1) % players.length;
    }
    return -1;
  };

  const isBettingRoundComplete = (players: Player[]) => {
    const active = players.filter(p => !p.hasFolded);
    const maxBet = Math.max(...active.map(p => p.currentBet));
    return active.every(p => {
        if (p.isAllIn) return true;
        return p.currentBet === maxBet && p.lastAction !== undefined;
    });
  };

  const handlePhaseChange = (currentState: GameState) => {
    const { phase, deck, communityCards, players, dealerId } = currentState;
    let nextPhase = phase;
    let newCommunityCards = [...communityCards];
    let newDeck = [...deck];
    
    if (phase === GamePhase.PRE_FLOP) {
      nextPhase = GamePhase.FLOP;
      newDeck.pop();
      newCommunityCards.push(newDeck.pop()!, newDeck.pop()!, newDeck.pop()!);
    } else if (phase === GamePhase.FLOP) {
      nextPhase = GamePhase.TURN;
      newDeck.pop();
      newCommunityCards.push(newDeck.pop()!);
    } else if (phase === GamePhase.TURN) {
      nextPhase = GamePhase.RIVER;
      newDeck.pop();
      newCommunityCards.push(newDeck.pop()!);
    } else if (phase === GamePhase.RIVER) {
      nextPhase = GamePhase.SHOWDOWN;
    }

    const updatedPlayers = players.map(p => ({ ...p, currentBet: 0, lastAction: undefined }));
    const dealerIdx = players.findIndex(p => p.id === dealerId);
    const firstActorIdx = getNextActivePlayerIndex(updatedPlayers, dealerIdx);

    if (nextPhase === GamePhase.SHOWDOWN) {
      determineWinner(updatedPlayers, newCommunityCards, currentState.pot);
    } else {
      setGameState({
        ...currentState,
        deck: newDeck,
        communityCards: newCommunityCards,
        phase: nextPhase,
        players: updatedPlayers,
        currentPlayerId: players[firstActorIdx].id,
        message: `${nextPhase} dealt.`
      });
    }
  };

  const determineWinner = (players: Player[], communityCards: CardType[], pot: number) => {
    const activePlayers = players.filter(p => !p.hasFolded);
    
    if (activePlayers.length === 1) {
      endRound([activePlayers[0].id], pot, `${activePlayers[0].name} wins`);
      return;
    }

    const evaluations = activePlayers.map(p => ({
        id: p.id,
        name: p.name,
        eval: evaluateHand(p.hand, communityCards)
    }));

    const maxScore = Math.max(...evaluations.map(e => e.eval.score));
    const winners = evaluations.filter(e => e.eval.score === maxScore);
    
    const winnerIds = winners.map(w => w.id);
    const winHandName = winners[0].eval.name;
    const message = winners.length > 1 
        ? `Split Pot! ${winners.length} players have ${winHandName}.`
        : `${winners[0].name} wins with ${winHandName}!`;

    endRound(winnerIds, pot, message);
  };

  const endRound = (winnerIds: string[], pot: number, message: string) => {
    setGameState(prev => {
        const splitAmount = Math.floor(pot / winnerIds.length);
        const updatedPlayers = prev.players.map(p => {
            if (winnerIds.includes(p.id)) {
                return { ...p, chips: p.chips + splitAmount };
            }
            return p;
        });
        
        return {
            ...prev,
            players: updatedPlayers,
            pot: 0,
            phase: GamePhase.GAME_OVER,
            currentPlayerId: '',
            message,
            winnerIds
        };
    });
    setShowWinnerModal(true);
  };

  const handleAction = async (action: PlayerAction, amount: number = 0) => {
    const playerIdx = gameState.players.findIndex(p => p.id === gameState.currentPlayerId);
    if (playerIdx === -1) return;
    const currentPlayer = gameState.players[playerIdx];

    let newPot = gameState.pot;
    const currentMaxBet = Math.max(...gameState.players.map(p => p.currentBet));
    
    let updatedPlayer = { ...currentPlayer, lastAction: action };
    
    if (action === PlayerAction.FOLD) {
        updatedPlayer.hasFolded = true;
    } else if (action === PlayerAction.CALL) {
        const toCall = currentMaxBet - currentPlayer.currentBet;
        const actualCall = Math.min(toCall, currentPlayer.chips);
        updatedPlayer.chips -= actualCall;
        updatedPlayer.currentBet += actualCall;
        newPot += actualCall;
        if (updatedPlayer.chips === 0) updatedPlayer.isAllIn = true;
    } else if (action === PlayerAction.RAISE) {
        const raiseAmount = amount;
        const totalBetTarget = currentMaxBet + raiseAmount; 
        const amountToAdd = totalBetTarget - currentPlayer.currentBet;
        const actualAdd = Math.min(amountToAdd, currentPlayer.chips);
        updatedPlayer.chips -= actualAdd;
        updatedPlayer.currentBet += actualAdd;
        newPot += actualAdd;
        if (updatedPlayer.chips === 0) updatedPlayer.isAllIn = true;
    }

    const newPlayers = [...gameState.players];
    newPlayers[playerIdx] = updatedPlayer;

    const activePlayers = newPlayers.filter(p => !p.hasFolded);
    if (activePlayers.length === 1) {
        determineWinner(newPlayers, gameState.communityCards, newPot);
        return;
    }

    const roundComplete = isBettingRoundComplete(newPlayers);
    
    if (roundComplete) {
        handlePhaseChange({ ...gameState, players: newPlayers, pot: newPot });
    } else {
        const nextIdx = getNextActivePlayerIndex(newPlayers, playerIdx);
        setGameState({
            ...gameState,
            players: newPlayers,
            pot: newPot,
            currentPlayerId: newPlayers[nextIdx].id,
            message: `${newPlayers[nextIdx].isAi ? newPlayers[nextIdx].name : "Your"} turn.`
        });
    }
  };

  useEffect(() => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    
    if (gameState.phase !== GamePhase.GAME_OVER && 
        gameState.phase !== GamePhase.SHOWDOWN && 
        currentPlayer && 
        currentPlayer.isAi && 
        !aiThinking) {
      
      const performAiTurn = async () => {
        setAiThinking(true);
        await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
        const decision = await getAiDecision(gameState, currentPlayer);
        
        setGameState(prev => ({
            ...prev,
            players: prev.players.map(p => p.id === currentPlayer.id ? {...p, actionReasoning: decision.reasoning} : p)
        }));

        await new Promise(r => setTimeout(r, 1000));
        handleAction(decision.action, decision.amount);
        setAiThinking(false);
      };

      performAiTurn();
    }
  }, [gameState.currentPlayerId, gameState.phase, aiThinking]);

  const humanPlayer = gameState.players.find(p => p.id === 'p0');
  const maxCurrentBet = Math.max(...gameState.players.map(p => p.currentBet || 0));
  const humanBet = humanPlayer?.currentBet || 0;
  const toCall = maxCurrentBet - humanBet;
  const canCheck = toCall === 0;
  const isPlayerTurn = gameState.currentPlayerId === 'p0' && gameState.phase !== GamePhase.GAME_OVER;

  return (
    <div className="h-screen w-screen bg-poker-green felt-texture flex flex-col items-center relative overflow-hidden font-sans select-none touch-none">
        
        {/* Header - Transparent & Minimal */}
        <div className="absolute top-0 left-0 w-full p-2 md:p-4 flex justify-between items-start z-10 pointer-events-none">
            <h1 className="text-poker-gold font-bold text-base md:text-xl tracking-widest uppercase drop-shadow-md pointer-events-auto opacity-80">
                AI Poker
            </h1>
            
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
                 <button 
                    onClick={toggleFullscreen}
                    className="text-white/50 hover:text-white p-2 transition-colors"
                >
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                </button>
                {gameState.players.length > 0 && (
                    <div className="bg-black/60 backdrop-blur-sm px-3 py-1 md:px-4 md:py-2 rounded-lg text-white font-mono border border-gray-600 shadow-lg text-sm md:text-base">
                        POT: <span className="text-yellow-400 font-bold ml-1">${gameState.pot}</span>
                    </div>
                )}
            </div>
        </div>

        {/* Welcome Screen */}
        {gameState.players.length === 0 && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white p-4 text-center">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                 <div className="relative z-10 flex flex-col items-center animate-fade-in w-full max-w-lg">
                    <h1 className="text-5xl md:text-7xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-sm">TEXAS</h1>
                    <h2 className="text-3xl md:text-5xl font-light mb-8 text-gray-200 tracking-wider">POKER</h2>
                    <p className="mb-10 text-lg text-gray-400">8-Player High Stakes AI</p>
                    <button 
                        onClick={startNewGame}
                        className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xl font-bold py-5 px-8 rounded-2xl shadow-2xl transition-all transform active:scale-95 border-t border-red-400"
                    >
                        START GAME
                    </button>
                    <p className="mt-6 text-xs text-gray-600">Best experienced in fullscreen.</p>
                 </div>
            </div>
        )}

        {/* Poker Table Container */}
        {/* We use a container that maximizes space but maintains a poker table aspect mostly */}
        <div className="relative w-[95vw] h-[60vh] md:h-[75vh] mt-[15vh] md:mt-[10vh] bg-poker-greenLight rounded-[100px] md:rounded-[250px] border-[8px] md:border-[16px] border-black/40 shadow-[inset_0_0_50px_rgba(0,0,0,0.6)] flex items-center justify-center">
            
            {/* Center Felt Decoration */}
            <div className="absolute text-white/5 font-bold text-4xl md:text-8xl tracking-widest select-none pointer-events-none transform -rotate-12 md:rotate-0">
                POKER
            </div>

            {/* Community Cards - Centered */}
            <div className="relative z-20 flex space-x-1 md:space-x-3 mb-8 md:mb-12 transform scale-90 md:scale-100">
                 {gameState.communityCards.map((card) => (
                     <Card key={card.id} card={card} className="animate-fade-in-up shadow-2xl" />
                 ))}
                 {[...Array(5 - gameState.communityCards.length)].map((_, i) => (
                     <div key={`ph-${i}`} className="w-10 h-14 md:w-20 md:h-28 border-2 border-white/5 rounded-lg bg-black/10" />
                 ))}
            </div>

            {/* Message Area */}
            {gameState.message && (
                <div className="absolute top-[62%] md:top-[60%] bg-black/50 px-4 py-1 rounded-full text-white/90 text-xs md:text-sm backdrop-blur-sm animate-fade-in border border-white/10 z-20 text-center max-w-[80%]">
                    {gameState.message}
                </div>
            )}

            {/* Players */}
            {gameState.players.map((player, index) => (
                <div 
                    key={player.id} 
                    className="absolute transition-all duration-500"
                    style={getPlayerStyle(index)}
                >
                    <PlayerComponent 
                        player={player} 
                        isActive={gameState.currentPlayerId === player.id}
                        isWinner={gameState.winnerIds.includes(player.id)}
                    />
                </div>
            ))}
        </div>

        {/* Winner Modal */}
        {showWinnerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-gray-800 border-2 border-yellow-500 p-6 md:p-8 rounded-2xl text-center shadow-2xl max-w-sm w-full">
                    <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">Round Over</h2>
                    <p className="text-white text-base md:text-lg mb-6 leading-relaxed">{gameState.message}</p>
                    <p className="text-gray-400 mb-6 text-sm">Pot: ${gameState.pot}</p>
                    <button 
                        onClick={startNewGame}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg uppercase tracking-wider transition-colors shadow-lg"
                    >
                        Deal Next Hand
                    </button>
                </div>
            </div>
        )}

        {/* Controls */}
        <Controls 
            onAction={handleAction} 
            canCheck={canCheck}
            minRaise={Math.max(gameState.minBet, toCall * 2)}
            maxBet={humanPlayer?.chips || 0}
            disabled={!isPlayerTurn}
        />
    </div>
  );
};

export default App;
