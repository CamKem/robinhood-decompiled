import { HttpClient } from '../client/http-client';
import { 
  Quote, 
  Order, 
  OrderRequest, 
  Account, 
  Position,
  ApiResponse 
} from '@robinhood-trading/shared-types';

/**
 * Trading service for equity orders and positions
 * Based on API endpoints extracted from decompiled Robinhood Android app
 */
export class TradingService {
  constructor(private client: HttpClient) {}

  /**
   * Get quote for a symbol
   * Endpoint: GET /quotes/{symbol}/
   */
  async getQuote(symbol: string): Promise<Quote> {
    return this.client.get<Quote>(`/quotes/${symbol}/`);
  }

  /**
   * Get multiple quotes
   * Endpoint: GET /quotes/?symbols={symbols}
   */
  async getQuotes(symbols: string[]): Promise<ApiResponse<Quote>> {
    return this.client.get<ApiResponse<Quote>>(`/quotes/`, {
      params: { symbols: symbols.join(',') }
    });
  }

  /**
   * Get account information
   * Endpoint: GET /accounts/
   */
  async getAccounts(): Promise<ApiResponse<Account>> {
    return this.client.get<ApiResponse<Account>>('/accounts/');
  }

  /**
   * Get account positions
   * Endpoint: GET /positions/
   */
  async getPositions(): Promise<ApiResponse<Position>> {
    return this.client.get<ApiResponse<Position>>('/positions/');
  }

  /**
   * Place an order
   * Endpoint: POST /orders/
   */
  async placeOrder(orderRequest: OrderRequest): Promise<Order> {
    // Transform to Robinhood API format
    const payload = {
      account: process.env.ROBINHOOD_ACCOUNT_URL,
      instrument: await this.getInstrumentUrl(orderRequest.symbol),
      symbol: orderRequest.symbol,
      type: orderRequest.type,
      time_in_force: orderRequest.timeInForce,
      trigger: 'immediate',
      side: orderRequest.side,
      quantity: orderRequest.quantity,
      ...(orderRequest.price && { price: orderRequest.price }),
      ...(orderRequest.stopPrice && { stop_price: orderRequest.stopPrice }),
      ...(orderRequest.extendedHours && { extended_hours: orderRequest.extendedHours })
    };

    return this.client.post<Order>('/orders/', payload);
  }

  /**
   * Get order by ID
   * Endpoint: GET /orders/{id}/
   */
  async getOrder(orderId: string): Promise<Order> {
    return this.client.get<Order>(`/orders/${orderId}/`);
  }

  /**
   * Cancel an order
   * Endpoint: POST /orders/{id}/cancel/
   */
  async cancelOrder(orderId: string): Promise<Order> {
    return this.client.post<Order>(`/orders/${orderId}/cancel/`);
  }

  /**
   * Get order history
   * Endpoint: GET /orders/
   */
  async getOrderHistory(): Promise<ApiResponse<Order>> {
    return this.client.get<ApiResponse<Order>>('/orders/');
  }

  /**
   * Helper: Get instrument URL for a symbol
   * Endpoint: GET /instruments/?symbol={symbol}
   */
  private async getInstrumentUrl(symbol: string): Promise<string> {
    const response = await this.client.get<ApiResponse<{ url: string }>>('/instruments/', {
      params: { symbol }
    });
    
    if (!response.results || response.results.length === 0) {
      throw new Error(`Instrument not found for symbol: ${symbol}`);
    }
    
    return response.results[0].url;
  }
}
