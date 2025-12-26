import { GameState, Player, PlayerAction } from '../types';

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL = 'deepseek-ai/DeepSeek-V3';

interface AiDecision {
  action: PlayerAction;
  amount?: number;
  reasoning: string;
}

export const getAiDecision = async (
  gameState: GameState,
  aiPlayer: Player,
): Promise<AiDecision> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'YOUR_SILICONFLOW_API_KEY_HERE') {
    console.warn("API Key not found, using fallback AI");
    return getFallbackDecision(gameState, aiPlayer);
  }

  const activePlayers = gameState.players.filter(p => !p.hasFolded);
  const position = activePlayers.findIndex(p => p.id === aiPlayer.id);
  const totalActive = activePlayers.length;
  const maxCurrentBet = Math.max(...gameState.players.map(p => p.currentBet));
  const callCost = maxCurrentBet - aiPlayer.currentBet;

  const prompt = `
You are playing Texas Hold'em Poker at a table with 8 players.
You are ${aiPlayer.name}.

Current Game State:
- Phase: ${gameState.phase}
- Pot Size: ${gameState.pot}
- Community Cards: ${gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(', ') || 'None'}
- Your Hand: ${aiPlayer.hand.map(c => `${c.rank}${c.suit}`).join(', ')}
- Your Chips: ${aiPlayer.chips}
- Cost to Call: ${callCost}
- Players Active: ${totalActive} / ${gameState.players.length}
- Your Position: ${position + 1} of ${totalActive} active players

Opponent Summary (Active):
${activePlayers.filter(p => p.id !== aiPlayer.id).map(p =>
  `- ${p.name}: Stack ${p.chips}, Bet ${p.currentBet}, Last Action: ${p.lastAction || 'None'}`
).join('\n')}

Decide your move:
1. FOLD: If chances are low or bet is too high.
2. CHECK: If cost to call is 0.
3. CALL: To match the highest bet.
4. RAISE: To increase the stakes (specify amount).

Return ONLY a JSON object with this exact format, no other text:
{"action": "FOLD|CHECK|CALL|RAISE", "amount": number_or_null, "reasoning": "brief explanation"}
`;

  try {
    const response = await fetch(SILICONFLOW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a poker AI assistant. Always respond with valid JSON only, no markdown or extra text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const result = JSON.parse(jsonStr);

    // Safety Logic to prevent illegal moves
    let safeAction = result.action?.toUpperCase();
    let safeAmount = result.amount;

    // Map action string to enum
    if (safeAction === 'FOLD') safeAction = PlayerAction.FOLD;
    else if (safeAction === 'CHECK') safeAction = PlayerAction.CHECK;
    else if (safeAction === 'CALL') safeAction = PlayerAction.CALL;
    else if (safeAction === 'RAISE') safeAction = PlayerAction.RAISE;
    else safeAction = PlayerAction.CHECK;

    // 1. Can't check if there is a cost to call
    if (callCost > 0 && safeAction === PlayerAction.CHECK) {
      safeAction = PlayerAction.FOLD;
    }

    // 2. Can't fold if check is available
    if (callCost === 0 && safeAction === PlayerAction.FOLD) {
      safeAction = PlayerAction.CHECK;
    }

    // 3. If Raise, validate amount
    if (safeAction === PlayerAction.RAISE) {
      const minRaise = gameState.minBet;
      if (!safeAmount || safeAmount < minRaise) safeAmount = minRaise;
      if (safeAmount > aiPlayer.chips) safeAmount = aiPlayer.chips;
    }

    return {
      action: safeAction,
      amount: safeAmount,
      reasoning: result.reasoning || 'Strategic play'
    };

  } catch (error) {
    console.error("Silicon Flow AI Error:", error);
    return getFallbackDecision(gameState, aiPlayer);
  }
};

// Fallback logic when API is unavailable
function getFallbackDecision(gameState: GameState, aiPlayer: Player): AiDecision {
  const maxCurrentBet = Math.max(...gameState.players.map(p => p.currentBet));
  const callCost = maxCurrentBet - aiPlayer.currentBet;

  // Simple fallback logic
  if (callCost === 0) {
    // Can check for free
    if (Math.random() > 0.7) {
      return { action: PlayerAction.RAISE, amount: gameState.minBet, reasoning: "Taking initiative" };
    }
    return { action: PlayerAction.CHECK, reasoning: "Checking to see more cards" };
  }

  // There's a bet to call
  const potOdds = callCost / (gameState.pot + callCost);
  if (potOdds < 0.3 || Math.random() > 0.5) {
    return { action: PlayerAction.CALL, reasoning: "Good pot odds" };
  }

  return { action: PlayerAction.FOLD, reasoning: "Pot odds not favorable" };
}
