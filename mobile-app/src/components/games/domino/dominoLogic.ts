import { DominoPlacedTile, DominoState, DominoTile, UserProfile } from '../../../types';

export const ALL_DOMINO_TILES: DominoTile[] = (() => {
  const tiles: DominoTile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({
        id: `${i}-${j}`,
        left: i,
        right: j,
      });
    }
  }
  return tiles;
})();

export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function calculateHandPips(hand: DominoTile[]): number {
  return hand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
}

export const DOMINO_TARGET_SCORE = 100;

/**
 * Regla oficial de salida de dominó:
 * Comienza quien tenga el doble ("mula") más alto: 6-6, luego 5-5, 4-4, 3-3, 2-2, 1-1, 0-0.
 * Si ninguno posee dobles, inicia quien tenga la ficha con mayor suma total de puntos.
 */
export function determineStartingPlayer(
  handKarla: DominoTile[],
  handJavier: DominoTile[],
  names?: { Karla: string; Javier: string }
): { starter: UserProfile; reason: string; openingTileId: string | null } {
  const nameK = names?.Karla || 'Karlita';
  const nameJ = names?.Javier || 'Javier';

  // Buscar dobles de 6 a 0
  for (let val = 6; val >= 0; val--) {
    const tileK = handKarla.find((t) => t.left === val && t.right === val);
    const tileJ = handJavier.find((t) => t.left === val && t.right === val);

    if (tileK && !tileJ) {
      return {
        starter: 'Karla',
        reason: `${nameK} tiene el doble más alto ${val}-${val}`,
        openingTileId: tileK.id,
      };
    }
    if (tileJ && !tileK) {
      return {
        starter: 'Javier',
        reason: `${nameJ} tiene el doble más alto ${val}-${val}`,
        openingTileId: tileJ.id,
      };
    }
  }

  // Si ninguno tiene dobles (caso excepcional), buscar la ficha con mayor suma de puntos
  const maxTileScore = (hand: DominoTile[]) =>
    hand.reduce(
      (best, t) => {
        const score = t.left + t.right;
        return score > best.score ? { score, tile: t } : best;
      },
      { score: -1, tile: null as DominoTile | null }
    );

  const bestK = maxTileScore(handKarla);
  const bestJ = maxTileScore(handJavier);

  if (bestK.score >= bestJ.score) {
    return {
      starter: 'Karla',
      reason: `${nameK} inicia por mayor ficha ${bestK.tile?.left}-${bestK.tile?.right}`,
      openingTileId: bestK.tile?.id || null,
    };
  }
  return {
    starter: 'Javier',
    reason: `${nameJ} inicia por mayor ficha ${bestJ.tile?.left}-${bestJ.tile?.right}`,
    openingTileId: bestJ.tile?.id || null,
  };
}

export function canPlayTile(
  tile: DominoTile,
  openLeft: number | null,
  openRight: number | null
): { canPlayLeft: boolean; canPlayRight: boolean; canPlayAny: boolean } {
  if (openLeft === null || openRight === null) {
    return { canPlayLeft: true, canPlayRight: true, canPlayAny: true };
  }

  const canPlayLeft = tile.left === openLeft || tile.right === openLeft;
  const canPlayRight = tile.left === openRight || tile.right === openRight;

  return {
    canPlayLeft,
    canPlayRight,
    canPlayAny: canPlayLeft || canPlayRight,
  };
}

export function getPlayableTiles(
  hand: DominoTile[],
  openLeft: number | null,
  openRight: number | null
): DominoTile[] {
  return hand.filter((t) => canPlayTile(t, openLeft, openRight).canPlayAny);
}

export function startNewDominoGame(
  starterOverride?: UserProfile,
  names?: { Karla: string; Javier: string }
): DominoState {
  const shuffled = shuffleArray(ALL_DOMINO_TILES);
  const handKarla = shuffled.slice(0, 7);
  const handJavier = shuffled.slice(7, 14);
  const boneyard = shuffled.slice(14); // 14 fichas en el pozo

  const startInfo = determineStartingPlayer(handKarla, handJavier, names);
  const starter = starterOverride || startInfo.starter;

  return {
    phase: 'playing',
    board: [],
    openLeft: null,
    openRight: null,
    handKarla,
    handJavier,
    boneyard,
    turn: starter,
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
    scoreKarla: 0,
    scoreJavier: 0,
    openingTileId: startInfo.openingTileId,
    consecutivePasses: 0,
    lastAction: `¡Mesa servida! ${startInfo.reason}`,
    updatedAt: Date.now(),
    version: 1,
  };
}

export interface PlaceDominoResult {
  nextBoard: DominoPlacedTile[];
  nextOpenLeft: number;
  nextOpenRight: number;
  isValid: boolean;
}

export function placeTileOnBoard(
  board: DominoPlacedTile[],
  tile: DominoTile,
  side: 'left' | 'right',
  openLeft: number | null,
  openRight: number | null
): PlaceDominoResult {
  // Primera ficha en mesa
  if (board.length === 0 || openLeft === null || openRight === null) {
    return {
      nextBoard: [
        {
          tile,
          placedLeft: tile.left,
          placedRight: tile.right,
        },
      ],
      nextOpenLeft: tile.left,
      nextOpenRight: tile.right,
      isValid: true,
    };
  }

  if (side === 'left') {
    if (tile.left !== openLeft && tile.right !== openLeft) {
      return {
        nextBoard: board,
        nextOpenLeft: openLeft,
        nextOpenRight: openRight,
        isValid: false,
      };
    }

    // Conecta con openLeft: el lado que coincide va hacia adentro (placedRight)
    const matchingSide = tile.left === openLeft ? tile.left : tile.right;
    const newOuterSide = tile.left === openLeft ? tile.right : tile.left;

    const newPlacedTile: DominoPlacedTile = {
      tile,
      placedLeft: newOuterSide,
      placedRight: matchingSide,
    };

    return {
      nextBoard: [newPlacedTile, ...board],
      nextOpenLeft: newOuterSide,
      nextOpenRight: openRight,
      isValid: true,
    };
  } else {
    if (tile.left !== openRight && tile.right !== openRight) {
      return {
        nextBoard: board,
        nextOpenLeft: openLeft,
        nextOpenRight: openRight,
        isValid: false,
      };
    }

    // Conecta con openRight: el lado que coincide va hacia adentro (placedLeft)
    const matchingSide = tile.left === openRight ? tile.left : tile.right;
    const newOuterSide = tile.left === openRight ? tile.right : tile.left;

    const newPlacedTile: DominoPlacedTile = {
      tile,
      placedLeft: matchingSide,
      placedRight: newOuterSide,
    };

    return {
      nextBoard: [...board, newPlacedTile],
      nextOpenLeft: openLeft,
      nextOpenRight: newOuterSide,
      isValid: true,
    };
  }
}
