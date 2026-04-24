/**
 * API Client with Interceptor Support
 * 统一 API 客户端 - 为所有 API 请求提供拦截器功能
 */

export interface ApiInterceptor {
  /**
   * 请求拦截器 - 在请求发送前执行
   * 返回修改后的请求配置或 throw 错误取消请求
   */
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

  /**
   * 请求错误拦截器 - 当请求失败时执行
   */
  onRequestError?: (error: ApiError, config: RequestConfig) => void | Promise<void>;

  /**
   * 响应成功拦截器 - 在响应成功时执行
   */
  onResponse?: <T>(response: ApiResponse<T>, config: RequestConfig) => ApiResponse<T> | Promise<ApiResponse<T>>;

  /**
   * 响应错误拦截器 - 当响应返回错误时执行
   */
  onResponseError?: (error: ApiError, config: RequestConfig) => void | Promise<void>;
}

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 是否携带 credentials（cookies），默认 true */
  credentials?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  response?: unknown;
  isTimeout?: boolean;
  isNetworkError?: boolean;
}

type InterceptorHandler = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ErrorHandler = (error: ApiError, config: RequestConfig) => void | Promise<void>;
type ResponseHandler<T> = (response: ApiResponse<T>, config: RequestConfig) => ApiResponse<T> | Promise<ApiResponse<T>>;

/**
 * API 拦截器管理器
 */
class ApiInterceptors {
  requestInterceptors: InterceptorHandler[] = [];
  requestErrorInterceptors: ErrorHandler[] = [];
  responseInterceptors: ResponseHandler<unknown>[] = [];
  responseErrorInterceptors: ErrorHandler[] = [];

  /**
   * 添加请求拦截器
   */
  useRequest(onFulfilled: InterceptorHandler, onRejected?: ErrorHandler): void {
    this.requestInterceptors.push(onFulfilled);
    if (onRejected) this.requestErrorInterceptors.push(onRejected);
  }

  /**
   * 添加响应拦截器
   */
  useResponse<T>(onFulfilled: ResponseHandler<T>, onRejected?: ErrorHandler): void {
    this.responseInterceptors.push(onFulfilled as ResponseHandler<unknown>);
    if (onRejected) this.responseErrorInterceptors.push(onRejected);
  }
}

/**
 * 默认错误消息
 */
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'リクエストが無効です',
  401: '認証が必要です',
  403: 'アクセス権限がありません',
  404: 'リソースが見つかりません',
  408: 'リクエストがタイムアウトしました',
  409: '競合が発生しました',
  429: 'リクエストが多すぎます',
  500: 'サーバーエラーが発生しました',
  502: 'サーバーエラーが発生しました',
  503: 'サービスが一時的に利用できません',
  504: 'サーバーへの接続がタイムアウトしました',
};

/**
 * 创建标准化的 API 错误对象
 */
function createApiError(error: unknown, __config: RequestConfig): ApiError {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = __config;
  const apiError: ApiError = {
    name: 'ApiError',
    message: '不明なエラーが発生しました',
  };

  if (error instanceof Error) {
    apiError.message = error.message;
    apiError.stack = error.stack;
  }

  if ((error as Response)?.status) {
    const resp = error as Response;
    apiError.status = resp.status;
    apiError.statusText = resp.statusText || DEFAULT_ERROR_MESSAGES[resp.status] || 'エラー';
    apiError.message = apiError.statusText;
  }

  if ((error as Error)?.message === 'Failed to fetch' || (error as Error)?.message.includes('network')) {
    apiError.isNetworkError = true;
    apiError.message = 'ネットワーク接続を確認してください';
  }

  if ((error as Error)?.message === 'Timeout') {
    apiError.isTimeout = true;
    apiError.message = 'リクエストがタイムアウトしました';
  }

  return apiError;
}

/**
 * 统一 API 客户端类
 */
class ApiClient {
  private interceptors = new ApiInterceptors();
  private defaultConfig: Partial<RequestConfig> = {
    timeout: 30000,
    credentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  constructor() {
    this.setupLoggingInterceptor();
  }

  /**
   * 设置日志记录拦截器（开发环境）
   */
  private setupLoggingInterceptor(): void {
    if (process.env.NODE_ENV === 'development') {
      this.interceptors.useRequest(
        (config) => {
          console.log(`[API Request] ${config.method} ${config.url}`, {
            body: config.body,
          });
          return config;
        },
        (error) => {
          console.error(`[API Request Error]`, error);
        }
      );

      this.interceptors.useResponse(
        (response) => {
          console.log(`[API Response] ${response.status} ${response.statusText}`, {
            data: response.data,
          });
          return response;
        },
        (error) => {
          console.error(`[API Response Error] ${error.status || ''}`, error);
        }
      );
    }
  }

  /**
   * 获取拦截器实例
   */
  getInterceptors(): ApiInterceptors {
    return this.interceptors;
  }

  /**
   * 执行请求
   */
  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    const finalConfig: RequestConfig = {
      ...this.defaultConfig,
      ...config,
      headers: {
        ...this.defaultConfig.headers,
        ...config.headers,
      },
    };

    // 请求拦截
    let modifiedConfig = finalConfig;
    for (const interceptor of this.interceptors.requestInterceptors) {
      try {
        modifiedConfig = await interceptor(modifiedConfig);
      } catch (error) {
        const apiError = createApiError(error, modifiedConfig);
        for (const errorHandler of this.interceptors.requestErrorInterceptors) {
          await errorHandler(apiError, modifiedConfig);
        }
        throw apiError;
      }
    }

    // 发送请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), modifiedConfig.timeout || 30000);

    let response: Response;
    try {
      response = await fetch(modifiedConfig.url, {
        method: modifiedConfig.method,
        headers: modifiedConfig.headers,
        body: modifiedConfig.body ? JSON.stringify(modifiedConfig.body) : undefined,
        credentials: modifiedConfig.credentials ? 'include' : 'omit',
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const apiError = createApiError(error, modifiedConfig);
      for (const errorHandler of this.interceptors.requestErrorInterceptors) {
        await errorHandler(apiError, modifiedConfig);
      }
      throw apiError;
    }

    clearTimeout(timeoutId);

    // 解析响应头
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // 解析响应数据
    let data: T;
    const contentType = response.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }
    } catch {
      data = {} as T;
    }

    // 处理 HTTP 错误状态
    if (!response.ok) {
      const errorResponse = { data, status: response.status, statusText: response.statusText, headers: responseHeaders };
      for (const errorHandler of this.interceptors.responseErrorInterceptors) {
        await errorHandler(createApiError(errorResponse, modifiedConfig), modifiedConfig);
      }

      const error = createApiError(errorResponse, modifiedConfig);
      error.response = data;
      throw error;
    }

    // 响应成功拦截
    const apiResponse: ApiResponse<T> = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    };

    for (const interceptor of this.interceptors.responseInterceptors) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apiResponse.data = await (interceptor as any)(apiResponse, modifiedConfig);
      } catch (error) {
        const apiError = createApiError(error, modifiedConfig);
        for (const errorHandler of this.interceptors.responseErrorInterceptors) {
          await errorHandler(apiError, modifiedConfig);
        }
        throw apiError;
      }
    }

    return apiResponse;
  }

  /**
   * GET 请求
   */
  get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  /**
   * POST 请求
   */
  post<T = unknown>(url: string, body?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(url: string, body?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  /**
   * PATCH 请求
   */
  patch<T = unknown>(url: string, body?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body });
  }
}

// 导出单例
export const apiClient = new ApiClient();

// 导出类型
export { ApiClient };

// 默认导出
export default apiClient;
