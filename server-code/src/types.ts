export type PlayerId = string;
export type PropertyId = string;

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  cash: number;
  position: number;
  jailTurns: number;
  isBankrupt: boolean;
  properties: PropertyId[];
}

export type TileType = 'street' | 'station' | 'utility' | 'tax' | 'chance' | 'chest' | 'start' | 'jail' | 'parking' | 'police';

export interface Tile {
  id: PropertyId;
  name: string;
  type: TileType;
  price?: number;
  baseRent?: number;
  rent?: number[];       // [base, lv1, lv2, lv3, lv4, lv5]
  houseCost?: number;
  upgradeCosts?: number[]; // Cost per level [lv1, lv2, lv3, lv4, lv5]
  mortgageValue?: number;
  maxHouses?: number;
  owner?: PlayerId;
  houseCount: number;
  mortgaged: boolean;
  country?: string;      // Country group name (e.g. "India")
  flag?: string;         // Emoji flag (e.g. "🇮🇳")
  color?: string;        // Hex for UI group color
}

export interface TradeOffer {
  id: string;
  from: PlayerId;
  to: PlayerId;
  offerProperties: PropertyId[];
  offerCash: number;
  requestProperties: PropertyId[];
  requestCash: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface GameState {
  players: Record<PlayerId, Player>;
  turnOrder: PlayerId[];
  currentPlayerIndex: number;
  dice: [number, number];
  doublesCount: number;
  board: Tile[];
  state: 'waiting' | 'rolling' | 'acting' | 'auction' | 'ended' | 'turn_ended';
  lastActionLog: string[];
  tradeOffers: TradeOffer[];
  currentTurnAction?: {
    type: 'BUY_PROMPT' | 'RENT_PAID' | 'CHANCE_CARD' | 'JAILED' | 'TRADE_OFFER' | 'BANKRUPTCY_CONFIRM';
    payload?: any;
  };
}

export type GameAction =
  | { type: 'ROLL_DICE'; playerId: PlayerId }
  | { type: 'END_TURN'; playerId: PlayerId }
  | { type: 'BUY_PROPERTY'; playerId: PlayerId; propertyId: PropertyId }
  | { type: 'PASS_PROPERTY'; playerId: PlayerId }
  | { type: 'UPGRADE_HOUSE'; playerId: PlayerId; propertyId: PropertyId }
  | { type: 'MORTGAGE_PROPERTY'; playerId: PlayerId; propertyId: PropertyId }
  | { type: 'UNMORTGAGE_PROPERTY'; playerId: PlayerId; propertyId: PropertyId }
  | { type: 'DECLARE_BANKRUPTCY'; playerId: PlayerId }
  | { type: 'TRADE_OFFER'; from: PlayerId; to: PlayerId; offer: Partial<TradeOffer> }
  | { type: 'TRADE_RESPOND'; playerId: PlayerId; tradeId: string; accept: boolean };
