
export interface Rackard {
  id: string;
  name: string;
  description: string;
  power: number;
  imageUrl: string;
}

export type View = 'home' | 'deck' | 'collect' | 'battle' | 'run-collect' | 'radar';