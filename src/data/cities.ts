// Client-side city data — mirrors server boardData.ts with images
export interface City {
  id: number;
  name: string;
  type: string;
  price?: number;
  baseRent?: number;
  rent?: number[];
  houseCost?: number;
  upgradeCosts?: number[];
  mortgageValue?: number;
  maxHouses?: number;
  color?: string;
  country?: string;
  flag?: string;
  image?: string;
  // Dynamic (set by server sync)
  owner?: string;
  ownerColor?: string;
  houseCount?: number;
  mortgaged?: boolean;
  serverId?: string;
}

function makeCity(id: number, name: string, price: number, country: string, flag: string, color: string): City {
  const base = Math.floor(price * 0.10);
  const baseCost = Math.floor(price * 0.50);
  return {
    id, name, type: 'street', price,
    baseRent: base,
    rent: [
      base,
      Math.floor(base * 1.75),
      Math.floor(base * 2.50),
      Math.floor(base * 3.50),
      Math.floor(base * 5.00),
      Math.floor(base * 7.50),
    ],
    houseCost: baseCost,
    upgradeCosts: [
      baseCost,
      baseCost,
      Math.floor(price * 0.75),
      Math.floor(price * 0.75),
      price,
    ],
    mortgageValue: Math.floor(price * 0.50),
    maxHouses: 5,
    color, country, flag,
    image: `https://picsum.photos/300/200?random=${id}`
  };
}

// Country Colors
const INDIA = '#FF6B35';
const BRAZIL = '#009739';
const UAE = '#C8963E';
const FRANCE = '#0055A4';
const UK = '#8B2252';
const JAPAN = '#BC002D';
const CHINA = '#DE2910';
const USA = '#3C3B6E';

export const CITIES: City[] = [
  // ═══ BOTTOM ROW (0–10) ═══
  { id: 0, name: 'GO', type: 'start' },
  makeCity(1, 'Bangalore', 140, 'India', '🇮🇳', INDIA),
  { id: 2, name: 'Community Chest', type: 'chest' },
  makeCity(3, 'Delhi', 160, 'India', '🇮🇳', INDIA),
  { id: 4, name: 'Income Tax', type: 'tax', price: 200 },
  { id: 5, name: 'Mumbai Airport', type: 'station', price: 200, image: `https://picsum.photos/300/200?random=5` },
  makeCity(6, 'Rio', 180, 'Brazil', '🇧🇷', BRAZIL),
  { id: 7, name: 'Chance', type: 'chance' },
  makeCity(8, 'São Paulo', 200, 'Brazil', '🇧🇷', BRAZIL),
  makeCity(9, 'Mumbai', 180, 'India', '🇮🇳', INDIA),
  { id: 10, name: 'Jail', type: 'jail' },

  // ═══ LEFT COLUMN (11–19) ═══
  makeCity(11, 'Abu Dhabi', 250, 'UAE', '🇦🇪', UAE),
  { id: 12, name: 'Electric Co', type: 'utility', price: 150, image: `https://picsum.photos/300/200?random=12` },
  makeCity(13, 'Dubai', 300, 'UAE', '🇦🇪', UAE),
  { id: 14, name: 'Community Chest', type: 'chest' },
  { id: 15, name: 'CDG Airport', type: 'station', price: 200, image: `https://picsum.photos/300/200?random=15` },
  makeCity(16, 'Lyon', 260, 'France', '🇫🇷', FRANCE),
  { id: 17, name: 'Chance', type: 'chance' },
  makeCity(18, 'Paris', 320, 'France', '🇫🇷', FRANCE),
  makeCity(19, 'Manchester', 380, 'UK', '🇬🇧', UK),
  { id: 20, name: 'Free Parking', type: 'parking' },

  // ═══ TOP ROW (21–29) ═══
  makeCity(21, 'London', 450, 'UK', '🇬🇧', UK),
  { id: 22, name: 'Community Chest', type: 'chest' },
  makeCity(23, 'Osaka', 380, 'Japan', '🇯🇵', JAPAN),
  { id: 24, name: 'Narita Airport', type: 'station', price: 200, image: `https://picsum.photos/300/200?random=24` },
  makeCity(25, 'Tokyo', 450, 'Japan', '🇯🇵', JAPAN),
  { id: 26, name: 'Chance', type: 'chance' },
  makeCity(27, 'Beijing', 600, 'China', '🇨🇳', CHINA),
  makeCity(28, 'Shanghai', 650, 'China', '🇨🇳', CHINA),
  { id: 29, name: 'Water Works', type: 'utility', price: 150, image: `https://picsum.photos/300/200?random=29` },
  { id: 30, name: 'Go To Jail', type: 'police' },

  // ═══ RIGHT COLUMN (31–39) ═══
  makeCity(31, 'Chicago', 550, 'USA', '🇺🇸', USA),
  { id: 32, name: 'Community Chest', type: 'chest' },
  makeCity(33, 'Los Angeles', 600, 'USA', '🇺🇸', USA),
  { id: 34, name: 'Chance', type: 'chance' },
  { id: 35, name: 'JFK Airport', type: 'station', price: 200, image: `https://picsum.photos/300/200?random=35` },
  makeCity(36, 'New York', 700, 'USA', '🇺🇸', USA),
  { id: 37, name: 'Luxury Tax', type: 'tax', price: 100 },
  { id: 38, name: 'Chance', type: 'chance' },
  { id: 39, name: 'Community Chest', type: 'chest' },
];
