// Global Monopoly Board Data — 8 Countries, 18 Cities
// 5 house levels with escalating costs
// Rent formula: base = 10% price, level n rent = floor(base * (1 + 0.75n))
// House cost per level: level 1-2 = 50% price, level 3-4 = 75% price, level 5 = 100% price
// Mortgage value = 50% price

export interface Tile {
    id: string;
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
}

function makeCity(id: string, name: string, price: number, country: string, flag: string, color: string): Tile {
    const base = Math.floor(price * 0.10);
    const baseCost = Math.floor(price * 0.50);
    return {
        id, name, type: 'street', price,
        baseRent: base,
        rent: [
            base,                            // Level 0 — no houses
            Math.floor(base * 1.75),         // Level 1
            Math.floor(base * 2.50),         // Level 2
            Math.floor(base * 3.50),         // Level 3
            Math.floor(base * 5.00),         // Level 4
            Math.floor(base * 7.50),         // Level 5 (hotel)
        ],
        houseCost: baseCost,
        upgradeCosts: [
            baseCost,                         // Level 1 cost (50% of price)
            baseCost,                         // Level 2 cost (50% of price)
            Math.floor(price * 0.75),         // Level 3 cost (75% of price)
            Math.floor(price * 0.75),         // Level 4 cost (75% of price)
            price,                            // Level 5 cost (100% of price)
        ],
        mortgageValue: Math.floor(price * 0.50),
        maxHouses: 5,
        color, country, flag
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

export const SERVER_CITIES: Tile[] = [
    // ═══ BOTTOM ROW (0–10) ═══
    { id: 't0', name: 'GO', type: 'start' },
    makeCity('t1', 'Bangalore', 140, 'India', '🇮🇳', INDIA),
    { id: 't2', name: 'Community Chest', type: 'chest' },
    makeCity('t3', 'Delhi', 160, 'India', '🇮🇳', INDIA),
    { id: 't4', name: 'Income Tax', type: 'tax', price: 200 },
    { id: 't5', name: 'Mumbai Airport', type: 'station', price: 200 },
    makeCity('t6', 'Rio', 180, 'Brazil', '🇧🇷', BRAZIL),
    { id: 't7', name: 'Chance', type: 'chance' },
    makeCity('t8', 'São Paulo', 200, 'Brazil', '🇧🇷', BRAZIL),
    makeCity('t9', 'Mumbai', 180, 'India', '🇮🇳', INDIA),
    { id: 't10', name: 'Jail', type: 'jail' },

    // ═══ LEFT COLUMN (11–19) ═══
    makeCity('t11', 'Abu Dhabi', 250, 'UAE', '🇦🇪', UAE),
    { id: 't12', name: 'Electric Co', type: 'utility', price: 150 },
    makeCity('t13', 'Dubai', 300, 'UAE', '🇦🇪', UAE),
    { id: 't14', name: 'Community Chest', type: 'chest' },
    { id: 't15', name: 'CDG Airport', type: 'station', price: 200 },
    makeCity('t16', 'Lyon', 260, 'France', '🇫🇷', FRANCE),
    { id: 't17', name: 'Chance', type: 'chance' },
    makeCity('t18', 'Paris', 320, 'France', '🇫🇷', FRANCE),
    makeCity('t19', 'Manchester', 380, 'UK', '🇬🇧', UK),
    { id: 't20', name: 'Free Parking', type: 'parking' },

    // ═══ TOP ROW (21–29) ═══
    makeCity('t21', 'London', 450, 'UK', '🇬🇧', UK),
    { id: 't22', name: 'Community Chest', type: 'chest' },
    makeCity('t23', 'Osaka', 380, 'Japan', '🇯🇵', JAPAN),
    { id: 't24', name: 'Narita Airport', type: 'station', price: 200 },
    makeCity('t25', 'Tokyo', 450, 'Japan', '🇯🇵', JAPAN),
    { id: 't26', name: 'Chance', type: 'chance' },
    makeCity('t27', 'Beijing', 600, 'China', '🇨🇳', CHINA),
    makeCity('t28', 'Shanghai', 650, 'China', '🇨🇳', CHINA),
    { id: 't29', name: 'Water Works', type: 'utility', price: 150 },
    { id: 't30', name: 'Go To Jail', type: 'police' },

    // ═══ RIGHT COLUMN (31–39) ═══
    makeCity('t31', 'Chicago', 550, 'USA', '🇺🇸', USA),
    { id: 't32', name: 'Community Chest', type: 'chest' },
    makeCity('t33', 'Los Angeles', 600, 'USA', '🇺🇸', USA),
    { id: 't34', name: 'Chance', type: 'chance' },
    { id: 't35', name: 'JFK Airport', type: 'station', price: 200 },
    makeCity('t36', 'New York', 700, 'USA', '🇺🇸', USA),
    { id: 't37', name: 'Luxury Tax', type: 'tax', price: 100 },
    { id: 't38', name: 'Chance', type: 'chance' },
    { id: 't39', name: 'Community Chest', type: 'chest' },
];
