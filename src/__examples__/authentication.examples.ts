import Result, { type AnyResult } from '../result';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

interface AuthToken {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

// Authentication error types
type AuthErrorType = 
  | 'invalid_credentials' 
  | 'account_locked'
  | 'too_many_attempts'
  | 'expired_token'
  | 'insufficient_permissions'
  | 'mfa_required';

interface AuthError {
  type: AuthErrorType;
  message: string;
  retryAllowed: boolean;
  mfaToken?: string; // For MFA challenges
}

// Authentication service using Result
class AuthenticationService {
  private users: Map<string, User> = new Map([
    ['user1', { 
      id: 'user1', 
      username: 'admin', 
      email: 'admin@example.com', 
      roles: ['admin', 'user'] 
    }],
    ['user2', { 
      id: 'user2', 
      username: 'regular', 
      email: 'user@example.com', 
      roles: ['user'] 
    }]
  ]);
  
  private failedAttempts: Map<string, number> = new Map();
  private maxAttempts = 3;
  
  // Login with credentials
  async login(
    username: string, 
    password: string
  ): Promise<AnyResult<AuthToken | string, AuthError>> {
    // Check for too many failed attempts
    const attempts = this.failedAttempts.get(username) || 0;
    if (attempts >= this.maxAttempts) {
      return Result.not({
        type: 'too_many_attempts',
        message: 'Account temporarily locked due to too many failed attempts',
        retryAllowed: false
      });
    }
    
    // Find user (simplified, no real password check)
    const user = Array.from(this.users.values())
      .find(u => u.username === username);
    
    if (!user) {
      this.recordFailedAttempt(username);
      return Result.not({
        type: 'invalid_credentials',
        message: 'Invalid username or password',
        retryAllowed: true
      });
    }
    
    // Simulate password validation (always succeeds for 'password123', fails otherwise)
    if (password !== 'password123') {
      this.recordFailedAttempt(username);
      return Result.not({
        type: 'invalid_credentials',
        message: 'Invalid username or password',
        retryAllowed: true
      });
    }
    
    // Reset failed attempts on successful login
    this.failedAttempts.delete(username);
    
    // Simulate MFA requirement for admin users
    if (user.roles.includes('admin')) {
      const mfaToken = `mfa-${Date.now()}`;
      return Result.not({
        type: 'mfa_required',
        message: 'Multi-factor authentication required',
        retryAllowed: true,
        mfaToken
      });
    }
    
    // Normal login success
    return Result.ok(this.generateToken(user));
  }
  
  // Complete MFA challenge
  async completeMfa(
    mfaToken: string, 
    code: string
  ): Promise<AnyResult<AuthToken, AuthError>> {
    // Validate MFA token (simplified)
    if (!mfaToken.startsWith('mfa-')) {
      return Result.not({
        type: 'expired_token',
        message: 'Invalid or expired MFA token',
        retryAllowed: false
      });
    }
    
    // Check code (simplified, any 6-digit code is valid)
    if (!/^\d{6}$/.test(code)) {
      return Result.not({
        type: 'invalid_credentials',
        message: 'Invalid MFA code',
        retryAllowed: true
      });
    }
    
    // Get admin user (simplification)
    const adminUser = this.users.get('user1');
    if (!adminUser) {
      return Result.not({
        type: 'invalid_credentials',
        message: 'User not found',
        retryAllowed: false
      });
    }
    
    // Success - generate token
    return Result.ok(this.generateToken(adminUser));
  }
  
  // Check if user has a specific permission
  hasPermission(
    token: string, 
    requiredRole: string
  ): AnyResult<boolean, AuthError> {
    // Validate token (simplified)
    if (!token.startsWith('jwt-')) {
      return Result.not({
        type: 'expired_token',
        message: 'Invalid or expired token',
        retryAllowed: false
      });
    }
    
    // Extract user ID from token (simplified)
    const userId = token.split('-')[1];
    const user = this.users.get(userId);
    
    if (!user) {
      return Result.not({
        type: 'invalid_credentials',
        message: 'User not found',
        retryAllowed: false
      });
    }
    
    // Check permission
    if (!user.roles.includes(requiredRole)) {
      return Result.not({
        type: 'insufficient_permissions',
        message: `User does not have the required role: ${requiredRole}`,
        retryAllowed: false
      });
    }
    
    return Result.ok(true);
  }
  
  private recordFailedAttempt(username: string): void {
    const attempts = this.failedAttempts.get(username) || 0;
    this.failedAttempts.set(username, attempts + 1);
  }
  
  private generateToken(user: User): AuthToken {
    return {
      token: `jwt-${user.id}-${Date.now()}`,
      refreshToken: `refresh-${user.id}-${Date.now()}`,
      expiresAt: Date.now() + 3600000 // 1 hour
    };
  }
}

// Usage examples
async function main() {
  const authService = new AuthenticationService();
  
  // Regular user login
  console.log('Regular user login:');
  const regularLogin = await authService.login('regular', 'password123');
  
  if (Result.isOk(regularLogin)) {
    const token = regularLogin.data;
    console.log('Login successful:', token);
    
    // Check permissions
    const canAccessUserArea = authService.hasPermission(
      (token as AuthToken).token, 
      'user'
    );
    
    const canAccessAdminArea = authService.hasPermission(
      (token as AuthToken).token, 
      'admin'
    );
    
    console.log('Can access user area:', 
      Result.isOk(canAccessUserArea) && canAccessUserArea.data);
    
    console.log('Can access admin area:', 
      Result.isOk(canAccessAdminArea) && canAccessAdminArea.data);
  }
  
  // Admin user login with MFA
  console.log('\nAdmin user login:');
  const adminLogin = await authService.login('admin', 'password123');
  
  if (Result.notOk(adminLogin)) {
    const error = adminLogin.error;
    
    if (error.type === 'mfa_required' && error.mfaToken) {
      console.log('MFA required, proceeding with code...');
      
      // Complete MFA
      const mfaResult = await authService.completeMfa(error.mfaToken, '123456');
      
      if (Result.isOk(mfaResult)) {
        console.log('MFA successful, token:', mfaResult.data);
      } else {
        console.log('MFA failed:', mfaResult.error.message);
      }
    } else {
      console.log('Login failed:', error.message);
    }
  }
  
  // Failed login
  console.log('\nFailed login attempt:');
  const failedLogin = await authService.login('admin', 'wrong-password');
  
  if (Result.notOk(failedLogin)) {
    console.log('Login failed as expected:', failedLogin.error.message);
  }
}

main().catch(console.error);
