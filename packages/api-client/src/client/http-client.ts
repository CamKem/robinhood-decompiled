import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger, retry } from '@robinhood-trading/utils';
import { ApiError, ApiResponse } from '@robinhood-trading/shared-types';

/**
 * Base HTTP client for Robinhood API
 * Handles authentication, retry logic, and error handling
 */
export class HttpClient {
  private axios: AxiosInstance;
  private logger: Logger;

  constructor(
    baseURL: string = 'https://api.robinhood.com',
    authToken?: string
  ) {
    this.logger = new Logger('http-client');
    
    this.axios = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': authToken })
      },
      timeout: 30000
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        this.logger.debug('API Request', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        this.logger.debug('API Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        const apiError: ApiError = {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.response?.data?.message || error.message,
          detail: error.response?.data?.detail
        };
        
        this.logger.error('API error', error, apiError);
        return Promise.reject(apiError);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return retry(async () => {
      const response = await this.axios.get<T>(url, config);
      return response.data;
    });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return retry(async () => {
      const response = await this.axios.post<T>(url, data, config);
      return response.data;
    });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return retry(async () => {
      const response = await this.axios.put<T>(url, data, config);
      return response.data;
    });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return retry(async () => {
      const response = await this.axios.delete<T>(url, config);
      return response.data;
    });
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return retry(async () => {
      const response = await this.axios.patch<T>(url, data, config);
      return response.data;
    });
  }
}
