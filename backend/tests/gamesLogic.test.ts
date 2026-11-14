import { describe, it, expect } from 'vitest';
import {
  startNewUnoGame,
  canPlayUnoCard,
  processCardEffect,
  penalizeMissedUno,
  drawCardsWithRecycle,
  calculateUnoHandPoints,
} from '../../mobile-app/src/components/games/uno/unoLogic';
import {
  startNewDominoGame,
  determineStartingPlayer,
  canPlayTile,
  placeTileOnBoard,
  calculateHandPips,
} from '../../mobile-app/src/components/games/domino/dominoLogic';

describe('KMRG Games Logic - UNO & Dominó', () => {
  describe('UNO Logic (2 Jugadores)', () => {
    it('reparte 7 cartas a cada jugador y la carta inicial nunca es wild_draw4', () => {
      for (let i = 0; i < 15; i++) {
        const state = startNewUnoGame('Karla', { Karla: 'Karlita', Javier: 'Javier' });
        expect(state.handKarla).toHaveLength(7);
        expect(state.handJavier).toHaveLength(7);
        expect(state.currentCard.value).not.toBe('wild_draw4');
        expect(state.version).toBe(1);
      }
    });

    it('en 2 jugadores: reverse, skip, draw2 y wild_draw4 retienen el turno del lanzador', () => {
      const initial = startNewUnoGame('Karla');
      const redSkip = { id: 'red-skip-test', color: 'red' as const, value: 'skip' as const };
      const redReverse = { id: 'red-rev-test', color: 'red' as const, value: 'reverse' as const };
      const redDraw2 = { id: 'red-d2-test', color: 'red' as const, value: 'draw2' as const };

      const stateWithCard = {
        ...initial,
        turn: 'Karla' as const,
        currentColor: 'red' as const,
        handKarla: [redSkip, redReverse, redDraw2],
      };

      const resSkip = processCardEffect(stateWithCard, redSkip);
      expect(resSkip.nextTurn).toBe('Karla');

      const resRev = processCardEffect(stateWithCard, redReverse);
      expect(resRev.nextTurn).toBe('Karla');

      const resDraw2 = processCardEffect(stateWithCard, redDraw2);
      expect(resDraw2.nextTurn).toBe('Karla');
      expect(resDraw2.nextHandJavier).toHaveLength(initial.handJavier.length + 2);
    });

    it('recicla el descarte cuando el mazo se vacía y limpia el discardPile para no duplicar cartas', () => {
      const topCard = { id: 'blue-9', color: 'blue' as const, value: '9' as const };
      const discard = [
        { id: 'red-1', color: 'red' as const, value: '1' as const },
        { id: 'green-2', color: 'green' as const, value: '2' as const },
        { id: 'yellow-3', color: 'yellow' as const, value: '3' as const },
        topCard,
      ];
      const res = drawCardsWithRecycle([], discard, topCard, 2);
      expect(res.drawn).toHaveLength(2);
      expect(res.nextDeck).toHaveLength(1);
      expect(res.nextDiscardPile).toEqual([topCard]);
    });

    it('restringe wild_draw4 si el jugador tiene cartas del color activo', () => {
      const currentCard = { id: 'red-5', color: 'red' as const, value: '5' as const };
      const wild4 = { id: 'wild-4', color: 'wild' as const, value: 'wild_draw4' as const };
      const red2 = { id: 'red-2', color: 'red' as const, value: '2' as const };
      const blue7 = { id: 'blue-7', color: 'blue' as const, value: '7' as const };

      expect(canPlayUnoCard(wild4, currentCard, 'red', [wild4, red2])).toBe(false);
      expect(canPlayUnoCard(wild4, currentCard, 'red', [wild4, blue7])).toBe(true);
    });

    it('resetea calledUno al recibir cartas de penalización y calcula puntos de mano', () => {
      const base = startNewUnoGame('Karla');
      const oneCardState = {
        ...base,
        handKarla: [{ id: 'red-1', color: 'red' as const, value: '1' as const }],
        calledUnoKarla: false,
      };
      const pen = penalizeMissedUno(oneCardState, 'Karla', { Karla: 'Karlita', Javier: 'Javier' });
      expect(pen.nextHandKarla).toHaveLength(3);
      expect(pen.nextCalledUnoKarla).toBe(false);
      expect(pen.actionMessage).toContain('Karlita');

      const pts = calculateUnoHandPoints([
        { id: '1', color: 'red', value: '9' },
        { id: '2', color: 'blue', value: 'draw2' },
        { id: '3', color: 'wild', value: 'wild_draw4' },
      ]);
      expect(pts).toBe(9 + 20 + 50);
    });
  });

  describe('Dominó Logic (28 Fichas)', () => {
    it('reparte 7 fichas a cada jugador y 14 al pozo sin duplicados', () => {
      const state = startNewDominoGame(undefined, { Karla: 'Karlita', Javier: 'Javier' });
      expect(state.handKarla).toHaveLength(7);
      expect(state.handJavier).toHaveLength(7);
      expect(state.boneyard).toHaveLength(14);
      const allIds = new Set([
        ...state.handKarla.map((t) => t.id),
        ...state.handJavier.map((t) => t.id),
        ...state.boneyard.map((t) => t.id),
      ]);
      expect(allIds.size).toBe(28);
      expect(state.lastAction).not.toContain('[');
    });

    it('determina correctamente la salida por el doble más alto y devuelve openingTileId', () => {
      const handK = [{ id: '5-5', left: 5, right: 5 }];
      const handJ = [{ id: '6-6', left: 6, right: 6 }];
      const info = determineStartingPlayer(handK, handJ, { Karla: 'Karlita', Javier: 'Javier' });
      expect(info.starter).toBe('Javier');
      expect(info.openingTileId).toBe('6-6');
      expect(info.reason).toBe('Javier tiene el doble más alto 6-6');
    });

    it('valida conexiones legales en placeTileOnBoard y rechaza fichas que no coinciden', () => {
      const first = placeTileOnBoard([], { id: '6-6', left: 6, right: 6 }, 'right', null, null);
      expect(first.isValid).toBe(true);
      expect(first.nextOpenLeft).toBe(6);
      expect(first.nextOpenRight).toBe(6);

      // Intentar colocar 2-3 sobre extremo 6 debe ser inválido
      const invalid = placeTileOnBoard(
        first.nextBoard,
        { id: '2-3', left: 2, right: 3 },
        'left',
        first.nextOpenLeft,
        first.nextOpenRight
      );
      expect(invalid.isValid).toBe(false);
      expect(invalid.nextBoard).toHaveLength(1);

      // Colocar 4-6 en extremo izquierdo deja openLeft = 4 y openRight = 6
      const validLeft = placeTileOnBoard(
        first.nextBoard,
        { id: '4-6', left: 4, right: 6 },
        'left',
        first.nextOpenLeft,
        first.nextOpenRight
      );
      expect(validLeft.isValid).toBe(true);
      expect(validLeft.nextOpenLeft).toBe(4);
      expect(validLeft.nextOpenRight).toBe(6);
      expect(validLeft.nextBoard).toHaveLength(2);
    });

    it('calcula correctamente los puntos de fichas en mano', () => {
      expect(
        calculateHandPips([
          { id: '6-6', left: 6, right: 6 },
          { id: '0-5', left: 0, right: 5 },
        ])
      ).toBe(17);
    });
  });
});
