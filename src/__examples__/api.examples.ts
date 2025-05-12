import Result, { type AnyResult } from '../result';

// Define our types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

interface ApiError {
  code: number;
  message: string;
  details?: string;
}

// Mock API client
class UserApiClient {
  async fetchUser(id: string): Promise<User> {
    // Simulate API call
    if (id === 'invalid') {
      throw {
        code: 404,
        message: 'User not found',
        details: 'Invalid user ID provided',
      };
    }

    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      createdAt: new Date(),
    };
  }
}

// User service using Result type
class UserService {
  private api = new UserApiClient();

  async getUserById(id: string): Promise<AnyResult<User, ApiError>> {
    return Result.resolve<User, ApiError>(this.api.fetchUser(id));
  }

  async getUserRole(id: string): Promise<AnyResult<string, ApiError>> {
    return (await this.getUserById(id)).ok((user) => user.role);
  }

  async isUserAdmin(id: string): Promise<AnyResult<boolean, ApiError>> {
    return (await this.getUserById(id)).ok((user) => user.role === 'admin');
  }
}

// Usage example
async function main() {
  const userService = new UserService();

  // Example 1: Successful path
  const userResult = await userService.getUserById('123');

  // Method 1: Using match for both success and error
  await Result.match(userResult, {
    ok: (user) => console.log(`Found user: ${user.name}, role: ${user.role}`),
    not: (error) => console.error(`Error ${error.code}: ${error.message}`),
  });

  // Method 2: Using direct value or default value
  const username = userResult.defaultValue('Unknown User');
  console.log(`Username: ${username}`);

  // Method 3: Transform and use the value
  const adminStatus = (await userService.isUserAdmin('123')).defaultValue(
    false,
  );
  console.log(`Is admin: ${adminStatus ? 'Yes' : 'No'}`);

  // Example 2: Error path
  const invalidUserResult = await userService.getUserById('invalid');

  // Using action-based matching
  Result.match(Result.NOT, invalidUserResult, (error) => {
    console.error(
      `Could not retrieve user: ${error.message} (Code: ${error.code})`,
    );
    if (error.details) {
      console.error(`Additional details: ${error.details}`);
    }
  });

  // Example 3: Chaining transformations
  const roleWithMessage = (await userService.getUserRole('123'))
    .ok((role) => `User has role: ${role}`)
    .not((error) => `Could not determine role: ${error.message}`);

  console.log(roleWithMessage.defaultValue('Unknown role'));

  // Example 4: Handling errors with specific handlers
  const roleOrDefault = (await userService.getUserRole('invalid')).or(
    (error) => {
      logError(error); // Side effect
      return 'guest'; // Default value
    },
  );

  console.log(`Using role: ${roleOrDefault}`);
}

// Helper function for side effects
function logError(error: ApiError): void {
  console.error(`Error logged: [${error.code}] ${error.message}`);
}

main().catch((err) => console.error('Unhandled error:', err));
