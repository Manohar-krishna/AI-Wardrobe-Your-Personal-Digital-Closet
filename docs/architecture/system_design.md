# System Design - AI Wardrobe

## 1. Overview

AI Wardrobe is a cloud-native, microservices-based application that provides intelligent wardrobe management with AI-powered categorization, outfit generation, and analytics.

### Design Goals
- **Scalability**: Handle growing user base and wardrobe items
- **Performance**: Real-time AI processing with <2s response times
- **Reliability**: 99.9% uptime with fault tolerance
- **Security**: End-to-end encryption for user data
- **Extensibility**: Plugin architecture for new integrations

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web App  │  │ Mobile   │  │ Browser  │  │  API     │   │
│  │ (React)  │  │ (Native) │  │ Extension│  │  Clients │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                          │
        ┌─────────────────▼───────────────────────┐
        │      API Gateway / Load Balancer         │
        │     (NGINX / AWS ALB / Kong)             │
        └─────────────────┬───────────────────────┘
                          │
        ┌─────────────────▼───────────────────────┐
        │          Service Mesh Layer              │
        │            (Istio / Envoy)               │
        └─────────────────┬───────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌───▼──────┐      ┌───────▼────┐      ┌────────▼────┐
│  Auth    │      │  Wardrobe  │      │   Outfit    │
│ Service  │      │  Service   │      │  Generator  │
└───┬──────┘      └───┬────────┘      └────┬────────┘
    │                 │                     │
┌───▼──────┐      ┌───▼────────┐      ┌────▼────────┐
│  User    │      │   Image    │      │  Analytics  │
│ Service  │      │  Service   │      │   Service   │
└───┬──────┘      └───┬────────┘      └────┬────────┘
    │                 │                     │
┌───▼──────┐      ┌───▼────────┐      ┌────▼────────┐
│Integration│      │    AI      │      │Notification │
│ Service  │      │  Service   │      │  Service    │
└───┬──────┘      └───┬────────┘      └────┬────────┘
    │                 │                     │
    └─────────────────┴─────────────────────┘
                      │
    ┌─────────────────┴─────────────────────┐
    │                                       │
┌───▼──────┐      ┌──────────┐      ┌──────▼──────┐
│PostgreSQL│      │  Redis   │      │   S3/Blob   │
│ (Primary)│      │  Cache   │      │   Storage   │
└──────────┘      └──────────┘      └─────────────┘
    │
┌───▼──────┐      ┌──────────┐      ┌─────────────┐
│MongoDB   │      │Elasticsearch│    │   CDN       │
│(Metadata)│      │ (Search)  │      │(CloudFlare) │
└──────────┘      └──────────┘      └─────────────┘
```

---

## 3. Core Services

### 3.1 Authentication Service
**Responsibility**: User identity, session management, OAuth integration

**Tech Stack**:
- JWT tokens with refresh mechanism
- OAuth 2.0 (Google, Facebook, Apple)
- bcrypt for password hashing
- Rate limiting with Redis

**Database**: PostgreSQL
- Tables: users, sessions, refresh_tokens, oauth_providers

### 3.2 Wardrobe Service
**Responsibility**: CRUD operations for wardrobe items, collections

**APIs**:
- Add item (upload/URL)
- Update/delete items
- Fetch wardrobe by filters
- Create collections

**Database**: PostgreSQL + MongoDB
- PostgreSQL: relational data (user-item mapping)
- MongoDB: flexible item metadata (tags, colors, dimensions)

### 3.3 Image Processing Service
**Responsibility**: Image optimization, storage, retrieval

**Pipeline**:
```
Upload → Validation → Compression → 
Format Conversion → Thumbnail Generation → 
CDN Upload → Metadata Extraction
```

**Tech Stack**:
- Sharp.js for image processing
- AWS S3 / Cloudinary for storage
- WebP conversion for optimization
- Image hashing for duplicate detection

### 3.4 AI Service
**Responsibility**: Vision AI, outfit generation, recommendations

**Components**:

**a) Vision Model** (Image Classification)
- Model: Fine-tuned Vision Transformer (ViT) or ResNet50
- Tasks:
  - Clothing category (20+ classes)
  - Color extraction (dominant colors)
  - Pattern detection (solid, striped, printed)
  - Occasion classification (4 classes)
- Infrastructure: GPU instances (AWS EC2 P3 / Google Cloud TPU)

**b) Outfit Generator** (Recommendation Engine)
- Algorithm: Collaborative filtering + Rule-based constraints
- Inputs: Weather API, user preferences, occasion
- Output: 3-5 outfit combinations
- Model: Content-based filtering with cosine similarity

**c) Trend Analyzer**
- NLP model for fashion trend extraction
- Data sources: Social media APIs, fashion blogs
- Updates: Weekly batch processing

**Database**: Vector DB (Pinecone / Weaviate) for similarity search

### 3.5 Analytics Service
**Responsibility**: Usage tracking, dashboard data, insights

**Metrics Tracked**:
- Item usage frequency
- Category distribution
- Color palette analysis
- Seasonal trends
- Cost-per-wear calculation

**Tech Stack**:
- Time-series database (InfluxDB / TimescaleDB)
- Apache Kafka for event streaming
- Spark for batch analytics

**Real-time Pipeline**:
```
User Action → Kafka Topic → Stream Processor → 
InfluxDB → Grafana Dashboard
```

### 3.6 Integration Service
**Responsibility**: Third-party API integrations (Pinterest, Myntra)

**Adapters**:
- Pinterest API: Image scraping, board sync
- Myntra API: Product catalog, price tracking
- Weather API: Location-based suggestions
- Payment Gateway: Premium subscriptions

**Pattern**: Adapter pattern with retry logic and circuit breakers

### 3.7 Notification Service
**Responsibility**: Email, push notifications, in-app alerts

**Channels**:
- Email: SendGrid / AWS SES
- Push: Firebase Cloud Messaging
- In-app: WebSocket connections

**Event Types**:
- Outfit suggestions
- Analytics insights
- Price drop alerts
- Social interactions

---

## 4. Data Models

### 4.1 Core Entities

**User**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    profile_pic_url TEXT,
    preferences JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**WardrobeItem**
```sql
CREATE TABLE wardrobe_items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    category VARCHAR(50),
    colors TEXT[],
    occasions TEXT[],
    brand VARCHAR(100),
    purchase_date DATE,
    price DECIMAL(10,2),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata JSONB,
    usage_count INT DEFAULT 0,
    last_worn_at TIMESTAMP,
    created_at TIMESTAMP,
    INDEX idx_user_category (user_id, category),
    INDEX idx_occasions (occasions)
);
```

**Outfit**
```sql
CREATE TABLE outfits (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    occasion VARCHAR(50),
    season VARCHAR(20),
    is_favorite BOOLEAN DEFAULT FALSE,
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

CREATE TABLE outfit_items (
    outfit_id UUID REFERENCES outfits(id),
    item_id UUID REFERENCES wardrobe_items(id),
    position VARCHAR(20), -- 'top', 'bottom', 'shoes', 'accessories'
    PRIMARY KEY (outfit_id, item_id)
);
```

**Analytics**
```sql
CREATE TABLE usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    item_id UUID REFERENCES wardrobe_items(id),
    event_type VARCHAR(50), -- 'worn', 'viewed', 'favorited'
    timestamp TIMESTAMP,
    metadata JSONB
);
```

### 4.2 MongoDB Schema (Item Metadata)

```javascript
{
  _id: ObjectId,
  item_id: UUID,
  ai_tags: {
    category: String,
    sub_category: String,
    colors: [String],
    patterns: [String],
    material: String,
    fit: String,
    style: [String]
  },
  dimensions: {
    size: String,
    measurements: Object
  },
  embeddings: [Float32], // 512-dim vector for similarity
  source: {
    platform: String,
    url: String,
    imported_at: Date
  }
}
```

---

## 5. AI/ML Pipeline

### 5.1 Training Pipeline

```
Data Collection → Data Labeling → 
Model Training → Validation → 
Model Deployment → Monitoring
```

**Data Sources**:
- User uploads (with implicit feedback)
- Fashion datasets (DeepFashion, Fashionpedia)
- Synthetic data generation

**Training Infrastructure**:
- MLflow for experiment tracking
- Kubernetes for distributed training
- Model versioning with DVC

### 5.2 Inference Pipeline

```
Image Upload → Preprocessing → 
Model Inference → Post-processing → 
Cache Result → Return Tags
```

**Optimization**:
- Model quantization (INT8)
- Batch inference for efficiency
- Result caching (Redis, 24h TTL)
- A/B testing with shadow deployments

### 5.3 Outfit Generation Algorithm

```python
# Pseudo-code
def generate_outfit(user_id, occasion, weather):
    # 1. Fetch wardrobe items
    items = get_wardrobe(user_id)
    
    # 2. Filter by occasion and weather
    suitable_items = filter_by_context(items, occasion, weather)
    
    # 3. Create compatibility matrix
    compatibility = compute_similarity(suitable_items)
    
    # 4. Apply rules (color theory, style matching)
    valid_combinations = apply_style_rules(compatibility)
    
    # 5. Rank by diversity and user preferences
    outfits = rank_outfits(valid_combinations, user_preferences)
    
    # 6. Return top 5
    return outfits[:5]
```

**Constraints**:
- Color harmony (complementary, analogous)
- Style consistency (don't mix formal with athletic)
- Weather appropriateness
- Recent usage (deprioritize frequently worn items)

---

## 6. Scalability Strategy

### 6.1 Horizontal Scaling
- **Stateless services**: Auto-scaling groups (Kubernetes HPA)
- **Database**: Read replicas (3 replicas), connection pooling
- **Caching**: Redis cluster with consistent hashing

### 6.2 Performance Optimization
- **CDN**: CloudFlare for static assets
- **Image lazy loading**: Progressive image rendering
- **API pagination**: Cursor-based pagination (limit: 50 items)
- **Database indexing**: Composite indexes on frequent queries

### 6.3 Load Patterns
**Peak Load Estimate** (10K active users):
- 500 req/s API calls
- 50 AI inference req/s
- 10 GB/day image uploads

**Infrastructure**:
- 20 API server instances (t3.medium)
- 4 GPU instances for AI (g4dn.xlarge)
- 3 PostgreSQL replicas (db.r5.large)

---

## 7. Security Architecture

### 7.1 Authentication Flow
```
User Login → Email/Password or OAuth → 
Generate JWT (15min expiry) → 
Return Access Token + Refresh Token (7 days) → 
Client stores in httpOnly cookie
```

### 7.2 Data Protection
- **Encryption at rest**: AES-256 for S3, database encryption
- **Encryption in transit**: TLS 1.3 for all API calls
- **PII handling**: GDPR compliance, data anonymization
- **Access control**: RBAC (admin, premium, free tiers)

### 7.3 Threat Mitigation
- **Rate limiting**: 100 req/min per user (Redis)
- **DDOS protection**: CloudFlare WAF
- **SQL injection**: Parameterized queries, ORM
- **XSS**: Content Security Policy headers
- **CSRF**: SameSite cookies, CSRF tokens

---

## 8. Monitoring & Observability

### 8.1 Metrics (Prometheus)
- Service health (CPU, memory, response time)
- AI model accuracy (precision, recall, F1-score)
- API latency (p50, p95, p99)
- Error rates by service

### 8.2 Logging (ELK Stack)
- Structured JSON logs
- Centralized logging with Elasticsearch
- Log retention: 30 days

### 8.3 Tracing (Jaeger)
- Distributed tracing for request flows
- Performance bottleneck identification

### 8.4 Alerts
- Slack/PagerDuty integration
- Alerts: Error rate >1%, Latency >2s, Service down

---

## 9. Disaster Recovery

### 9.1 Backup Strategy
- **Database**: Daily snapshots, 30-day retention
- **Images**: S3 versioning enabled, cross-region replication
- **Config**: GitOps approach, version-controlled

### 9.2 Recovery Objectives
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 15 minutes

### 9.3 Failure Scenarios
| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Service crash | Health checks (30s) | Auto-restart (Kubernetes) |
| Database failure | Connection timeout | Failover to replica (5min) |
| AI service down | Circuit breaker | Fallback to rule-based |
| CDN outage | Origin monitoring | Direct S3 access |

---

## 10. Deployment Architecture

### 10.1 Environments
- **Development**: Local Docker Compose
- **Staging**: Kubernetes cluster (2 nodes)
- **Production**: Multi-AZ Kubernetes (6 nodes)

### 10.2 CI/CD Pipeline
```
Git Push → GitHub Actions → 
Run Tests (unit, integration) → 
Build Docker Images → 
Push to Registry → 
Deploy to Staging → 
Automated Tests → 
Manual Approval → 
Deploy to Production (Blue-Green)
```

### 10.3 Infrastructure as Code
- **Terraform**: Cloud resources provisioning
- **Helm Charts**: Kubernetes deployments
- **Ansible**: Server configuration

---

## 11. Cost Optimization

### 11.1 Estimated Monthly Costs (10K users)
| Component | Cost |
|-----------|------|
| EC2/Compute | $800 |
| RDS (PostgreSQL) | $300 |
| S3 Storage (2TB) | $50 |
| AI GPU Instances | $500 |
| CDN (100GB transfer) | $20 |
| Monitoring Tools | $100 |
| **Total** | **$1,770/month** |

### 11.2 Optimization Strategies
- Reserved instances (30% savings)
- Spot instances for batch jobs
- Auto-scaling policies (scale down off-peak)
- S3 lifecycle policies (move to Glacier after 90 days)

---

## 12. Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Node.js (Express), Python (FastAPI for AI) |
| Databases | PostgreSQL, MongoDB, Redis |
| AI/ML | TensorFlow/PyTorch, Hugging Face Transformers |
| Storage | AWS S3, CloudFlare CDN |
| Orchestration | Kubernetes, Docker |
| CI/CD | GitHub Actions, ArgoCD |
| Monitoring | Prometheus, Grafana, ELK |
| Cloud | AWS / Google Cloud Platform |

---

## 13. Future Enhancements

### Phase 2 Technical Improvements
- **GraphQL API**: Replace REST for flexible queries
- **Microservices → Serverless**: Migrate to AWS Lambda for cost efficiency
- **Edge Computing**: Process images closer to users (CloudFlare Workers)
- **Federated Learning**: Train models on-device for privacy
- **AR Try-On**: WebGL/Three.js for 3D rendering

### Scalability Targets (100K users)
- Multi-region deployment (US, EU, Asia)
- Dedicated GPU cluster (Kubernetes GPU operator)
- Kafka streaming for real-time analytics
- Data lake for ML training (S3 + Athena)

---

## Appendix

### A. API Rate Limits
- **Free Tier**: 100 req/hour, 5 AI inferences/day
- **Premium Tier**: 1000 req/hour, unlimited AI inferences

### B. Service SLAs
- **API Availability**: 99.9% (43 min downtime/month)
- **AI Inference**: <2s response time (p95)
- **Image Upload**: <5s for 5MB images

### C. Glossary
- **Embedding**: Numerical vector representation of images for similarity search
- **Cosine Similarity**: Metric to measure similarity between vectors
- **Circuit Breaker**: Pattern to prevent cascading failures
- **Blue-Green Deployment**: Zero-downtime deployment strategy
