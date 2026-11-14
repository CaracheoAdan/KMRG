import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeInput } from '../../theme/designSystem';
import { toLocalDateString } from '../StorageService';
import { UserProfile } from '../../types';
import { saveCoupleEvent, CoupleEvent } from './eventsService';
import { generateId } from './featureStore';

export type DateCategory =
  | 'Todas'
  | 'En Casa'
  | 'Al Aire Libre'
  | 'Romántica'
  | 'Sorpresa'
  | 'Bajo Presupuesto';

export type ConcreteDateCategory = Exclude<DateCategory, 'Todas'>;

export interface DateIdea {
  id: string;
  title: string;
  description: string;
  category: ConcreteDateCategory;
  emoji: string;
  isCustom?: boolean;
}

const CUSTOM_IDEAS_STORAGE_KEY = '@kmrg_custom_date_ideas_v1';

export const DATE_CATEGORIES: DateCategory[] = [
  'Todas',
  'En Casa',
  'Al Aire Libre',
  'Romántica',
  'Sorpresa',
  'Bajo Presupuesto',
];

export const BUILT_IN_DATE_IDEAS: DateIdea[] = [
  // En Casa (6)
  {
    id: 'builtin-1',
    title: 'Noche de pizzas caseras en pijama',
    description: 'Amasar o armar cada quien su pizza favorita con música de fondo y velitas.',
    category: 'En Casa',
    emoji: '🍕',
  },
  {
    id: 'builtin-2',
    title: 'Fuerte de sábanas y maratón de películas',
    description: 'Armar un refugio con almohadas, luces cálidas y sus snacks favoritos.',
    category: 'En Casa',
    emoji: '⛺',
  },
  {
    id: 'builtin-3',
    title: 'Spa de pareja en casa',
    description: 'Mascarillas faciales, música relajante, bebida fresca y masaje por turnos.',
    category: 'En Casa',
    emoji: '💆',
  },
  {
    id: 'builtin-4',
    title: 'Torneo de juegos de mesa y retos',
    description: 'Quien pierda cumple un reto cariñoso o prepara el postre de la noche.',
    category: 'En Casa',
    emoji: '🎲',
  },
  {
    id: 'builtin-5',
    title: 'Noche de pintura y vino / mocktails',
    description: 'Intentar pintarse el uno al otro y revelar el retrato al final entre risas.',
    category: 'En Casa',
    emoji: '🎨',
  },
  {
    id: 'builtin-6',
    title: 'Campamento en la sala sin celulares',
    description: 'Apagar pantallas por 2 horas para platicar, escuchar música y abrazarse.',
    category: 'En Casa',
    emoji: '🕯️',
  },

  // Al Aire Libre (6)
  {
    id: 'builtin-7',
    title: 'Picnic al atardecer en el parque',
    description: 'Llevar una manta, fruta picada, sándwiches ricos y ver caer el sol juntos.',
    category: 'Al Aire Libre',
    emoji: '🧺',
  },
  {
    id: 'builtin-8',
    title: 'Noche de mirar las estrellas',
    description: 'Buscar un mirador despejado con cobijas calientes y chocolate o café.',
    category: 'Al Aire Libre',
    emoji: '🌌',
  },
  {
    id: 'builtin-9',
    title: 'Caminata fotográfica juntos',
    description: 'Pasear por un rincón bonito tomándose fotos espontáneas para su álbum.',
    category: 'Al Aire Libre',
    emoji: '📸',
  },
  {
    id: 'builtin-10',
    title: 'Paseo por helado y banca favorita',
    description: 'Ir por su nieve favorita y caminar de la mano platicando sin prisa.',
    category: 'Al Aire Libre',
    emoji: '🍦',
  },
  {
    id: 'builtin-11',
    title: 'Ruta en bici o patines',
    description: 'Salir a rodar un rato y terminar con aguas frescas o un snack rico.',
    category: 'Al Aire Libre',
    emoji: '🚲',
  },
  {
    id: 'builtin-12',
    title: 'Ver el amanecer con pan dulce y café',
    description: 'Madrugar juntitos para ver los primeros rayos del sol abrazados.',
    category: 'Al Aire Libre',
    emoji: '🌅',
  },

  // Romántica (6)
  {
    id: 'builtin-13',
    title: 'Cena a la luz de las velas',
    description: 'Vestirse guapos, poner su playlist romántica y brindar por su historia.',
    category: 'Romántica',
    emoji: '🍷',
  },
  {
    id: 'builtin-14',
    title: 'Recrear nuestra primera cita',
    description: 'Volver al lugar o comer lo mismo que aquel día donde empezó todo.',
    category: 'Romántica',
    emoji: '💜',
  },
  {
    id: 'builtin-15',
    title: 'Baile lento en la sala a medianoche',
    description: 'Poner sus canciones especiales y bailar abrazados con luces bajitas.',
    category: 'Romántica',
    emoji: '💃',
  },
  {
    id: 'builtin-16',
    title: 'Escribirnos cartas frente a frente',
    description: 'Dedicar 15 minutos a escribir lo que más aman del otro y leerlas en voz alta.',
    category: 'Romántica',
    emoji: '💌',
  },
  {
    id: 'builtin-17',
    title: 'Cita de postres y café de especialidad',
    description: 'Ir a una cafetería acogedora, pedir dos postres distintos y compartirlos.',
    category: 'Romántica',
    emoji: '🍰',
  },
  {
    id: 'builtin-18',
    title: 'Noche de recuerdos y álbum de fotos',
    description: 'Ver sus primeras fotos y videos juntos recordando cada anécdota.',
    category: 'Romántica',
    emoji: '📖',
  },

  // Sorpresa (6)
  {
    id: 'builtin-19',
    title: 'Ruta gastronómica de 3 paradas',
    description: 'Entrada en un lugar, plato fuerte en otro y postre en un tercero elegido al azar.',
    category: 'Sorpresa',
    emoji: '🗺️',
  },
  {
    id: 'builtin-20',
    title: 'Reto del supermercado ($100 cada uno)',
    description: 'Cada quien elige en secreto el snack, bebida y dulce favorito para el otro.',
    category: 'Sorpresa',
    emoji: '🛒',
  },
  {
    id: 'builtin-21',
    title: 'Paseo en auto con moneda al aire',
    description: 'En cada esquina tiran una moneda: cara derecha, cruz izquierda, hasta hallar algo nuevo.',
    category: 'Sorpresa',
    emoji: '🪙',
  },
  {
    id: 'builtin-22',
    title: 'Probar una comida que nunca hemos comido',
    description: 'Elegir un restaurante o receta de un país nuevo para ambos.',
    category: 'Sorpresa',
    emoji: '🍜',
  },
  {
    id: 'builtin-23',
    title: 'Intercambio de sorpresas hechas a mano',
    description: 'Crear un detallito, dibujo o cupón sorpresa en 20 minutos para el otro.',
    category: 'Sorpresa',
    emoji: '🎁',
  },
  {
    id: 'builtin-24',
    title: 'Karaoke privado de canciones nostálgicas',
    description: 'Cantar a todo pulmón las canciones de su infancia y adolescencia.',
    category: 'Sorpresa',
    emoji: '🎤',
  },

  // Bajo Presupuesto (6)
  {
    id: 'builtin-25',
    title: 'Tarde de repostería: hornear brownies o galletas',
    description: 'Preparar un postre casero en equipo y disfrutarlo recién salido del horno.',
    category: 'Bajo Presupuesto',
    emoji: '🍪',
  },
  {
    id: 'builtin-26',
    title: 'Desayuno en la cama de domingo',
    description: 'Hotcakes, fruta y café servidos en la cama sin prisa por levantarse.',
    category: 'Bajo Presupuesto',
    emoji: '🥞',
  },
  {
    id: 'builtin-27',
    title: 'Visitar un museo o exposición gratuita',
    description: 'Recorrer juntos una galería, centro cultural o mercadito local.',
    category: 'Bajo Presupuesto',
    emoji: '🏛️',
  },
  {
    id: 'builtin-28',
    title: 'Noche de taquitos callejeros favoritos',
    description: 'Ir por unos buenos tacos y refresco de vidrio platicando de todo.',
    category: 'Bajo Presupuesto',
    emoji: '🌮',
  },
  {
    id: 'builtin-29',
    title: 'Planear nuestro viaje soñado',
    description: 'Armar un itinerario de ensueño con lugares que quieren conocer juntos.',
    category: 'Bajo Presupuesto',
    emoji: '✈️',
  },
  {
    id: 'builtin-30',
    title: 'Noche de preguntas profundas y palomitas',
    description: 'Hacer palomitas en olla y responder 10 preguntas para conocerse aún más.',
    category: 'Bajo Presupuesto',
    emoji: '🍿',
  },
];

export async function getCustomDateIdeas(): Promise<DateIdea[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_IDEAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: String(item.id || generateId()),
      title: String(item.title || ''),
      description: String(item.description || ''),
      category: (item.category as ConcreteDateCategory) || 'Romántica',
      emoji: String(item.emoji || '✨'),
      isCustom: true,
    }));
  } catch {
    return [];
  }
}

export async function getAllDateIdeas(): Promise<DateIdea[]> {
  const custom = await getCustomDateIdeas();
  return [...custom, ...BUILT_IN_DATE_IDEAS];
}

export async function addCustomDateIdea(input: {
  title: string;
  description?: string;
  category: ConcreteDateCategory;
  emoji?: string;
}): Promise<DateIdea> {
  const cleanTitle = sanitizeInput(input.title, 120);
  if (!cleanTitle) {
    throw new Error('Escribe el nombre de la cita.');
  }
  const cleanDesc = sanitizeInput(
    input.description || 'Idea personalizada para disfrutar juntos.',
    300
  );
  const cleanEmoji = sanitizeInput(input.emoji || '✨', 12) || '✨';

  const newIdea: DateIdea = {
    id: `custom-${generateId()}`,
    title: cleanTitle,
    description: cleanDesc,
    category: input.category,
    emoji: cleanEmoji,
    isCustom: true,
  };

  const existing = await getCustomDateIdeas();
  const updated = [newIdea, ...existing];
  await AsyncStorage.setItem(CUSTOM_IDEAS_STORAGE_KEY, JSON.stringify(updated));
  return newIdea;
}

export async function deleteCustomDateIdea(id: string): Promise<void> {
  const existing = await getCustomDateIdeas();
  const filtered = existing.filter((i) => i.id !== id);
  await AsyncStorage.setItem(CUSTOM_IDEAS_STORAGE_KEY, JSON.stringify(filtered));
}

export async function scheduleRouletteIdeaAsEvent(params: {
  idea: DateIdea;
  when: 'today' | 'tomorrow';
  createdBy: UserProfile;
}): Promise<CoupleEvent> {
  const target = new Date();
  if (params.when === 'tomorrow') {
    target.setDate(target.getDate() + 1);
  }
  const dateStr = toLocalDateString(target);

  return saveCoupleEvent({
    title: `${params.idea.emoji} ${params.idea.title}`,
    event_date: dateStr,
    event_time: '20:00',
    location: params.idea.category,
    notes: params.idea.description,
    remind_minutes_before: 60,
    created_by: params.createdBy,
  });
}
