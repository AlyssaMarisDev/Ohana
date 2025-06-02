import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the base URL for API requests
const getBaseUrl = () => {
  // In development, this should point to your backend
  // You'll need to replace this with your actual backend URL
  return 'https://your-replit-domain.replit.dev';
};

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get stored auth token if available
    const token = await AsyncStorage.getItem('auth_token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session auth
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH request
  async patch(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// Query function for React Query
export const queryFn = async ({ queryKey }: { queryKey: any[] }) => {
  const [url, params] = queryKey;
  let endpoint = url;
  
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key].toString());
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }
  
  return apiClient.get(endpoint);
};