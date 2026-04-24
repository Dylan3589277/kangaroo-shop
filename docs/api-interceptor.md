# API 拦截器实现

## 概述

为袋鼠君跨境电商站实现了统一的 API 客户端拦截器功能。

## 新增文件

### 1. `src/lib/api-client.ts`
统一 API 客户端，提供：
- **请求/响应拦截器**：可在请求发送前或响应返回后进行拦截处理
- **统一错误处理**：自动处理 HTTP 错误、网络错误、超时等
- **日志记录**：开发环境自动记录请求/响应日志
- **超时控制**：默认 30 秒超时
- **凭证管理**：默认携带 cookies

### 2. `src/lib/use-api-client.ts`
React Hook，支持在组件中使用 API 客户端：
- `useApiClient()` - 带加载状态的 API 请求
- `useGlobalApiErrorHandler()` - 全局错误处理

## 使用示例

### 基础使用

```typescript
import { apiClient } from '@/lib/api-client';

// GET 请求
const response = await apiClient.get('/api/products');
const { data, status } = response;

// POST 请求
const response = await apiClient.post('/api/orders', { items: [...] });
```

### 添加拦截器

```typescript
import { apiClient } from '@/lib/api-client';

// 请求拦截器：添加 Token
apiClient.getInterceptors().useRequest((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// 响应错误拦截器：处理 401
apiClient.getInterceptors().useResponse(
  (response) => response,
  (error) => {
    if (error.status === 401) {
      redirectToLogin();
    }
  }
);
```

### 在 React 组件中使用

```typescript
import { useApiClient } from '@/lib/use-api-client';

function ProductList() {
  const { get, loading } = useApiClient({
    onSuccess: (data) => console.log('Success:', data),
    onError: (error) => console.error('Error:', error),
  });

  useEffect(() => {
    get('/api/products');
  }, []);

  if (loading) return <div>Loading...</div>;
  // ...
}
```

## 拦截器类型

- `onRequest` - 请求发送前
- `onRequestError` - 请求发送失败
- `onResponse` - 响应成功返回
- `onResponseError` - 响应返回错误

## 默认行为

- 开发环境自动记录请求/响应日志
- 超时时间：30 秒
- 携带 credentials（cookies）
- Content-Type: application/json
