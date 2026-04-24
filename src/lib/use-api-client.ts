/**
 * React Hook for API Client
 * 在 React 组件中使用 API 客户端
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  apiClient,
  ApiClient,
  ApiError,
  ApiInterceptor,
  ApiResponse,
  RequestConfig,
} from './api-client';

export interface UseApiClientOptions {
  /** 是否自动记录错误到全局错误处理器 */
  autoHandleErrors?: boolean;
  /** 成功回调 */
  onSuccess?: <T>(data: T) => void;
  /** 错误回调 */
  onError?: (error: ApiError) => void;
  /** 加载状态变化回调 */
  onLoadingChange?: (loading: boolean) => void;
}

/**
 * useApiClient Hook
 * 提供带加载状态和错误处理的 API 请求能力
 */
export function useApiClient(options: UseApiClientOptions = {}) {
  const { autoHandleErrors = true, onSuccess, onError, onLoadingChange } = options;
  const loadingRef = useRef(false);

  const setLoading = useCallback((loading: boolean) => {
    if (loading !== loadingRef.current) {
      loadingRef.current = loading;
      onLoadingChange?.(loading);
    }
  }, [onLoadingChange]);

  const request = useCallback(async <T = unknown>(
    config: RequestConfig
  ): Promise<ApiResponse<T> | null> => {
    setLoading(true);
    try {
      const response = await apiClient.request<T>(config);
      onSuccess?.(response.data);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      if (autoHandleErrors) {
        console.error('API Error:', apiError.message);
      }
      onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [autoHandleErrors, onError, onSuccess, setLoading]);

  const get = useCallback(<T = unknown>(
    url: string,
    config?: Partial<RequestConfig>
  ) => request<T>({ ...config, url, method: 'GET' }), [request]);

  const post = useCallback(<T = unknown>(
    url: string,
    body?: unknown,
    config?: Partial<RequestConfig>
  ) => request<T>({ ...config, url, method: 'POST', body }), [request]);

  const put = useCallback(<T = unknown>(
    url: string,
    body?: unknown,
    config?: Partial<RequestConfig>
  ) => request<T>({ ...config, url, method: 'PUT', body }), [request]);

  const deleteRequest = useCallback(<T = unknown>(
    url: string,
    config?: Partial<RequestConfig>
  ) => request<T>({ ...config, url, method: 'DELETE' }), [request]);

  const patch = useCallback(<T = unknown>(
    url: string,
    body?: unknown,
    config?: Partial<RequestConfig>
  ) => request<T>({ ...config, url, method: 'PATCH', body }), [request]);

  return {
    request,
    get,
    post,
    put,
    delete: deleteRequest,
    patch,
    client: apiClient,
  };
}

/**
 * 全局 API 错误处理器 Hook
 * 在应用根组件中使用，监听全局 API 错误
 */
export function useGlobalApiErrorHandler(
  onError: (error: ApiError) => void
) {
  const handlerRef = useRef(onError);
  handlerRef.current = onError;

  useEffect(() => {
    // 添加全局响应错误拦截器
    // 注册拦截器
    apiClient.getInterceptors().useResponse(
      (response) => response,
      (error) => {
        handlerRef.current(error);
      }
    );

    // 注意：由于拦截器在 client 实例级别管理，
    // 这里演示的是如何在组件中处理错误的模式
    return () => {
      // 清理逻辑（如需要）
    };
  }, []);
}

/**
 * 创建带拦截器的 API 客户端实例
 * 用于需要特殊配置的独立 API 客户端
 */
export function createApiClientWithInterceptors(
  interceptors: ApiInterceptor[]
): ApiClient {
  const customClient = new ApiClient();

  for (const interceptor of interceptors) {
    if (interceptor.onRequest) {
      customClient.getInterceptors().useRequest(
        interceptor.onRequest,
        interceptor.onRequestError
      );
    }
    if (interceptor.onResponse) {
      customClient.getInterceptors().useResponse(
        interceptor.onResponse,
        interceptor.onResponseError
      );
    }
  }

  return customClient;
}

export default useApiClient;
