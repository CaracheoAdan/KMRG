import { UnoCard, UnoColor, UnoState, UnoValue, UserProfile } from '../../../types';

export const UNO_COLORS: Array<'red' | 'yellow' | 'green' | 'blue'> = [
  'red',
  'yellow',
  'green',
  'blue',
];

export const COLOR_NAMES_ES: Record<'red' | 'yellow' | 'green' | 'blue' | 'wild', string> = {
  red: 'rojo',
  yellow: 'amarillo',
  green: 'verde',
  blue: 'azul',
  wild: 'comodín',
};

export function shuffleDeck<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createFullUnoDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  let idCounter = 1;

  for (const color of UNO_COLORS) {
    // Carta '0' (1 por color)
    cards.push({ id: `${color}-0-${idCounter++}`, color, value: '0' });

    // Cartas '1' a '9' (2 por cada número)
    for (let num = 1; num <= 9; num++) {
      const val = String(num) as UnoValue;
      cards.push({ id: `${color}-${val}-a-${idCounter++}`, color, value: val });
      cards.push({ id: `${color}-${val}-b-${idCounter++}`, color, value: val });
    }

    // Acciones especiales (2 de cada una por color)
    const actions: UnoValue[] = ['skip', 'reverse', 'draw2'];
    for (const act of actions) {
      cards.push({ id: `${color}-${act}-a-${idCounter++}`, color, value: act });
      cards.push({ id: `${color}-${act}-b-${idCounter++}`, color, value: act });
    }
  }

  // 4 Comodines normales
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `wild-${i}-${idCounter++}`, color: 'wild', value: 'wild' });
  }

  // 4 Comodines Roba 4 (+4)
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `wild_draw4-${i}-${idCounter++}`, color: 'wild', value: 'wild_draw4' });
  }

  return cards;
}

/**
 * Reglas de validez para jugar una carta de UNO:
 * - wild: siempre legal.
 * - wild_draw4: legal si no tienes cartas del color activo en mano (regla oficial).
 * - coincide en color o en valor/símbolo.
 */
export function canPlayUnoCard(
  card: UnoCard,
  topCard: UnoCard,
  activeColor: 'red' | 'yellow' | 'green' | 'blue',
  hand?: UnoCard[]
): boolean {
  if (card.value === 'wild_draw4') {
    // Si se pasa la mano del jugador, verificar que no tenga el color activo
    if (hand && hand.some((c) => c.color === activeColor)) {
      return false;
    }
    return true;
  }
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function getPlayableUnoCards(
  hand: UnoCard[],
  topCard: UnoCard,
  activeColor: 'red' | 'yellow' | 'green' | 'blue'
): UnoCard[] {
  return hand.filter((c) => canPlayUnoCard(c, topCard, activeColor, hand));
}

export const UNO_TARGET_SCORE = 500;

export function calculateUnoHandPoints(hand: UnoCard[]): number {
  return hand.reduce((sum, card) => {
    if (card.value === 'wild' || card.value === 'wild_draw4') return sum + 50;
    if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') return sum + 20;
    const num = Number(card.value);
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);
}

/**
 * Roba `count` cartas del mazo. Si el mazo se vacía, baraja la pila de descarte
 * (excepto la última carta en mesa) y vacía el descarte reciclado para evitar duplicados.
 */
export function drawCardsWithRecycle(
  deck: UnoCard[],
  discardPile: UnoCard[],
  currentCard: UnoCard,
  count: number
): { drawn: UnoCard[]; nextDeck: UnoCard[]; nextDiscardPile: UnoCard[] } {
  let nextDeck = [...deck];
  let nextDiscardPile = [...discardPile];
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    if (nextDeck.length === 0) {
      const topCard =
        nextDiscardPile.length > 0 ? nextDiscardPile[nextDiscardPile.length - 1] : currentCard;
      const recycle = nextDiscardPile.slice(0, -1);
      if (recycle.length > 0) {
        nextDeck = shuffleDeck(recycle);
        nextDiscardPile = [topCard];
      }
    }
    if (nextDeck.length > 0) {
      drawn.push(nextDeck.pop()!);
    }
  }

  return { drawn, nextDeck, nextDiscardPile };
}

export function startNewUnoGame(
  starter: UserProfile = 'Karla',
  _names?: { Karla: string; Javier: string }
): UnoState {
  const deck = shuffleDeck(createFullUnoDeck());

  const handKarla = deck.splice(0, 7);
  const handJavier = deck.splice(0, 7);

  // Primera carta: DEBE ser una carta numérica regular (0 a 9) de color real (nunca comodín ni +4 ni acción)
  let startCardIdx = deck.findIndex(
    (c) => c.color !== 'wild' && !['skip', 'reverse', 'draw2', 'wild', 'wild_draw4'].includes(c.value)
  );
  if (startCardIdx === -1) startCardIdx = 0;
  const [startCard] = deck.splice(startCardIdx, 1);

  const startColor = startCard.color as 'red' | 'yellow' | 'green' | 'blue';
  const startColorEs = COLOR_NAMES_ES[startColor] || startColor;

  return {
    phase: 'playing',
    deck,
    discardPile: [startCard],
    currentCard: startCard,
    currentColor: startColor,
    handKarla,
    handJavier,
    turn: starter,
    hasDrawnThisTurn: false,
    calledUnoKarla: false,
    calledUnoJavier: false,
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
    scoreKarla: 0,
    scoreJavier: 0,
    lastAction: `Inicia con ${startCard.value} ${startColorEs}`,
    updatedAt: Date.now(),
    version: 1,
  };
}

export interface PlayCardEffectResult {
  nextHandKarla: UnoCard[];
  nextHandJavier: UnoCard[];
  nextDeck: UnoCard[];
  nextDiscardPile: UnoCard[];
  nextTurn: UserProfile;
  nextCurrentColor: 'red' | 'yellow' | 'green' | 'blue';
  nextCalledUnoKarla: boolean;
  nextCalledUnoJavier: boolean;
  actionMessage: string;
}

export function processCardEffect(
  state: UnoState,
  playedCard: UnoCard,
  chosenWildColor?: 'red' | 'yellow' | 'green' | 'blue',
  names?: { Karla?: string; Javier?: string }
): PlayCardEffectResult {
  const player = state.turn;
  const partner: UserProfile = player === 'Karla' ? 'Javier' : 'Karla';
  const displayKarla = names?.Karla?.trim() || 'Karlita';
  const displayJavier = names?.Javier?.trim() || 'Javier';
  const playerName = player === 'Karla' ? displayKarla : displayJavier;
  const partnerName = partner === 'Karla' ? displayKarla : displayJavier;

  let nextHandKarla = [...state.handKarla];
  let nextHandJavier = [...state.handJavier];
  let nextDeck = [...state.deck];
  let nextDiscardPile = [...state.discardPile];

  // Remover carta jugada de la mano del jugador
  if (player === 'Karla') {
    nextHandKarla = nextHandKarla.filter((c) => c.id !== playedCard.id);
  } else {
    nextHandJavier = nextHandJavier.filter((c) => c.id !== playedCard.id);
  }

  let nextTurn: UserProfile = partner;
  let nextCurrentColor: 'red' | 'yellow' | 'green' | 'blue' =
    playedCard.color === 'wild'
      ? (chosenWildColor || 'red')
      : (playedCard.color as 'red' | 'yellow' | 'green' | 'blue');
  const colorEs = COLOR_NAMES_ES[nextCurrentColor] || nextCurrentColor;
  let actionMessage = `${playerName} jugó ${playedCard.value} ${colorEs}`;

  const drawCardsForPartner = (count: number) => {
    const res = drawCardsWithRecycle(nextDeck, nextDiscardPile, state.currentCard, count);
    nextDeck = res.nextDeck;
    nextDiscardPile = res.nextDiscardPile;

    if (partner === 'Karla') {
      nextHandKarla.push(...res.drawn);
    } else {
      nextHandJavier.push(...res.drawn);
    }
  };

  // Reglas de efectos en duelo de 2 jugadores:
  switch (playedCard.value) {
    case 'skip':
    case 'reverse':
      // En 2 jugadores, Salto y Reversa hacen que el oponente pierda su turno, el jugador vuelve a tirar
      nextTurn = player;
      actionMessage = `${playerName} jugó ${playedCard.value === 'skip' ? 'Salto' : 'Reversa'} ${colorEs} y repite turno`;
      break;

    case 'draw2':
      // Pareja roba 2 y pierde su turno -> Jugador repite turno
      drawCardsForPartner(2);
      nextTurn = player;
      actionMessage = `${playerName} jugó +2 ${colorEs}; ${partnerName} robó 2 cartas`;
      break;

    case 'wild_draw4':
      // Pareja roba 4 y pierde su turno -> Jugador repite turno
      drawCardsForPartner(4);
      nextTurn = player;
      actionMessage = `${playerName} jugó Comodín +4; ${partnerName} robó 4 cartas (${colorEs})`;
      break;

    case 'wild':
      // Comodín normal: cambia de color y el turno pasa al rival
      nextTurn = partner;
      actionMessage = `${playerName} jugó Comodín y eligió ${colorEs}`;
      break;

    default:
      // Carta numérica 0-9: pasa turno al rival
      nextTurn = partner;
      break;
  }

  // Añadir la carta jugada al tope del descarte
  nextDiscardPile = [...nextDiscardPile, playedCard];

  // Si un jugador tiene más de 1 carta en mano, reiniciar su bandera calledUno
  const nextCalledUnoKarla = nextHandKarla.length <= 1 ? Boolean(state.calledUnoKarla) : false;
  const nextCalledUnoJavier = nextHandJavier.length <= 1 ? Boolean(state.calledUnoJavier) : false;

  return {
    nextHandKarla,
    nextHandJavier,
    nextDeck,
    nextDiscardPile,
    nextTurn,
    nextCurrentColor,
    nextCalledUnoKarla,
    nextCalledUnoJavier,
    actionMessage,
  };
}

/**
 * Penalización cuando un jugador tiene 1 sola carta y NO cantó ¡UNO! antes de que el rival lo reclame.
 * El infractor es forzado a robar 2 cartas de penalización y se limpia el descarte si hubo reciclaje.
 */
export function penalizeMissedUno(
  state: UnoState,
  targetProfile: UserProfile,
  names?: { Karla?: string; Javier?: string }
): {
  nextHandKarla: UnoCard[];
  nextHandJavier: UnoCard[];
  nextDeck: UnoCard[];
  nextDiscardPile: UnoCard[];
  nextCalledUnoKarla: boolean;
  nextCalledUnoJavier: boolean;
  actionMessage: string;
} {
  let nextHandKarla = [...state.handKarla];
  let nextHandJavier = [...state.handJavier];

  const res = drawCardsWithRecycle(state.deck, state.discardPile, state.currentCard, 2);

  if (targetProfile === 'Karla') {
    nextHandKarla.push(...res.drawn);
  } else {
    nextHandJavier.push(...res.drawn);
  }

  const displayKarla = names?.Karla?.trim() || 'Karlita';
  const displayJavier = names?.Javier?.trim() || 'Javier';
  const targetName = targetProfile === 'Karla' ? displayKarla : displayJavier;

  return {
    nextHandKarla,
    nextHandJavier,
    nextDeck: res.nextDeck,
    nextDiscardPile: res.nextDiscardPile,
    nextCalledUnoKarla: targetProfile === 'Karla' ? false : Boolean(state.calledUnoKarla),
    nextCalledUnoJavier: targetProfile === 'Javier' ? false : Boolean(state.calledUnoJavier),
    actionMessage: `¡Falta de UNO! ${targetName} robó 2 cartas`,
  };
}
