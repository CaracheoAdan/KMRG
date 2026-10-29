import { getMoviesState, getSpecialPlacesState } from '../../services/CoupleSyncService';
import { LOVE_NICKNAMES } from '../../services/StorageService';

export type WordDifficulty = 'facil' | 'media' | 'dificil';

export interface DrawGuessWord {
  word: string;
  difficulty: WordDifficulty;
  category: string;
  categoryEmoji: string;
  points: number; // fácil: 50, media: 100, difícil: 150
}

/**
 * Banco base curado: ÚNICAMENTE palabras DIBUJABLES, sustantivos o acciones concretas,
 * de 3 a 14 letras, sin signos de puntuación ni palabras en inglés.
 */
export const BASE_DRAW_WORDS: DrawGuessWord[] = [
  // ANIMALES 🐶 (Fácil, Media, Difícil)
  { word: 'Gato', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐱', points: 50 },
  { word: 'Perro', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐶', points: 50 },
  { word: 'Pez', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐟', points: 50 },
  { word: 'Pájaro', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐦', points: 50 },
  { word: 'Conejo', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐰', points: 50 },
  { word: 'Oso', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐻', points: 50 },
  { word: 'Tortuga', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐢', points: 50 },
  { word: 'Ratón', difficulty: 'facil', category: 'Animales', categoryEmoji: '🐭', points: 50 },
  { word: 'Mariposa', difficulty: 'facil', category: 'Animales', categoryEmoji: '🦋', points: 50 },
  { word: 'León', difficulty: 'media', category: 'Animales', categoryEmoji: '🦁', points: 100 },
  { word: 'Elefante', difficulty: 'media', category: 'Animales', categoryEmoji: '🐘', points: 100 },
  { word: 'Jirafa', difficulty: 'media', category: 'Animales', categoryEmoji: '🦒', points: 100 },
  { word: 'Pingüino', difficulty: 'media', category: 'Animales', categoryEmoji: '🐧', points: 100 },
  { word: 'Delfín', difficulty: 'media', category: 'Animales', categoryEmoji: '🐬', points: 100 },
  { word: 'Caballo', difficulty: 'media', category: 'Animales', categoryEmoji: '🐴', points: 100 },
  { word: 'Mono', difficulty: 'media', category: 'Animales', categoryEmoji: '🐵', points: 100 },
  { word: 'Panda', difficulty: 'media', category: 'Animales', categoryEmoji: '🐼', points: 100 },
  { word: 'Tiburón', difficulty: 'media', category: 'Animales', categoryEmoji: '🦈', points: 100 },
  { word: 'Camaleón', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🦎', points: 150 },
  { word: 'Murciélago', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🦇', points: 150 },
  { word: 'Flamenco', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🦩', points: 150 },
  { word: 'Medusa', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🪼', points: 150 },
  { word: 'Pulpo', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🐙', points: 150 },

  // OBJETOS 🎸 (Fácil, Media, Difícil)
  { word: 'Taza', difficulty: 'facil', category: 'Objetos', categoryEmoji: '☕', points: 50 },
  { word: 'Reloj', difficulty: 'facil', category: 'Objetos', categoryEmoji: '⏰', points: 50 },
  { word: 'Lápiz', difficulty: 'facil', category: 'Objetos', categoryEmoji: '✏️', points: 50 },
  { word: 'Silla', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🪑', points: 50 },
  { word: 'Cama', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🛏️', points: 50 },
  { word: 'Libro', difficulty: 'facil', category: 'Objetos', categoryEmoji: '📖', points: 50 },
  { word: 'Teléfono', difficulty: 'facil', category: 'Objetos', categoryEmoji: '📱', points: 50 },
  { word: 'Lámpara', difficulty: 'facil', category: 'Objetos', categoryEmoji: '💡', points: 50 },
  { word: 'Zapatos', difficulty: 'facil', category: 'Objetos', categoryEmoji: '👟', points: 50 },
  { word: 'Gafas', difficulty: 'facil', category: 'Objetos', categoryEmoji: '👓', points: 50 },
  { word: 'Guitarra', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎸', points: 100 },
  { word: 'Bicicleta', difficulty: 'media', category: 'Objetos', categoryEmoji: '🚲', points: 100 },
  { word: 'Cámara', difficulty: 'media', category: 'Objetos', categoryEmoji: '📷', points: 100 },
  { word: 'Paraguas', difficulty: 'media', category: 'Objetos', categoryEmoji: '☂️', points: 100 },
  { word: 'Maleta', difficulty: 'media', category: 'Objetos', categoryEmoji: '🧳', points: 100 },
  { word: 'Espejo', difficulty: 'media', category: 'Objetos', categoryEmoji: '🪞', points: 100 },
  { word: 'Vela', difficulty: 'media', category: 'Objetos', categoryEmoji: '🕯️', points: 100 },
  { word: 'Telescopio', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🔭', points: 150 },
  { word: 'Brújula', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🧭', points: 150 },
  { word: 'Microscopio', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🔬', points: 150 },
  { word: 'Submarino', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🛥️', points: 150 },

  // COMIDA 🍕 (Fácil, Media, Difícil)
  { word: 'Pizza', difficulty: 'facil', category: 'Comida', categoryEmoji: '🍕', points: 50 },
  { word: 'Manzana', difficulty: 'facil', category: 'Comida', categoryEmoji: '🍎', points: 50 },
  { word: 'Helado', difficulty: 'facil', category: 'Comida', categoryEmoji: '🍦', points: 50 },
  { word: 'Hamburguesa', difficulty: 'facil', category: 'Comida', categoryEmoji: '🍔', points: 50 },
  { word: 'Pastel', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎂', points: 50 },
  { word: 'Plátano', difficulty: 'facil', category: 'Comida', categoryEmoji: '🍌', points: 50 },
  { word: 'Huevo', difficulty: 'facil', category: 'Comida', categoryEmoji: '🍳', points: 50 },
  { word: 'Pan', difficulty: 'facil', category: 'Comida', categoryEmoji: '🍞', points: 50 },
  { word: 'Café', difficulty: 'facil', category: 'Comida', categoryEmoji: '☕', points: 50 },
  { word: 'Tacos', difficulty: 'media', category: 'Comida', categoryEmoji: '🌮', points: 100 },
  { word: 'Sushi', difficulty: 'media', category: 'Comida', categoryEmoji: '🍣', points: 100 },
  { word: 'Sandía', difficulty: 'media', category: 'Comida', categoryEmoji: '🍉', points: 100 },
  { word: 'Palomitas', difficulty: 'media', category: 'Comida', categoryEmoji: '🍿', points: 100 },
  { word: 'Chocolate', difficulty: 'media', category: 'Comida', categoryEmoji: '🍫', points: 100 },
  { word: 'Donas', difficulty: 'media', category: 'Comida', categoryEmoji: '🍩', points: 100 },
  { word: 'Fresa', difficulty: 'media', category: 'Comida', categoryEmoji: '🍓', points: 100 },
  { word: 'Espagueti', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🍝', points: 150 },
  { word: 'Paella', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🥘', points: 150 },
  { word: 'Fondue', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🫕', points: 150 },

  // NATURALEZA Y LUGARES 🌳 (Fácil, Media, Difícil)
  { word: 'Sol', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '☀️', points: 50 },
  { word: 'Luna', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🌙', points: 50 },
  { word: 'Estrella', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '⭐', points: 50 },
  { word: 'Árbol', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🌳', points: 50 },
  { word: 'Flor', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🌸', points: 50 },
  { word: 'Nube', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '☁️', points: 50 },
  { word: 'Montaña', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '⛰️', points: 100 },
  { word: 'Playa', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🏖️', points: 100 },
  { word: 'Volcán', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🌋', points: 100 },
  { word: 'Arcoíris', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🌈', points: 100 },
  { word: 'Cascada', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🌊', points: 100 },
  { word: 'Castillo', difficulty: 'media', category: 'Lugares', categoryEmoji: '🏰', points: 100 },
  { word: 'Cine', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎬', points: 100 },
  { word: 'Parque', difficulty: 'media', category: 'Lugares', categoryEmoji: '🏞️', points: 100 },
  { word: 'Faro', difficulty: 'media', category: 'Lugares', categoryEmoji: '🗼', points: 100 },
  { word: 'Pirámide', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🏛️', points: 150 },
  { word: 'Iglú', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🧊', points: 150 },

  // ACCIONES Y DEPORTES 🏃 (Fácil, Media, Difícil)
  { word: 'Dormir', difficulty: 'facil', category: 'Acciones', categoryEmoji: '💤', points: 50 },
  { word: 'Cantar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎤', points: 50 },
  { word: 'Bailar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '💃', points: 50 },
  { word: 'Nadar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🏊', points: 50 },
  { word: 'Cocinar', difficulty: 'media', category: 'Acciones', categoryEmoji: '🍳', points: 100 },
  { word: 'Pintar', difficulty: 'media', category: 'Acciones', categoryEmoji: '🎨', points: 100 },
  { word: 'Futbol', difficulty: 'facil', category: 'Deportes', categoryEmoji: '⚽', points: 50 },
  { word: 'Baloncesto', difficulty: 'media', category: 'Deportes', categoryEmoji: '🏀', points: 100 },
  { word: 'Tenis', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎾', points: 100 },
  { word: 'Patinar', difficulty: 'media', category: 'Deportes', categoryEmoji: '⛸️', points: 100 },
  { word: 'Boxeo', difficulty: 'dificil', category: 'Deportes', categoryEmoji: '🥊', points: 150 },
];

/**
 * Normaliza una palabra para adivinar:
 * - Pasa a minúsculas
 * - Remueve tildes y diacríticos
 * - Quita espacios redundantes y caracteres no alfabéticos
 * - Maneja plural simple común (ej. "perros" -> "perro", "tazas" -> "taza")
 */
export function normalizeGuess(text: string): string {
  if (!text) return '';
  let clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zñ]/g, '');

  // Regla de plural simple (si termina en 'es' o 's')
  if (clean.length >= 4) {
    if (clean.endsWith('es') && !['tres', 'mes'].includes(clean)) {
      clean = clean.slice(0, -2);
    } else if (clean.endsWith('s') && !['pais', 'paris', 'gafas'].includes(clean)) {
      clean = clean.slice(0, -1);
    }
  }

  return clean;
}

/**
 * Filtro estricto para palabras de Nuestra Historia:
 * - Solo sustantivos o palabras concretas de 3 a 14 letras
 * - Sin signos de puntuación (sin ¡!, ¿?, comillas ni dos puntos)
 * - Solo 1 palabra (o 2 muy cortas), en español
 */
export function isValidDrawableWord(text: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  if (clean.length < 3 || clean.length > 14) return false;
  if (/[¡!¿?:\-_,."'\(\)\/\\]/.test(clean)) return false;
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(clean)) return false;
  const words = clean.split(/\s+/);
  if (words.length > 2) return false;
  const forbidden = ['split', 'the', 'and', 'movie', 'film', 'serie', 'trailer'];
  if (forbidden.some((f) => clean.toLowerCase().includes(f))) return false;
  return true;
}

/**
 * Distancia Levenshtein entre dos cadenas
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export interface GuessEvaluation {
  isCorrect: boolean;
  isClose: boolean;
}

export function evaluateGuess(guess: string, targetWord: string): GuessEvaluation {
  const normGuess = normalizeGuess(guess);
  const normTarget = normalizeGuess(targetWord);

  if (!normGuess || !normTarget) return { isCorrect: false, isClose: false };
  if (normGuess === normTarget) return { isCorrect: true, isClose: false };

  if (normTarget.length >= 5 && Math.abs(normGuess.length - normTarget.length) <= 1) {
    const dist = levenshteinDistance(normGuess, normTarget);
    if (dist === 1) {
      return { isCorrect: false, isClose: true };
    }
  }

  return { isCorrect: false, isClose: false };
}

/**
 * Genera un hash criptográfico simple y determinista con salt para evitar que la palabra
 * viaje en texto plano al cliente del que adivina.
 */
export function hashWordWithSalt(word: string, salt: string): string {
  const str = normalizeGuess(word) + '_' + salt;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return 'hw_' + Math.abs(hash).toString(36);
}

/**
 * Genera hashes de todas las variantes a 1 letra de distancia para detectar "¡Casi!" al instante
 * sin conocer la palabra secreta.
 */
export function generateDistanceOneHashes(word: string, salt: string): string[] {
  const norm = normalizeGuess(word);
  if (norm.length < 5) return [];
  const alphabet = 'abcdefghijklmnñopqrstuvwxyz'.split('');
  const hashes = new Set<string>();

  // Eliminación de 1 letra
  for (let i = 0; i < norm.length; i++) {
    const variant = norm.slice(0, i) + norm.slice(i + 1);
    if (variant.length >= 4) {
      hashes.add(hashWordWithSalt(variant, salt));
    }
  }

  // Sustitución de 1 letra
  for (let i = 0; i < norm.length; i++) {
    for (const char of alphabet) {
      if (char !== norm[i]) {
        const variant = norm.slice(0, i) + char + norm.slice(i + 1);
        hashes.add(hashWordWithSalt(variant, salt));
      }
    }
  }

  return Array.from(hashes);
}

/**
 * Construye los guiones de Pictionary "_ _ _ _   _ _" con las letras reveladas.
 * Ejemplo: "PERRO" con revelada index 0 -> "P _ _ _ _"
 */
export function buildWordMask(word: string, revealedIndices: number[] = []): string {
  if (!word) return '';
  const revealedSet = new Set(revealedIndices);
  const words = word.trim().split(/\s+/);

  return words
    .map((w, wIdx) => {
      let offset = 0;
      for (let prev = 0; prev < wIdx; prev++) {
        offset += words[prev].length + 1;
      }
      return w
        .split('')
        .map((char, charIdx) => {
          const idx = offset + charIdx;
          if (revealedSet.has(idx)) {
            return char.toUpperCase();
          }
          return '_';
        })
        .join(' ');
    })
    .join('   '); // Espacio ancho entre palabras
}

/**
 * Obtiene dinámicamente la categoría "Nuestra Historia" 💕 usando datos reales filtrados.
 */
export async function getOurHistoryWords(): Promise<DrawGuessWord[]> {
  const words: DrawGuessWord[] = [];

  try {
    const [placesState, moviesState] = await Promise.all([
      getSpecialPlacesState().catch(() => null),
      getMoviesState().catch(() => null),
    ]);

    // 1. Lugares del mapa (solo títulos de 1-2 palabras concretas)
    if (placesState?.places) {
      for (const p of placesState.places) {
        if (p.title && isValidDrawableWord(p.title)) {
          words.push({
            word: p.title.trim(),
            difficulty: 'media',
            category: 'Nuestra Historia',
            categoryEmoji: '📍',
            points: 100,
          });
        }
      }
    }

    // 2. Películas (solo si es título concreto en español y dibujable)
    if (moviesState?.movies) {
      for (const m of moviesState.movies) {
        if (m.title && isValidDrawableWord(m.title)) {
          words.push({
            word: m.title.trim(),
            difficulty: 'dificil',
            category: 'Nuestra Historia',
            categoryEmoji: '🎬',
            points: 150,
          });
        }
      }
    }

    // 3. Apodos de amor (de 3 a 14 letras)
    for (const nick of LOVE_NICKNAMES) {
      if (nick && isValidDrawableWord(nick)) {
        words.push({
          word: nick.trim(),
          difficulty: 'facil',
          category: 'Nuestra Historia',
          categoryEmoji: '💕',
          points: 50,
        });
      }
    }
  } catch {
    // Si falla, se completa con el banco romántico
  }

  const fallbackRomance: DrawGuessWord[] = [
    { word: 'Anillo', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '💍', points: 50 },
    { word: 'Corazón', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '💖', points: 50 },
    { word: 'Beso', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '💋', points: 50 },
    { word: 'Abrazo', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '🫂', points: 50 },
    { word: 'Picnic', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🧺', points: 100 },
    { word: 'Atardecer', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🌅', points: 100 },
    { word: 'Carta', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '💌', points: 100 },
    { word: 'Regalo', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🎁', points: 100 },
    { word: 'Flores', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '💐', points: 100 },
    { word: 'Serenata', difficulty: 'dificil', category: 'Nuestra Historia', categoryEmoji: '🎻', points: 150 },
    { word: 'Boda', difficulty: 'dificil', category: 'Nuestra Historia', categoryEmoji: '💒', points: 150 },
  ];

  const uniqueMap = new Map<string, DrawGuessWord>();
  [...words, ...fallbackRomance].forEach((w) => {
    const key = normalizeGuess(w.word);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, w);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Selecciona 3 palabras para que el dibujante elija (fácil, media, difícil).
 * Cada opción de categoría distinta cuando sea posible, sin repetir palabras de la partida.
 */
export async function getWordChoicesForRound(usedWords: string[] = []): Promise<{
  easy: DrawGuessWord;
  medium: DrawGuessWord;
  hard: DrawGuessWord;
}> {
  const ourHistory = await getOurHistoryWords();
  const allPool = [...BASE_DRAW_WORDS, ...ourHistory];

  const usedNorm = new Set(usedWords.map(normalizeGuess));
  const available = allPool.filter((w) => !usedNorm.has(normalizeGuess(w.word)));

  const easies = available.filter((w) => w.difficulty === 'facil');
  const mediums = available.filter((w) => w.difficulty === 'media');
  const hards = available.filter((w) => w.difficulty === 'dificil');

  const pickDistinct = (
    pool: DrawGuessWord[],
    forbiddenCats: Set<string>,
    fallbackList: DrawGuessWord[]
  ): DrawGuessWord => {
    const preferred = pool.filter((w) => !forbiddenCats.has(w.category));
    const candidate = preferred.length > 0 ? preferred : pool.length > 0 ? pool : fallbackList;
    return candidate[Math.floor(Math.random() * candidate.length)];
  };

  const selectedCats = new Set<string>();

  const easyPick = pickDistinct(
    easies,
    selectedCats,
    BASE_DRAW_WORDS.filter((w) => w.difficulty === 'facil')
  );
  selectedCats.add(easyPick.category);

  const mediumPick = pickDistinct(
    mediums,
    selectedCats,
    BASE_DRAW_WORDS.filter((w) => w.difficulty === 'media')
  );
  selectedCats.add(mediumPick.category);

  const hardPick = pickDistinct(
    hards,
    selectedCats,
    BASE_DRAW_WORDS.filter((w) => w.difficulty === 'dificil')
  );

  return {
    easy: easyPick,
    medium: mediumPick,
    hard: hardPick,
  };
}
