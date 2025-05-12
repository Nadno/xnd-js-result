import Result, { type AnyResult } from '../result';

// Define our types
interface HttpResponse<T> {
  data: T;
  headers: Record<string, string>;
  status: number;
}

interface HttpError {
  statusCode: number;
  message: string;
  isNetworkError?: boolean;
  retryable?: boolean;
}

// Http client example with Result
class HttpClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async get<T>(path: string): Promise<AnyResult<HttpResponse<T>, HttpError>> {
    return Result.tryCatchAsync<HttpResponse<T>, HttpError>(async () => {
      const response = await fetch(`${this.baseUrl}${path}`);
      
      if (!response.ok) {
        const isServerError = response.status >= 500;
        throw {
          statusCode: response.status,
          message: `HTTP error ${response.status}: ${response.statusText}`,
          retryable: isServerError, // Only retry server errors
        };
      }
      
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      return {
        data: await response.json(),
        headers,
        status: response.status
      };
    });
  }
}

// Example usage
async function main() {
  const api = new HttpClient('https://api.example.com');
  
  // Successful request
  const userResult = await api.get<{id: string; name: string}>('/users/1');
  
  // Different ways to handle the result
  if (Result.isOk(userResult)) {
    const { data, status } = userResult.data;
    console.log(`User loaded (status ${status}):`, data.name);
  }
  
  // Error handling with status code checks
  if (Result.notOk(userResult)) {
    const error = userResult.error;
    
    if (error.statusCode === 404) {
      console.log('User not found');
    } else if (error.statusCode >= 500) {
      console.log('Server error, retrying in 5 seconds...');
      // Retry logic would go here
    } else if (error.isNetworkError) {
      console.log('Network error, check your connection');
    }
  }
  
  // Chained operations example
  const processedResult = (await api.get<{items: string[]}>('/items'))
    .ok(response => response.data.items)
    .not(error => {
      // Log error and return empty list as fallback
      console.error(`Failed to get items: ${error.message}`);
      return [];
    });
  
  console.log('Items:', processedResult);
}

main().catch(console.error);
