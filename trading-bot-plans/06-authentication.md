# Authentication Strategy

## Overview

This document outlines the authentication approach for the Robinhood trading bot, including token management, security best practices, and OAuth 2.0 implementation.

## Authentication Methods

### Method 1: Manual Token (Development)

**Recommended for**: Quick development and testing

**Process**:
1. Log into Robinhood web app (https://robinhood.com)
2. Open DevTools → Network tab
3. Make any API request (e.g., view portfolio)
4. Find request with `Authorization: Bearer ...` header
5. Copy the token
6. Add to `.env` file

```bash
# .env
ROBINHOOD_AUTH_TOKEN=Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Pros**:
- Fast setup
- No OAuth implementation needed
- Good for development

**Cons**:
- Token expires (typically 24 hours)
- Manual renewal required
- Not suitable for production

### Method 2: OAuth 2.0 Flow (Production)

**Recommended for**: Production deployment

**Process**:
1. Implement OAuth 2.0 password grant
2. Store refresh tokens securely
3. Automatic token refresh

```typescript
// src/auth/oauth-client.ts
import axios from 'axios';

export interface RobinhoodCredentials {
  username: string;
  password: string;
  mfaCode?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
}

export class RobinhoodOAuthClient {
  private readonly baseURL = 'https://api.robinhood.com';
  private readonly clientId = 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS';
  
  async login(credentials: RobinhoodCredentials): Promise<TokenResponse> {
    const deviceToken = this.generateDeviceToken();
    
    const response = await axios.post<TokenResponse>(
      `${this.baseURL}/oauth2/token/`,
      {
        grant_type: 'password',
        username: credentials.username,
        password: credentials.password,
        client_id: this.clientId,
        device_token: deviceToken,
        scope: 'internal',
        mfa_code: credentials.mfaCode,
      }
    );

    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await axios.post<TokenResponse>(
      `${this.baseURL}/oauth2/token/`,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        scope: 'internal',
      }
    );

    return response.data;
  }

  async challengeMFA(challengeId: string, code: string): Promise<void> {
    await axios.post(`${this.baseURL}/challenge/${challengeId}/respond/`, {
      response: code,
    });
  }

  private generateDeviceToken(): string {
    // Generate a unique device token
    // This should be consistent per device/installation
    return crypto.randomUUID();
  }
}
```

## Token Storage

### Development: Environment Variables

```bash
# .env
ROBINHOOD_USERNAME=user@example.com
ROBINHOOD_PASSWORD=your_password
ROBINHOOD_ACCESS_TOKEN=
ROBINHOOD_REFRESH_TOKEN=
```

### Production: Secure Vault

```typescript
// Using AWS Secrets Manager
import { SecretsManager } from 'aws-sdk';

export class SecureTokenStore {
  private secretsManager: SecretsManager;

  constructor() {
    this.secretsManager = new SecretsManager({
      region: process.env.AWS_REGION,
    });
  }

  async getToken(userId: string): Promise<TokenResponse> {
    const result = await this.secretsManager
      .getSecretValue({ SecretId: `robinhood-token-${userId}` })
      .promise();

    return JSON.parse(result.SecretString!);
  }

  async saveToken(userId: string, token: TokenResponse): Promise<void> {
    await this.secretsManager
      .putSecretValue({
        SecretId: `robinhood-token-${userId}`,
        SecretString: JSON.stringify(token),
      })
      .promise();
  }
}
```

## Multi-User Authentication

For bots serving multiple users:

```typescript
// src/auth/user-auth-manager.ts
export class UserAuthManager {
  private tokenStore: Map<string, TokenResponse> = new Map();
  private oauthClient: RobinhoodOAuthClient;

  constructor() {
    this.oauthClient = new RobinhoodOAuthClient();
  }

  async authenticateUser(
    userId: string,
    credentials: RobinhoodCredentials
  ): Promise<void> {
    const token = await this.oauthClient.login(credentials);
    this.tokenStore.set(userId, token);
    
    // Persist to secure storage
    await this.persistToken(userId, token);
  }

  async getToken(userId: string): Promise<string> {
    let token = this.tokenStore.get(userId);
    
    if (!token) {
      // Load from secure storage
      token = await this.loadToken(userId);
    }

    // Check expiration
    if (this.isTokenExpired(token)) {
      token = await this.refreshUserToken(userId, token.refresh_token);
    }

    return token.access_token;
  }

  private async refreshUserToken(
    userId: string,
    refreshToken: string
  ): Promise<TokenResponse> {
    const newToken = await this.oauthClient.refreshToken(refreshToken);
    this.tokenStore.set(userId, newToken);
    await this.persistToken(userId, newToken);
    return newToken;
  }

  private isTokenExpired(token: TokenResponse): boolean {
    // Implementation
    return false;
  }

  private async persistToken(
    userId: string,
    token: TokenResponse
  ): Promise<void> {
    // Save to database or secrets manager
  }

  private async loadToken(userId: string): Promise<TokenResponse> {
    // Load from database or secrets manager
    throw new Error('Token not found');
  }
}
```

## Security Best Practices

### 1. Never Commit Credentials

```gitignore
# .gitignore
.env
.env.local
.env.*.local
secrets/
*.key
*.pem
```

### 2. Encrypt Tokens at Rest

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class TokenEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(encryptionKey: string) {
    // Derive key from password
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 3. Implement Rate Limiting on Auth Endpoints

```typescript
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: 'Too many login attempts, please try again later',
});
```

### 4. Use HTTPS Only

```typescript
// Ensure all API calls use HTTPS
const client = axios.create({
  baseURL: 'https://api.robinhood.com',
  // Reject unauthorized certificates in production
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  }),
});
```

### 5. Implement Token Rotation

```typescript
export class TokenRotationManager {
  private rotationInterval = 12 * 60 * 60 * 1000; // 12 hours

  startRotation(userId: string): void {
    setInterval(async () => {
      try {
        await this.rotateToken(userId);
      } catch (error) {
        console.error('Token rotation failed:', error);
      }
    }, this.rotationInterval);
  }

  private async rotateToken(userId: string): Promise<void> {
    // Refresh token proactively before expiration
    const currentToken = await this.getToken(userId);
    const newToken = await this.refreshToken(currentToken.refresh_token);
    await this.saveToken(userId, newToken);
  }
}
```

## MFA Handling

```typescript
export class MFAHandler {
  async handleMFAChallenge(
    challenge: MFAChallenge,
    getTelegramCode: () => Promise<string>
  ): Promise<string> {
    if (challenge.type === 'sms') {
      // Wait for SMS code via Telegram
      return await getTelegramCode();
    } else if (challenge.type === 'app') {
      // Wait for authenticator app code
      return await getTelegramCode();
    }
    throw new Error(`Unsupported MFA type: ${challenge.type}`);
  }
}

interface MFAChallenge {
  type: 'sms' | 'app';
  id: string;
}
```

## Telegram User Verification

```typescript
export class TelegramAuthMiddleware {
  private allowedUsers: Set<string>;

  constructor(allowedUserIds: string[]) {
    this.allowedUsers = new Set(allowedUserIds);
  }

  async verify(ctx: Context, next: () => Promise<void>): Promise<void> {
    const userId = ctx.from?.id.toString();
    
    if (!userId || !this.allowedUsers.has(userId)) {
      await ctx.reply('❌ Unauthorized. Please contact the admin.');
      return;
    }

    await next();
  }
}
```

## Configuration Example

```typescript
// config/auth.config.ts
export const authConfig = {
  // OAuth
  clientId: process.env.ROBINHOOD_CLIENT_ID,
  
  // Token settings
  tokenRefreshBuffer: 5 * 60, // Refresh 5 min before expiry
  tokenRotationInterval: 12 * 60 * 60 * 1000, // 12 hours
  
  // Security
  encryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
  allowedTelegramUsers: process.env.ALLOWED_USER_IDS?.split(',') || [],
  
  // Storage
  useSecureVault: process.env.NODE_ENV === 'production',
  vaultProvider: 'aws-secrets-manager', // or 'hashicorp-vault'
};
```

## Monitoring and Alerts

```typescript
export class AuthMonitor {
  async logAuthEvent(event: AuthEvent): Promise<void> {
    // Log to monitoring service
    console.log(`Auth Event: ${event.type} for user ${event.userId}`);
    
    if (event.type === 'failed_login') {
      // Alert on multiple failed attempts
      await this.checkForBruteForce(event.userId);
    }
  }

  private async checkForBruteForce(userId: string): Promise<void> {
    // Implementation
  }
}

interface AuthEvent {
  type: 'login' | 'logout' | 'refresh' | 'failed_login';
  userId: string;
  timestamp: Date;
  ip?: string;
}
```

## Next Steps

1. Implement [Caching and Rate Limiting](./07-caching-rate-limiting.md)
2. Review [Deployment Strategy](./08-deployment.md)
3. Check [Examples](./09-examples.md)
