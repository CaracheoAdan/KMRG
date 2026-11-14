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
  // ANIMALES - FÁCIL (20)
  { word: 'Gato', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Perro', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Pez', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Pájaro', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Conejo', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Oso', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Tortuga', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Ratón', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Mariposa', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Vaca', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Cerdo', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Pato', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Pollo', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Oveja', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Rana', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Serpiente', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Caracol', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Abeja', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Araña', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },
  { word: 'Ballena', difficulty: 'facil', category: 'Animales', categoryEmoji: '🎨', points: 50 },

  // ANIMALES - MEDIA (20)
  { word: 'León', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Elefante', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Jirafa', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Pingüino', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Delfín', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Caballo', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Mono', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Panda', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Tiburón', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Cebra', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Canguro', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Cocodrilo', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Búho', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Zorro', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Lobo', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Tigre', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Águila', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Cangrejo', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Foca', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },
  { word: 'Venado', difficulty: 'media', category: 'Animales', categoryEmoji: '🎨', points: 100 },

  // ANIMALES - DIFÍCIL (18)
  { word: 'Camaleón', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Murciélago', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Flamenco', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Medusa', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Pulpo', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Rinoceronte', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Hipopótamo', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Puercoespín', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Ornitorrinco', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Escorpión', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Tucán', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Pavo Real', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Cisne', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Caballito', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Luciérnaga', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Koala', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Perezoso', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },
  { word: 'Nutria', difficulty: 'dificil', category: 'Animales', categoryEmoji: '🎨', points: 150 },

  // OBJETOS Y HOGAR - FÁCIL (22)
  { word: 'Taza', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Reloj', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Lápiz', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Silla', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Cama', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Libro', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Teléfono', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Lámpara', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Zapato', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Gafas', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Mesa', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Llave', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Puerta', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Ventana', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Vaso', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Cuchara', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Tenedor', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Cuchillo', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Escoba', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Globo', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Sombrero', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },
  { word: 'Corona', difficulty: 'facil', category: 'Objetos', categoryEmoji: '🎨', points: 50 },

  // OBJETOS Y HOGAR - MEDIA (20)
  { word: 'Guitarra', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Cámara', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Paraguas', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Maleta', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Espejo', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Vela', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Mochila', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Almohada', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Tijeras', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Martillo', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Candado', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Linterna', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Pincel', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Regla', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Batería', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Audífonos', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Teclado', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Computadora', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Sartén', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },
  { word: 'Olla', difficulty: 'media', category: 'Objetos', categoryEmoji: '🎨', points: 100 },

  // OBJETOS - DIFÍCIL (18)
  { word: 'Telescopio', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Brújula', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Microscopio', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Reloj Arena', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Ventilador', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Lavadora', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Licuadora', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Cafetera', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Tostadora', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Proyector', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Atrapasueños', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Candelabro', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Caja Fuerte', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Trípode', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Ancla', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Imán', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Péndulo', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },
  { word: 'Periscopio', difficulty: 'dificil', category: 'Objetos', categoryEmoji: '🎨', points: 150 },

  // ROPA Y ACCESORIOS (15)
  { word: 'Camisa', difficulty: 'facil', category: 'Ropa', categoryEmoji: '🎨', points: 50 },
  { word: 'Pantalón', difficulty: 'facil', category: 'Ropa', categoryEmoji: '🎨', points: 50 },
  { word: 'Vestido', difficulty: 'facil', category: 'Ropa', categoryEmoji: '🎨', points: 50 },
  { word: 'Gorra', difficulty: 'facil', category: 'Ropa', categoryEmoji: '🎨', points: 50 },
  { word: 'Calcetín', difficulty: 'facil', category: 'Ropa', categoryEmoji: '🎨', points: 50 },
  { word: 'Bufanda', difficulty: 'media', category: 'Ropa', categoryEmoji: '🎨', points: 100 },
  { word: 'Corbata', difficulty: 'media', category: 'Ropa', categoryEmoji: '🎨', points: 100 },
  { word: 'Guante', difficulty: 'media', category: 'Ropa', categoryEmoji: '🎨', points: 100 },
  { word: 'Bota', difficulty: 'media', category: 'Ropa', categoryEmoji: '🎨', points: 100 },
  { word: 'Sudadera', difficulty: 'media', category: 'Ropa', categoryEmoji: '🎨', points: 100 },
  { word: 'Chamarra', difficulty: 'media', category: 'Ropa', categoryEmoji: '🎨', points: 100 },
  { word: 'Pijama', difficulty: 'media', category: 'Ropa', categoryEmoji: '🎨', points: 100 },
  { word: 'Cinturón', difficulty: 'dificil', category: 'Ropa', categoryEmoji: '🎨', points: 150 },
  { word: 'Aretes', difficulty: 'dificil', category: 'Ropa', categoryEmoji: '🎨', points: 150 },
  { word: 'Collar', difficulty: 'dificil', category: 'Ropa', categoryEmoji: '🎨', points: 150 },

  // COMIDA Y POSTRES - FÁCIL (20)
  { word: 'Pizza', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Manzana', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Helado', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Hamburguesa', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Pastel', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Plátano', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Huevo', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Pan', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Café', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Queso', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Uvas', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Naranja', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Galleta', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Caramelo', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Paleta', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Limón', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Pera', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Leche', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Cereal', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },
  { word: 'Zanahoria', difficulty: 'facil', category: 'Comida', categoryEmoji: '🎨', points: 50 },

  // COMIDA Y POSTRES - MEDIA (20)
  { word: 'Taco', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Sushi', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Sandía', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Palomitas', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Chocolate', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Dona', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Fresa', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Piña', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Aguacate', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Elote', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Hot Dog', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Papas Fritas', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Pancake', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Waffle', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Cereza', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Sopa', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Ensalada', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Tamal', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Churro', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },
  { word: 'Flan', difficulty: 'media', category: 'Comida', categoryEmoji: '🎨', points: 100 },

  // COMIDA - DIFÍCIL (15)
  { word: 'Espagueti', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Paella', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Fondue', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Lasaña', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Burrito', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Quesadilla', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Ramen', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Ceviche', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Guacamole', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Tiramisú', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Crepa', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Malvavisco', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Croissant', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Pozole', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },
  { word: 'Chilaquil', difficulty: 'dificil', category: 'Comida', categoryEmoji: '🎨', points: 150 },

  // NATURALEZA Y CLIMA (30)
  { word: 'Sol', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Luna', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Estrella', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Árbol', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Flor', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Nube', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Lluvia', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Nieve', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Fuego', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Hoja', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Río', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Mar', difficulty: 'facil', category: 'Naturaleza', categoryEmoji: '🎨', points: 50 },
  { word: 'Montaña', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Playa', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Volcán', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Arcoíris', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Cascada', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Cactus', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Palmera', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Girasol', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Rosa', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Tulipán', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Hongo', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Isla', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Rayo', difficulty: 'media', category: 'Naturaleza', categoryEmoji: '🎨', points: 100 },
  { word: 'Tornado', difficulty: 'dificil', category: 'Naturaleza', categoryEmoji: '🎨', points: 150 },
  { word: 'Eclipse', difficulty: 'dificil', category: 'Naturaleza', categoryEmoji: '🎨', points: 150 },
  { word: 'Cometa', difficulty: 'dificil', category: 'Naturaleza', categoryEmoji: '🎨', points: 150 },
  { word: 'Iceberg', difficulty: 'dificil', category: 'Naturaleza', categoryEmoji: '🎨', points: 150 },
  { word: 'Aurora', difficulty: 'dificil', category: 'Naturaleza', categoryEmoji: '🎨', points: 150 },

  // LUGARES Y ARQUITECTURA (25)
  { word: 'Casa', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Escuela', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Hospital', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Tienda', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Iglesia', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Puente', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Granja', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Circo', difficulty: 'facil', category: 'Lugares', categoryEmoji: '🎨', points: 50 },
  { word: 'Castillo', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Cine', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Parque', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Faro', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Museo', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Hotel', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Estadio', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Biblioteca', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Panadería', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Restaurante', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Zoológico', difficulty: 'media', category: 'Lugares', categoryEmoji: '🎨', points: 100 },
  { word: 'Pirámide', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🎨', points: 150 },
  { word: 'Iglú', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🎨', points: 150 },
  { word: 'Rascacielos', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🎨', points: 150 },
  { word: 'Aeropuerto', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🎨', points: 150 },
  { word: 'Acuario', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🎨', points: 150 },
  { word: 'Observatorio', difficulty: 'dificil', category: 'Lugares', categoryEmoji: '🎨', points: 150 },

  // TRANSPORTE Y VEHÍCULOS (25)
  { word: 'Carro', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Avión', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Barco', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Tren', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Moto', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Autobús', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Taxi', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Camión', difficulty: 'facil', category: 'Vehículos', categoryEmoji: '🎨', points: 50 },
  { word: 'Bicicleta', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Cohete', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Helicóptero', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Patineta', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Patín', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Ambulancia', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Bomberos', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Tractor', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Velero', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Canoa', difficulty: 'media', category: 'Vehículos', categoryEmoji: '🎨', points: 100 },
  { word: 'Submarino', difficulty: 'dificil', category: 'Vehículos', categoryEmoji: '🎨', points: 150 },
  { word: 'Teleférico', difficulty: 'dificil', category: 'Vehículos', categoryEmoji: '🎨', points: 150 },
  { word: 'Globo Aéreo', difficulty: 'dificil', category: 'Vehículos', categoryEmoji: '🎨', points: 150 },
  { word: 'Trineo', difficulty: 'dificil', category: 'Vehículos', categoryEmoji: '🎨', points: 150 },
  { word: 'Crucero', difficulty: 'dificil', category: 'Vehículos', categoryEmoji: '🎨', points: 150 },
  { word: 'Grúa', difficulty: 'dificil', category: 'Vehículos', categoryEmoji: '🎨', points: 150 },
  { word: 'Tranvía', difficulty: 'dificil', category: 'Vehículos', categoryEmoji: '🎨', points: 150 },

  // MÚSICA E INSTRUMENTOS (18)
  { word: 'Tambor', difficulty: 'facil', category: 'Música', categoryEmoji: '🎨', points: 50 },
  { word: 'Piano', difficulty: 'facil', category: 'Música', categoryEmoji: '🎨', points: 50 },
  { word: 'Campana', difficulty: 'facil', category: 'Música', categoryEmoji: '🎨', points: 50 },
  { word: 'Silbato', difficulty: 'facil', category: 'Música', categoryEmoji: '🎨', points: 50 },
  { word: 'Micrófono', difficulty: 'facil', category: 'Música', categoryEmoji: '🎨', points: 50 },
  { word: 'Trompeta', difficulty: 'media', category: 'Música', categoryEmoji: '🎨', points: 100 },
  { word: 'Violín', difficulty: 'media', category: 'Música', categoryEmoji: '🎨', points: 100 },
  { word: 'Flauta', difficulty: 'media', category: 'Música', categoryEmoji: '🎨', points: 100 },
  { word: 'Maraca', difficulty: 'media', category: 'Música', categoryEmoji: '🎨', points: 100 },
  { word: 'Saxofón', difficulty: 'media', category: 'Música', categoryEmoji: '🎨', points: 100 },
  { word: 'Ukelele', difficulty: 'media', category: 'Música', categoryEmoji: '🎨', points: 100 },
  { word: 'Disco', difficulty: 'media', category: 'Música', categoryEmoji: '🎨', points: 100 },
  { word: 'Acordeón', difficulty: 'dificil', category: 'Música', categoryEmoji: '🎨', points: 150 },
  { word: 'Arpa', difficulty: 'dificil', category: 'Música', categoryEmoji: '🎨', points: 150 },
  { word: 'Xilófono', difficulty: 'dificil', category: 'Música', categoryEmoji: '🎨', points: 150 },
  { word: 'Pandereta', difficulty: 'dificil', category: 'Música', categoryEmoji: '🎨', points: 150 },
  { word: 'Metrónomo', difficulty: 'dificil', category: 'Música', categoryEmoji: '🎨', points: 150 },
  { word: 'Tocadiscos', difficulty: 'dificil', category: 'Música', categoryEmoji: '🎨', points: 150 },

  // ACCIONES Y DEPORTES (32)
  { word: 'Dormir', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Cantar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Bailar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Nadar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Correr', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Saltar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Llorar', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Reír', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Leer', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Comer', difficulty: 'facil', category: 'Acciones', categoryEmoji: '🎨', points: 50 },
  { word: 'Pescar', difficulty: 'media', category: 'Acciones', categoryEmoji: '🎨', points: 100 },
  { word: 'Cocinar', difficulty: 'media', category: 'Acciones', categoryEmoji: '🎨', points: 100 },
  { word: 'Pintar', difficulty: 'media', category: 'Acciones', categoryEmoji: '🎨', points: 100 },
  { word: 'Soplar', difficulty: 'media', category: 'Acciones', categoryEmoji: '🎨', points: 100 },
  { word: 'Fotografiar', difficulty: 'dificil', category: 'Acciones', categoryEmoji: '🎨', points: 150 },
  { word: 'Acampar', difficulty: 'dificil', category: 'Acciones', categoryEmoji: '🎨', points: 150 },
  { word: 'Malabarismo', difficulty: 'dificil', category: 'Acciones', categoryEmoji: '🎨', points: 150 },
  { word: 'Meditar', difficulty: 'dificil', category: 'Acciones', categoryEmoji: '🎨', points: 150 },
  { word: 'Futbol', difficulty: 'facil', category: 'Deportes', categoryEmoji: '🎨', points: 50 },
  { word: 'Baloncesto', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Tenis', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Patinar', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Béisbol', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Voleibol', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Golf', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Surf', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Boliche', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Karate', difficulty: 'media', category: 'Deportes', categoryEmoji: '🎨', points: 100 },
  { word: 'Boxeo', difficulty: 'dificil', category: 'Deportes', categoryEmoji: '🎨', points: 150 },
  { word: 'Esgrima', difficulty: 'dificil', category: 'Deportes', categoryEmoji: '🎨', points: 150 },
  { word: 'Escalada', difficulty: 'dificil', category: 'Deportes', categoryEmoji: '🎨', points: 150 },
  { word: 'Arquero', difficulty: 'dificil', category: 'Deportes', categoryEmoji: '🎨', points: 150 },

  // PROFESIONES Y PERSONAJES (25)
  { word: 'Doctor', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Chef', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Policía', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Bombero', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Rey', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Reina', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Payaso', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Pirata', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Astronauta', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Mago', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Detective', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Ninja', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Vaquero', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Princesa', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Robot', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Fantasma', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Extraterrestre', difficulty: 'dificil', category: 'Personajes', categoryEmoji: '🎨', points: 150 },
  { word: 'Científico', difficulty: 'dificil', category: 'Personajes', categoryEmoji: '🎨', points: 150 },
  { word: 'Piloto', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Jardinero', difficulty: 'dificil', category: 'Personajes', categoryEmoji: '🎨', points: 150 },
  { word: 'Carpintero', difficulty: 'dificil', category: 'Personajes', categoryEmoji: '🎨', points: 150 },
  { word: 'Buzo', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },
  { word: 'Caballero', difficulty: 'dificil', category: 'Personajes', categoryEmoji: '🎨', points: 150 },
  { word: 'Bruja', difficulty: 'facil', category: 'Personajes', categoryEmoji: '🎨', points: 50 },
  { word: 'Vampiro', difficulty: 'media', category: 'Personajes', categoryEmoji: '🎨', points: 100 },

  // FANTASÍA, ESPACIO Y DIVERSIÓN (35)
  { word: 'Dragón', difficulty: 'media', category: 'Fantasía', categoryEmoji: '🎨', points: 100 },
  { word: 'Unicornio', difficulty: 'media', category: 'Fantasía', categoryEmoji: '🎨', points: 100 },
  { word: 'Sirena', difficulty: 'media', category: 'Fantasía', categoryEmoji: '🎨', points: 100 },
  { word: 'Hada', difficulty: 'facil', category: 'Fantasía', categoryEmoji: '🎨', points: 50 },
  { word: 'Duende', difficulty: 'media', category: 'Fantasía', categoryEmoji: '🎨', points: 100 },
  { word: 'Genio', difficulty: 'dificil', category: 'Fantasía', categoryEmoji: '🎨', points: 150 },
  { word: 'Centauro', difficulty: 'dificil', category: 'Fantasía', categoryEmoji: '🎨', points: 150 },
  { word: 'Fénix', difficulty: 'dificil', category: 'Fantasía', categoryEmoji: '🎨', points: 150 },
  { word: 'Pegaso', difficulty: 'dificil', category: 'Fantasía', categoryEmoji: '🎨', points: 150 },
  { word: 'Varita', difficulty: 'facil', category: 'Fantasía', categoryEmoji: '🎨', points: 50 },
  { word: 'Poción', difficulty: 'media', category: 'Fantasía', categoryEmoji: '🎨', points: 100 },
  { word: 'Espada', difficulty: 'facil', category: 'Fantasía', categoryEmoji: '🎨', points: 50 },
  { word: 'Escudo', difficulty: 'facil', category: 'Fantasía', categoryEmoji: '🎨', points: 50 },
  { word: 'Tesoro', difficulty: 'media', category: 'Fantasía', categoryEmoji: '🎨', points: 100 },
  { word: 'Mapa', difficulty: 'facil', category: 'Fantasía', categoryEmoji: '🎨', points: 50 },
  { word: 'Planeta', difficulty: 'facil', category: 'Espacio', categoryEmoji: '🎨', points: 50 },
  { word: 'Saturno', difficulty: 'media', category: 'Espacio', categoryEmoji: '🎨', points: 100 },
  { word: 'Ovni', difficulty: 'facil', category: 'Espacio', categoryEmoji: '🎨', points: 50 },
  { word: 'Satélite', difficulty: 'dificil', category: 'Espacio', categoryEmoji: '🎨', points: 150 },
  { word: 'Meteorito', difficulty: 'dificil', category: 'Espacio', categoryEmoji: '🎨', points: 150 },
  { word: 'Galaxia', difficulty: 'dificil', category: 'Espacio', categoryEmoji: '🎨', points: 150 },
  { word: 'Constelación', difficulty: 'dificil', category: 'Espacio', categoryEmoji: '🎨', points: 150 },
  { word: 'Piñata', difficulty: 'media', category: 'Fiesta', categoryEmoji: '🎨', points: 100 },
  { word: 'Confeti', difficulty: 'media', category: 'Fiesta', categoryEmoji: '🎨', points: 100 },
  { word: 'Fuegos', difficulty: 'media', category: 'Fiesta', categoryEmoji: '🎨', points: 100 },
  { word: 'Máscara', difficulty: 'media', category: 'Fiesta', categoryEmoji: '🎨', points: 100 },
  { word: 'Trofeo', difficulty: 'facil', category: 'Juegos', categoryEmoji: '🎨', points: 50 },
  { word: 'Medalla', difficulty: 'facil', category: 'Juegos', categoryEmoji: '🎨', points: 50 },
  { word: 'Dado', difficulty: 'facil', category: 'Juegos', categoryEmoji: '🎨', points: 50 },
  { word: 'Ajedrez', difficulty: 'dificil', category: 'Juegos', categoryEmoji: '🎨', points: 150 },
  { word: 'Dominó', difficulty: 'media', category: 'Juegos', categoryEmoji: '🎨', points: 100 },
  { word: 'Rompecabezas', difficulty: 'dificil', category: 'Juegos', categoryEmoji: '🎨', points: 150 },
  { word: 'Papalote', difficulty: 'media', category: 'Juegos', categoryEmoji: '🎨', points: 100 },
  { word: 'Yoyo', difficulty: 'media', category: 'Juegos', categoryEmoji: '🎨', points: 100 },
  { word: 'Trompo', difficulty: 'media', category: 'Juegos', categoryEmoji: '🎨', points: 100 },

  // CUERPO Y SALUDOS (15)
  { word: 'Ojo', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Boca', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Nariz', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Oreja', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Mano', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Pie', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Diente', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Bigote', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Barba', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Cerebro', difficulty: 'media', category: 'Cuerpo', categoryEmoji: '🎨', points: 100 },
  { word: 'Esqueleto', difficulty: 'dificil', category: 'Cuerpo', categoryEmoji: '🎨', points: 150 },
  { word: 'Huella', difficulty: 'media', category: 'Cuerpo', categoryEmoji: '🎨', points: 100 },
  { word: 'Sonrisa', difficulty: 'facil', category: 'Cuerpo', categoryEmoji: '🎨', points: 50 },
  { word: 'Lágrima', difficulty: 'media', category: 'Cuerpo', categoryEmoji: '🎨', points: 100 },
  { word: 'Músculo', difficulty: 'dificil', category: 'Cuerpo', categoryEmoji: '🎨', points: 150 },

  // PAREJA Y MOMENTOS BONITOS (35)
  { word: 'Peluche', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Ramo', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Chocolates', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Selfie', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Paseo', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Cena', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Desayuno', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Película', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Canción', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Poema', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Diario', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Portarretrato', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Brindis', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Fogata', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Hamaca', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Columpio', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Carrusel', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Noria', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Malteada', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Pastelito', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Cabaña', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Chimenea', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Candil', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Pasaporte', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Boleto', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Calendario', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Carta Postal', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Sillón', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Cobija', difficulty: 'facil', category: 'Pareja', categoryEmoji: '🎨', points: 50 },
  { word: 'Cupcake', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Aniversario', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Promesa', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Medianoche', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
  { word: 'Amanecer', difficulty: 'media', category: 'Pareja', categoryEmoji: '🎨', points: 100 },
  { word: 'Recuerdo', difficulty: 'dificil', category: 'Pareja', categoryEmoji: '🎨', points: 150 },
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
            categoryEmoji: '🎨',
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
            categoryEmoji: '🎨',
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
          categoryEmoji: '🎨',
          points: 50,
        });
      }
    }
  } catch {
    // Si falla, se completa con el banco romántico
  }

  const fallbackRomance: DrawGuessWord[] = [
    { word: 'Anillo', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 50 },
    { word: 'Corazón', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 50 },
    { word: 'Beso', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 50 },
    { word: 'Abrazo', difficulty: 'facil', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 50 },
    { word: 'Picnic', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 100 },
    { word: 'Atardecer', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 100 },
    { word: 'Carta', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 100 },
    { word: 'Regalo', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 100 },
    { word: 'Flores', difficulty: 'media', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 100 },
    { word: 'Serenata', difficulty: 'dificil', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 150 },
    { word: 'Boda', difficulty: 'dificil', category: 'Nuestra Historia', categoryEmoji: '🎨', points: 150 },
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
