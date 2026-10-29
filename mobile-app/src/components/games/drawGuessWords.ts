import { getMoviesState, getSpecialPlacesState } from '../../services/CoupleSyncService';
import { LOVE_NICKNAMES } from '../../services/StorageService';

export type WordDifficulty = 'facil' | 'media' | 'dificil';

export interface DrawGuessWord {
  word: string;
  difficulty: WordDifficulty;
  category: string;
  points: number; // fácil: 50, media: 100, difícil: 150
}

export const BASE_DRAW_WORDS: DrawGuessWord[] = [
  // ANIMALES (Fácil & Media)
  { word: 'Gato', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Perro', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Pez', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Pájaro', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Conejo', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Oso', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Mariposa', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Tortuga', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'Ratón', difficulty: 'facil', category: 'Animales', points: 50 },
  { word: 'León', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Elefante', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Jirafa', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Pingüino', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Delfín', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Caballo', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Mono', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Panda', difficulty: 'media', category: 'Animales', points: 100 },
  { word: 'Camaleón', difficulty: 'dificil', category: 'Animales', points: 150 },
  { word: 'Murciélago', difficulty: 'dificil', category: 'Animales', points: 150 },
  { word: 'Ornitorrinco', difficulty: 'dificil', category: 'Animales', points: 150 },
  { word: 'Flamenco', difficulty: 'dificil', category: 'Animales', points: 150 },
  { word: 'Medusa', difficulty: 'dificil', category: 'Animales', points: 150 },

  // OBJETOS (Fácil, Media, Difícil)
  { word: 'Taza', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Reloj', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Lápiz', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Silla', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Cama', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Libro', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Teléfono', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Lámpara', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Zapatos', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Gafas', difficulty: 'facil', category: 'Objetos', points: 50 },
  { word: 'Guitarra', difficulty: 'media', category: 'Objetos', points: 100 },
  { word: 'Bicicleta', difficulty: 'media', category: 'Objetos', points: 100 },
  { word: 'Cámara', difficulty: 'media', category: 'Objetos', points: 100 },
  { word: 'Paraguas', difficulty: 'media', category: 'Objetos', points: 100 },
  { word: 'Maleta', difficulty: 'media', category: 'Objetos', points: 100 },
  { word: 'Espejo', difficulty: 'media', category: 'Objetos', points: 100 },
  { word: 'Vela', difficulty: 'media', category: 'Objetos', points: 100 },
  { word: 'Telescopio', difficulty: 'dificil', category: 'Objetos', points: 150 },
  { word: 'Brújula', difficulty: 'dificil', category: 'Objetos', points: 150 },
  { word: 'Microscopio', difficulty: 'dificil', category: 'Objetos', points: 150 },
  { word: 'Gramófono', difficulty: 'dificil', category: 'Objetos', points: 150 },
  { word: 'Reloj de arena', difficulty: 'dificil', category: 'Objetos', points: 150 },

  // COMIDA (Fácil, Media, Difícil)
  { word: 'Pizza', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Manzana', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Helado', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Hamburguesa', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Pastel', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Plátano', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Huevo', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Pan', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Café', difficulty: 'facil', category: 'Comida', points: 50 },
  { word: 'Tacos', difficulty: 'media', category: 'Comida', points: 100 },
  { word: 'Sushi', difficulty: 'media', category: 'Comida', points: 100 },
  { word: 'Sandía', difficulty: 'media', category: 'Comida', points: 100 },
  { word: 'Palomitas', difficulty: 'media', category: 'Comida', points: 100 },
  { word: 'Chocolate', difficulty: 'media', category: 'Comida', points: 100 },
  { word: 'Donas', difficulty: 'media', category: 'Comida', points: 100 },
  { word: 'Fresa', difficulty: 'media', category: 'Comida', points: 100 },
  { word: 'Espagueti', difficulty: 'dificil', category: 'Comida', points: 150 },
  { word: 'Fondue', difficulty: 'dificil', category: 'Comida', points: 150 },
  { word: 'Paella', difficulty: 'dificil', category: 'Comida', points: 150 },
  { word: 'Algodón de azúcar', difficulty: 'dificil', category: 'Comida', points: 150 },

  // NATURALEZA Y LUGARES (Fácil, Media, Difícil)
  { word: 'Sol', difficulty: 'facil', category: 'Naturaleza', points: 50 },
  { word: 'Luna', difficulty: 'facil', category: 'Naturaleza', points: 50 },
  { word: 'Estrella', difficulty: 'facil', category: 'Naturaleza', points: 50 },
  { word: 'Árbol', difficulty: 'facil', category: 'Naturaleza', points: 50 },
  { word: 'Flor', difficulty: 'facil', category: 'Naturaleza', points: 50 },
  { word: 'Nube', difficulty: 'facil', category: 'Naturaleza', points: 50 },
  { word: 'Montaña', difficulty: 'media', category: 'Naturaleza', points: 100 },
  { word: 'Playa', difficulty: 'media', category: 'Naturaleza', points: 100 },
  { word: 'Volcán', difficulty: 'media', category: 'Naturaleza', points: 100 },
  { word: 'Arcoíris', difficulty: 'media', category: 'Naturaleza', points: 100 },
  { word: 'Cascada', difficulty: 'media', category: 'Naturaleza', points: 100 },
  { word: 'Castillo', difficulty: 'media', category: 'Lugares', points: 100 },
  { word: 'Cine', difficulty: 'media', category: 'Lugares', points: 100 },
  { word: 'Parque', difficulty: 'media', category: 'Lugares', points: 100 },
  { word: 'Faro', difficulty: 'media', category: 'Lugares', points: 100 },
  { word: 'Aurora boreal', difficulty: 'dificil', category: 'Naturaleza', points: 150 },
  { word: 'Pirámide', difficulty: 'dificil', category: 'Lugares', points: 150 },
  { word: 'Laberinto', difficulty: 'dificil', category: 'Lugares', points: 150 },
  { word: 'Isla desierta', difficulty: 'dificil', category: 'Lugares', points: 150 },

  // ACCIONES Y DEPORTES (Fácil, Media, Difícil)
  { word: 'Bailar', difficulty: 'facil', category: 'Acciones', points: 50 },
  { word: 'Dormir', difficulty: 'facil', category: 'Acciones', points: 50 },
  { word: 'Cantar', difficulty: 'facil', category: 'Acciones', points: 50 },
  { word: 'Abrazo', difficulty: 'facil', category: 'Acciones', points: 50 },
  { word: 'Beso', difficulty: 'facil', category: 'Acciones', points: 50 },
  { word: 'Fútbol', difficulty: 'media', category: 'Deportes', points: 100 },
  { word: 'Nadar', difficulty: 'media', category: 'Deportes', points: 100 },
  { word: 'Cocinar', difficulty: 'media', category: 'Acciones', points: 100 },
  { word: 'Pintar', difficulty: 'media', category: 'Acciones', points: 100 },
  { word: 'Viajar', difficulty: 'media', category: 'Acciones', points: 100 },
  { word: 'Patinar', difficulty: 'media', category: 'Deportes', points: 100 },
  { word: 'Paracaidismo', difficulty: 'dificil', category: 'Deportes', points: 150 },
  { word: 'Malabarismo', difficulty: 'dificil', category: 'Acciones', points: 150 },
  { word: 'Bucear', difficulty: 'dificil', category: 'Deportes', points: 150 },
  { word: 'Meditación', difficulty: 'dificil', category: 'Acciones', points: 150 },

  // PROFESIONES Y PERSONAJES
  { word: 'Doctor', difficulty: 'facil', category: 'Profesiones', points: 50 },
  { word: 'Policía', difficulty: 'facil', category: 'Profesiones', points: 50 },
  { word: 'Cocinero', difficulty: 'facil', category: 'Profesiones', points: 50 },
  { word: 'Bombero', difficulty: 'media', category: 'Profesiones', points: 100 },
  { word: 'Astronauta', difficulty: 'media', category: 'Profesiones', points: 100 },
  { word: 'Mago', difficulty: 'media', category: 'Personajes', points: 100 },
  { word: 'Pirata', difficulty: 'media', category: 'Personajes', points: 100 },
  { word: 'Superhéroe', difficulty: 'media', category: 'Personajes', points: 100 },
  { word: 'Arqueólogo', difficulty: 'dificil', category: 'Profesiones', points: 150 },
  { word: 'Detective', difficulty: 'dificil', category: 'Profesiones', points: 150 },
  { word: 'Sirena', difficulty: 'dificil', category: 'Personajes', points: 150 },
];

/**
 * Normaliza una cadena quitando tildes, mayúsculas, espacios adicionales y plural simple.
 */
export function normalizeGuess(text: string): string {
  if (!text) return '';
  let clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos/diacríticos
    .trim()
    .replace(/\s+/g, ' ');

  // Quitar plural simple al final ('s' o 'es') si la palabra tiene al menos 4 letras
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
 * Calcula la distancia Levenshtein entre dos cadenas para detectar si está a 1 letra de distancia ("¡Casi!").
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

/**
 * Evalúa si el intento del usuario es correcto o está a 1 letra de distancia ("¡Casi!").
 */
export function evaluateGuess(guess: string, targetWord: string): GuessEvaluation {
  const normGuess = normalizeGuess(guess);
  const normTarget = normalizeGuess(targetWord);

  if (!normGuess) return { isCorrect: false, isClose: false };
  if (normGuess === normTarget) return { isCorrect: true, isClose: false };

  // Detección de "¡Casi!" si la palabra tiene 5 o más letras y la distancia es exactamente 1
  if (normTarget.length >= 5 && Math.abs(normGuess.length - normTarget.length) <= 1) {
    const dist = levenshteinDistance(normGuess, normTarget);
    if (dist === 1) {
      return { isCorrect: false, isClose: true };
    }
  }

  return { isCorrect: false, isClose: false };
}

/**
 * Obtiene dinámicamente la categoría "Nuestra Historia" usando datos reales de la pareja:
 * lugares del mapa de pines, películas de Cine, motes cariñosos y anécdotas.
 */
export async function getOurHistoryWords(): Promise<DrawGuessWord[]> {
  const words: DrawGuessWord[] = [];

  try {
    const [placesState, moviesState] = await Promise.all([
      getSpecialPlacesState().catch(() => null),
      getMoviesState().catch(() => null),
    ]);

    // 1. Lugares del mapa
    if (placesState?.places && placesState.places.length > 0) {
      for (const p of placesState.places) {
        if (p.title && p.title.trim().length >= 3 && p.title.length <= 22) {
          words.push({
            word: p.title.trim(),
            difficulty: 'media',
            category: 'Nuestra Historia',
            points: 100,
          });
        }
      }
    }

    // 2. Películas vistas o planeadas
    if (moviesState?.movies && moviesState.movies.length > 0) {
      for (const m of moviesState.movies) {
        if (m.title && m.title.trim().length >= 3 && m.title.length <= 22) {
          words.push({
            word: m.title.trim(),
            difficulty: 'dificil',
            category: 'Nuestra Historia',
            points: 150,
          });
        }
      }
    }

    // 3. Apodos de amor
    for (const nick of LOVE_NICKNAMES) {
      if (nick && nick.length >= 3) {
        words.push({
          word: nick,
          difficulty: 'facil',
          category: 'Nuestra Historia',
          points: 50,
        });
      }
    }
  } catch {
    // Si falla la lectura, se completa con el banco general
  }

  // Si hay menos de 5 palabras en Nuestra Historia, rellenar con palabras románticas
  const fallbackRomance: DrawGuessWord[] = [
    { word: 'Anillo', difficulty: 'facil', category: 'Nuestra Historia', points: 50 },
    { word: 'Carta de amor', difficulty: 'media', category: 'Nuestra Historia', points: 100 },
    { word: 'Picnic', difficulty: 'media', category: 'Nuestra Historia', points: 100 },
    { word: 'Atardecer', difficulty: 'media', category: 'Nuestra Historia', points: 100 },
    { word: 'Serenata', difficulty: 'dificil', category: 'Nuestra Historia', points: 150 },
    { word: 'Luna de miel', difficulty: 'dificil', category: 'Nuestra Historia', points: 150 },
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
 * Selecciona 3 palabras para que el dibujante elija: una fácil, una media y una difícil.
 * Evita repetir palabras ya usadas en la partida actual.
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

  const pickRandom = (arr: DrawGuessWord[], fallbackArr: DrawGuessWord[]): DrawGuessWord => {
    const source = arr.length > 0 ? arr : fallbackArr;
    return source[Math.floor(Math.random() * source.length)];
  };

  return {
    easy: pickRandom(easies, BASE_DRAW_WORDS.filter((w) => w.difficulty === 'facil')),
    medium: pickRandom(mediums, BASE_DRAW_WORDS.filter((w) => w.difficulty === 'media')),
    hard: pickRandom(hards, BASE_DRAW_WORDS.filter((w) => w.difficulty === 'dificil')),
  };
}
