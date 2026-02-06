// Core trading types extracted from Robinhood decompiled code

/**
 * Order side - buy or sell
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type - market, limit, stop loss, stop limit
 */
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'stop_limit';

/**
 * Order time in force
 */
export type TimeInForce = 'gfd' | 'gtc' | 'ioc' | 'opg';

/**
 * Order state
 */
export type OrderState = 
  | 'queued'
  | 'unconfirmed'
  | 'confirmed'
  | 'partially_filled'
  | 'filled'
  | 'rejected'
  | 'canceled'
  | 'failed';

/**
 * Asset type
 */
export type AssetType = 'equity' | 'crypto' | 'option' | 'future';

/**
 * Order request interface
 */
export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
  extendedHours?: boolean;
}

/**
 * Order response interface
 */
export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  averagePrice?: number;
  state: OrderState;
  createdAt: string;
  updatedAt: string;
  price?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
}

/**
 * Quote/Market data interface
 */
export interface Quote {
  symbol: string;
  lastTradePrice: number;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
  volume?: number;
  previousClose?: number;
  tradingHalted?: boolean;
  updatedAt: string;
}

/**
 * Position interface
 */
export interface Position {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  equity: number;
  percentageChange: number;
  equityChange: number;
  type: AssetType;
}

/**
 * Account information
 */
export interface Account {
  id: string;
  accountNumber: string;
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  type: string;
}

/**
 * Portfolio summary
 */
export interface Portfolio {
  account: Account;
  positions: Position[];
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  next?: string;
  previous?: string;
  results?: T[];
}

/**
 * API error interface
 */
export interface ApiError {
  code: string;
  message: string;
  detail?: string;
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'quote'
  | 'trade'
  | 'order_update'
  | 'account_update'
  | 'heartbeat';

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: string;
}
