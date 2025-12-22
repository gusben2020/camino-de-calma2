
import React from 'react';
import { UniverseType, Universe, WordLevel, GameSettings } from './types';

const BASE_UNIVERSES: Record<string, Universe> = {
  [UniverseType.GRANJA]: {
    type: UniverseType.GRANJA,
    title: 'La Granja',
    backgroundColor: '#f0fdf4',
    illustration: 'https://picsum.photos/seed/farm/800/600',
    items: [
      { id: 'vaca', name: 'VACA', image: '🐄', color: '#fefce8' },
      { id: 'cerdo', name: 'CERDO', image: '🐷', color: '#fdf2f8' },
      { id: 'gallina', name: 'GALLINA', image: '🐔', color: '#fff7ed' },
      { id: 'oveja', name: 'OVEJA', image: '🐑', color: '#f8fafc' },
      { id: 'caballo', name: 'CABALLO', image: '🐎', color: '#fef3c7' },
      { id: 'pato', name: 'PATO', image: '🦆', color: '#fffbeb' },
      { id: 'tractor', name: 'TRACTOR', image: '🚜', color: '#fef2f2' },
      { id: 'pajarito', name: 'PAJARITO', image: '🐦', color: '#eff6ff' },
      { id: 'sol', name: 'SOL', image: '☀️', color: '#fff7ed' },
      { id: 'arbol', name: 'ÁRBOL', image: '🌳', color: '#f0fdf4' },
      { id: 'flor', name: 'FLOR', image: '🌸', color: '#fdf2f8' },
      { id: 'nube', name: 'NUBE', image: '☁️', color: '#f8fafc' },
    ]
  },
  [UniverseType.FIGURAS]: {
    type: UniverseType.FIGURAS,
    title: 'Figuras',
    backgroundColor: '#eff6ff',
    illustration: 'https://picsum.photos/seed/shapes/800/600',
    items: [
      { id: 'circulo', name: 'CÍRCULO', image: '⭕', color: '#fee2e2' },
      { id: 'cuadrado', name: 'CUADRADO', image: '⏹️', color: '#dcfce7' },
      { id: 'triangulo', name: 'TRIÁNGULO', image: '🔼', color: '#fef9c3' },
      { id: 'estrella', name: 'ESTRELLA', image: '⭐', color: '#fae8ff' },
      { id: 'rombo', name: 'ROMBO', image: '💎', color: '#e0e7ff' },
      { id: 'hexagono', name: 'HEXÁGONO', image: '⬢', color: '#fef3c7' },
      { id: 'corazon', name: 'CORAZÓN', image: '❤️', color: '#ffe4e6' },
      { id: 'luna', name: 'LUNA', image: '🌙', color: '#f1f5f9' },
      { id: 'pentagono', name: 'PENTÁGONO', image: '⬟', color: '#f0fdf4' },
      { id: 'ovalo', name: 'ÓVALO', image: '🥚', color: '#fffbeb' },
      { id: 'cruz', name: 'CRUZ', image: '➕', color: '#fdf2f8' },
      { id: 'rayo', name: 'RAYO', image: '⚡', color: '#fffbeb' },
    ]
  },
  [UniverseType.NUMEROS]: {
    type: UniverseType.NUMEROS,
    title: 'Números',
    backgroundColor: '#faf5ff',
    illustration: 'https://picsum.photos/seed/numbers/800/600',
    items: [
      { id: 'uno', name: 'UNO', image: '1️⃣', color: '#f0fdf4' },
      { id: 'dos', name: 'DOS', image: '2️⃣', color: '#eff6ff' },
      { id: 'tres', name: 'TRES', image: '3️⃣', color: '#fef2f2' },
      { id: 'cuatro', name: 'CUATRO', image: '4️⃣', color: '#fdf2f8' },
      { id: 'cinco', name: 'CINCO', image: '5️⃣', color: '#fef3c7' },
      { id: 'seis', name: 'SEIS', image: '6️⃣', color: '#fff7ed' },
      { id: 'siete', name: 'SIETE', image: '7️⃣', color: '#ecfdf5' },
      { id: 'ocho', name: 'OCHO', image: '8️⃣', color: '#e0e7ff' },
      { id: 'nueve', name: 'NUEVE', image: '9️⃣', color: '#f5f3ff' },
      { id: 'diez', name: 'DIEZ', image: '🔟', color: '#fff1f2' },
      { id: 'cero', name: 'CERO', image: '0️⃣', color: '#f8fafc' },
      { id: 'mas', name: 'MÁS', image: '➕', color: '#f0fdfa' },
    ]
  },
  [UniverseType.FRUTAS]: {
    type: UniverseType.FRUTAS,
    title: 'Frutas',
    backgroundColor: '#fffbeb',
    illustration: 'https://picsum.photos/seed/fruits/800/600',
    items: [
      { id: 'manzana', name: 'MANZANA', image: '🍎', color: '#fee2e2' },
      { id: 'banana', name: 'BANANA', image: '🍌', color: '#fef9c3' },
      { id: 'pera', name: 'PERA', image: '🍐', color: '#f0fdf4' },
      { id: 'uva', name: 'UVA', image: '🍇', color: '#f5f3ff' },
      { id: 'naranja', name: 'NARANJA', image: '🍊', color: '#fff7ed' },
      { id: 'frutilla', name: 'FRUTILLA', image: '🍓', color: '#fff1f2' },
      { id: 'sandia', name: 'SANDÍA', image: '🍉', color: '#f0fdf4' },
      { id: 'cereza', name: 'CEREZA', image: '🍒', color: '#fef2f2' },
      { id: 'pina', name: 'PIÑA', image: '🍍', color: '#fffbeb' },
      { id: 'kiwi', name: 'KIWI', image: '🥝', color: '#f7fee7' },
      { id: 'limon', name: 'LIMÓN', image: '🍋', color: '#fefce8' },
      { id: 'durazno', name: 'DURAZNO', image: '🍑', color: '#fff7ed' },
    ]
  },
  [UniverseType.BOSQUE]: {
    type: UniverseType.BOSQUE,
    title: 'El Bosque',
    backgroundColor: '#ecfdf5',
    illustration: 'https://picsum.photos/seed/forest/800/600',
    items: [
      { id: 'pino', name: 'PINO', image: '🌲', color: '#f0fdf4' },
      { id: 'oso', name: 'OSO', image: '🐻', color: '#fef3c7' },
      { id: 'conejo', name: 'CONEJO', image: '🐰', color: '#f8fafc' },
      { id: 'zorro', name: 'ZORRO', image: '🦊', color: '#fff7ed' },
      { id: 'hongo', name: 'HONGO', image: '🍄', color: '#fef2f2' },
      { id: 'ardilla', name: 'ARDILLA', image: '🐿️', color: '#fefce8' },
      { id: 'buho', name: 'BÚHO', image: '🦉', color: '#f5f3ff' },
      { id: 'ciervo', name: 'CIERVO', image: '🦌', color: '#fffbeb' },
      { id: 'lobo', name: 'LOBO', image: '🐺', color: '#f1f5f9' },
      { id: 'abeja', name: 'ABEJA', image: '🐝', color: '#fef9c3' },
      { id: 'mariposa', name: 'MARIPOSA', image: '🦋', color: '#eff6ff' },
      { id: 'rana', name: 'RANA', image: '🐸', color: '#ecfdf5' },
    ]
  },
  [UniverseType.HERRAMIENTAS]: {
    type: UniverseType.HERRAMIENTAS,
    title: 'Herramientas',
    backgroundColor: '#f1f5f9',
    illustration: 'https://picsum.photos/seed/tools/800/600',
    items: [
      { id: 'martillo', name: 'MARTILLO', image: '🔨', color: '#f8fafc' },
      { id: 'serrucho', name: 'SERRUCHO', image: '🪚', color: '#f8fafc' },
      { id: 'llave', name: 'LLAVE', image: '🔧', color: '#f8fafc' },
      { id: 'destornillador', name: 'DESTORNILLADOR', image: '🪛', color: '#f8fafc' },
      { id: 'pinza', name: 'PINZA', image: '✂️', color: '#f8fafc' },
      { id: 'metro', name: 'METRO', image: '📏', color: '#f8fafc' },
      { id: 'taladro', name: 'TALADRO', image: '⚙️', color: '#f8fafc' },
      { id: 'clavo', name: 'CLAVO', image: '📍', color: '#f8fafc' },
      { id: 'tuerca', name: 'TUERCA', image: '🔩', color: '#f8fafc' },
      { id: 'casco', name: 'CASCO', image: '⛑️', color: '#f8fafc' },
      { id: 'pala', name: 'PALA', image: '⛏️', color: '#f8fafc' },
      { id: 'carretilla', name: 'CARRETILLA', image: '🛒', color: '#f8fafc' },
    ]
  },
  [UniverseType.VESTUARIO]: {
    type: UniverseType.VESTUARIO,
    title: 'Vestuario',
    backgroundColor: '#fff1f2',
    illustration: 'https://picsum.photos/seed/clothing/800/600',
    items: [
      { id: 'remera', name: 'REMERA', image: '👕', color: '#ffffff' },
      { id: 'pantalon', name: 'PANTALÓN', image: '👖', color: '#ffffff' },
      { id: 'gorra', name: 'GORRA', image: '🧢', color: '#ffffff' },
      { id: 'zapato', name: 'ZAPATO', image: '👟', color: '#ffffff' },
      { id: 'media', name: 'MEDIA', image: '🧦', color: '#ffffff' },
      { id: 'campera', name: 'CAMPERA', image: '🧥', color: '#ffffff' },
      { id: 'bufanda', name: 'BUFANDA', image: '🧣', color: '#ffffff' },
      { id: 'guante', name: 'GUANTE', image: '🧤', color: '#ffffff' },
      { id: 'anteojos', name: 'ANTEOJOS', image: '🕶️', color: '#ffffff' },
      { id: 'reloj', name: 'RELOJ', image: '⌚', color: '#ffffff' },
      { id: 'mochila', name: 'MOCHILA', image: '🎒', color: '#ffffff' },
      { id: 'pollera', name: 'POLLERA', image: '👗', color: '#ffffff' },
    ]
  },
};

// Generar el Universo Aleatorio combinando todos los demás
const allItems = Object.values(BASE_UNIVERSES).flatMap(u => u.items);
// Mezcla simple para el universo aleatorio inicial
const shuffledAllItems = [...allItems].sort(() => Math.random() - 0.5);

export const UNIVERSES: Record<UniverseType, Universe> = {
  ...BASE_UNIVERSES,
  [UniverseType.ALEATORIO]: {
    type: UniverseType.ALEATORIO,
    title: 'Mundo Mágico',
    backgroundColor: '#f5f3ff', // Un tono violeta mágico
    illustration: 'https://picsum.photos/seed/magic/800/600',
    items: shuffledAllItems
  }
} as Record<UniverseType, Universe>;

export const DEFAULT_SETTINGS: GameSettings = {
  userName: 'SANTI',
  universe: UniverseType.GRANJA,
  itemCount: 4,
  showWords: true,
  wordsAsObjects: false,
  voiceEnabled: true,
  partialVoiceEnabled: false,
  musicEnabled: false,
  musicVolume: 0.3,
  showMolds: true,
  wordLevel: WordLevel.COMPLETA,
};
