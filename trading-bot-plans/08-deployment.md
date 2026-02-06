# Deployment Guide

## Overview

This guide covers deploying the trading bot to production environments with high availability, security, and monitoring.

## Deployment Options

### Option 1: Docker + Cloud VM

**Best for**: Single-instance deployment, cost-effective

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/
COPY .env.production ./.env

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  bot:
    build: .
    environment:
      - NODE_ENV=production
      - ROBINHOOD_AUTH_TOKEN=${ROBINHOOD_AUTH_TOKEN}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - REDIS_HOST=redis
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=trading_bot
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  redis-data:
  postgres-data:
```

**Deployment Commands**:
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop
docker-compose down

# Update
git pull
docker-compose build
docker-compose up -d
```

### Option 2: Kubernetes

**Best for**: High availability, scalability, enterprise

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-bot
  namespace: trading
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trading-bot
  template:
    metadata:
      labels:
        app: trading-bot
    spec:
      containers:
      - name: bot
        image: your-registry/trading-bot:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: ROBINHOOD_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: trading-bot-secrets
              key: robinhood-token
        - name: TELEGRAM_BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: trading-bot-secrets
              key: telegram-token
        - name: REDIS_HOST
          value: redis-service
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: trading-bot-service
  namespace: trading
spec:
  selector:
    app: trading-bot
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

```yaml
# k8s/secrets.yaml (use kubectl create secret or sealed-secrets)
apiVersion: v1
kind: Secret
metadata:
  name: trading-bot-secrets
  namespace: trading
type: Opaque
data:
  robinhood-token: <base64-encoded>
  telegram-token: <base64-encoded>
  claude-api-key: <base64-encoded>
```

**Deploy to Kubernetes**:
```bash
# Create namespace
kubectl create namespace trading

# Apply secrets
kubectl apply -f k8s/secrets.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -n trading
kubectl logs -f deployment/trading-bot -n trading
```

### Option 3: Serverless (AWS Lambda)

**Best for**: Event-driven, pay-per-use

```typescript
// src/lambda/handler.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { TradingBot } from '../bot/telegram-bot';

let bot: TradingBot;

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!bot) {
    bot = new TradingBot(
      process.env.TELEGRAM_BOT_TOKEN!,
      process.env.ROBINHOOD_AUTH_TOKEN!,
      process.env.CLAUDE_API_KEY!
    );
  }

  // Process Telegram webhook
  const update = JSON.parse(event.body!);
  await bot.processUpdate(update);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
```

```yaml
# serverless.yml
service: trading-bot

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    TELEGRAM_BOT_TOKEN: ${env:TELEGRAM_BOT_TOKEN}
    ROBINHOOD_AUTH_TOKEN: ${env:ROBINHOOD_AUTH_TOKEN}
    CLAUDE_API_KEY: ${env:CLAUDE_API_KEY}
    REDIS_HOST: ${env:REDIS_HOST}

functions:
  webhook:
    handler: dist/lambda/handler.handler
    events:
      - http:
          path: webhook
          method: post
    timeout: 30
    memorySize: 512

plugins:
  - serverless-offline
  - serverless-webpack
```

## Environment Configuration

### Production Environment Variables

```bash
# .env.production
NODE_ENV=production

# API Tokens
ROBINHOOD_AUTH_TOKEN=Bearer your_production_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
CLAUDE_API_KEY=your_claude_api_key

# Database
DATABASE_URL=postgresql://user:password@host:5432/trading_bot
REDIS_URL=redis://redis:6379

# Security
TOKEN_ENCRYPTION_KEY=your_32_byte_encryption_key
ALLOWED_USER_IDS=123456,789012

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info

# Rate Limiting
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_SECOND=10

# Features
ENABLE_CACHING=true
ENABLE_MCP=true
```

### Secrets Management

#### AWS Secrets Manager

```typescript
// src/config/secrets.ts
import { SecretsManager } from 'aws-sdk';

export class SecretsManager {
  private client: SecretsManager;

  constructor() {
    this.client = new SecretsManager({
      region: process.env.AWS_REGION,
    });
  }

  async getSecret(secretName: string): Promise<string> {
    const result = await this.client
      .getSecretValue({ SecretId: secretName })
      .promise();

    return result.SecretString!;
  }

  async loadEnvironment(): Promise<void> {
    const secrets = await this.getSecret('trading-bot/production');
    const parsed = JSON.parse(secrets);

    Object.assign(process.env, parsed);
  }
}
```

## Health Checks

```typescript
// src/health/health-check.ts
import { Express } from 'express';

export class HealthCheck {
  constructor(private app: Express) {
    this.setupEndpoints();
  }

  private setupEndpoints(): void {
    // Liveness probe
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // Readiness probe
    this.app.get('/ready', async (req, res) => {
      try {
        // Check dependencies
        await this.checkDatabase();
        await this.checkRedis();
        await this.checkExternalAPIs();

        res.status(200).json({
          status: 'ready',
          checks: {
            database: 'ok',
            redis: 'ok',
            apis: 'ok',
          },
        });
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          error: error.message,
        });
      }
    });
  }

  private async checkDatabase(): Promise<void> {
    // Check database connection
  }

  private async checkRedis(): Promise<void> {
    // Check Redis connection
  }

  private async checkExternalAPIs(): Promise<void> {
    // Check Robinhood, Telegram, Claude APIs
  }
}
```

## Monitoring and Logging

### Structured Logging

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'trading-bot' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});
```

### Metrics Collection

```typescript
// src/metrics/metrics.ts
import { Counter, Gauge, Histogram } from 'prom-client';

export class Metrics {
  // Counters
  private ordersPlaced = new Counter({
    name: 'orders_placed_total',
    help: 'Total number of orders placed',
    labelNames: ['type', 'side'],
  });

  private apiErrors = new Counter({
    name: 'api_errors_total',
    help: 'Total number of API errors',
    labelNames: ['endpoint', 'status'],
  });

  // Gauges
  private activeUsers = new Gauge({
    name: 'active_users',
    help: 'Number of active users',
  });

  // Histograms
  private apiLatency = new Histogram({
    name: 'api_latency_seconds',
    help: 'API request latency',
    labelNames: ['endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  recordOrder(type: string, side: string): void {
    this.ordersPlaced.inc({ type, side });
  }

  recordApiError(endpoint: string, status: number): void {
    this.apiErrors.inc({ endpoint, status: status.toString() });
  }

  setActiveUsers(count: number): void {
    this.activeUsers.set(count);
  }

  recordApiLatency(endpoint: string, latency: number): void {
    this.apiLatency.observe({ endpoint }, latency);
  }
}
```

### Error Tracking (Sentry)

```typescript
// src/error-tracking/sentry.ts
import * as Sentry from '@sentry/node';

export function initSentry(): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
}

export function captureException(error: Error, context?: any): void {
  Sentry.captureException(error, {
    extra: context,
  });
}
```

## Backup Strategy

```typescript
// src/backup/backup-manager.ts
export class BackupManager {
  async backupDatabase(): Promise<void> {
    // Backup PostgreSQL database
    const timestamp = new Date().toISOString();
    const filename = `backup-${timestamp}.sql`;
    
    // Execute pg_dump
    await exec(`pg_dump ${process.env.DATABASE_URL} > backups/${filename}`);
    
    // Upload to S3
    await this.uploadToS3(filename);
  }

  async backupRedis(): Promise<void> {
    // Trigger Redis BGSAVE
    await this.redis.bgsave();
  }

  private async uploadToS3(filename: string): Promise<void> {
    // Upload to S3 bucket
  }
}
```

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: your-registry/trading-bot:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          ssh production "cd /app && docker-compose pull && docker-compose up -d"
```

## Security Checklist

- [ ] Secrets stored in secure vault (not .env files in repo)
- [ ] HTTPS only for all communications
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CORS configured properly
- [ ] Authentication required for all operations
- [ ] Audit logging enabled
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Disaster recovery plan documented

## Scaling Considerations

### Horizontal Scaling

```
Load Balancer
     ├── Bot Instance 1
     ├── Bot Instance 2
     └── Bot Instance 3
           ↓
      Shared Redis
           ↓
      Shared Database
```

### Auto-scaling (Kubernetes HPA)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: trading-bot-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: trading-bot
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Maintenance

### Rolling Updates

```bash
# Zero-downtime deployment
kubectl rollout status deployment/trading-bot -n trading
kubectl set image deployment/trading-bot bot=your-registry/trading-bot:v2 -n trading
kubectl rollout status deployment/trading-bot -n trading
```

### Database Migrations

```typescript
// migrations/001_initial.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('telegram_id').unique();
    table.string('robinhood_account_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
```

## Disaster Recovery

1. **Regular Backups**: Daily automated backups of database and Redis
2. **Multi-Region**: Deploy to multiple regions for redundancy
3. **Failover Plan**: Documented failover procedures
4. **Testing**: Regular DR drills

## Cost Optimization

- Use spot instances for non-critical workloads
- Implement auto-scaling to match demand
- Cache aggressively to reduce API calls
- Use serverless for low-traffic scenarios
- Monitor and optimize resource usage

## Next Steps

1. Review [Code Examples](./09-examples.md)
2. Follow [Getting Started Guide](./10-getting-started.md)
3. Set up monitoring and alerts
4. Test disaster recovery plan
