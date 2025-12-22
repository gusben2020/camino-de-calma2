
export enum UniverseType {
  GRANJA = 'GRANJA',
  FIGURAS = 'FIGURAS',
  NUMEROS = 'NUMEROS',
  FRUTAS = 'FRUTAS',
  BOSQUE = 'BOSQUE',
  HERRAMIENTAS = 'HERRAMIENTAS',
  VESTUARIO = 'VESTUARIO',
  ALEATORIO = 'ALEATORIO'
}

export enum GameType {
  DRAG = 'DRAG',
  DRIVE = 'DRIVE',
  CATCH = 'CATCH'
}

export enum WordLevel {
  COMPLETA = 1,
  SEGMENTADA = 2,
  LETRA_POR_LETRA = 3
}

export interface GameItem {
  id: string;
  name: string;
  image: string;
  color: string;
}

export interface WordPart {
  id: string; 
  parentId: string; 
  text: string;
  index: number;
}

export interface Universe {
  type: UniverseType;
  title: string;
  items: GameItem[];
  backgroundColor: string;
  illustration: string;
}

export interface GameSettings {
  userName: string;
  universe: UniverseType;
  itemCount: number;
  showWords: boolean;
  wordsAsObjects: boolean;
  voiceEnabled: boolean;
  partialVoiceEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  showMolds: boolean;
  wordLevel: WordLevel;
}

export interface Position {
  x: number;
  y: number;
}
