# FundEd API Contracts

## Overview
This document outlines the API endpoints, data models, and frontend-backend integration plan for the FundEd educational crowdfunding platform.

---

## Data Models (MongoDB Collections)

### 1. Users Collection
```json
{
  "user_id": "string (UUID)",
  "email": "string (unique)",
  "name": "string",
  "picture": "string (URL)",
  "role": "enum: student | donor | institution | admin",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 2. Student Profiles Collection
```json
{
  "profile_id": "string (UUID)",
  "user_id": "string (FK to users)",
  "country": "string",
  "field_of_study": "string",
  "university": "string",
  "verification_status": "enum: pending | verified | rejected",
  "verification_documents": [
    {
      "type": "string",
      "url": "string",
      "verified": "boolean"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 3. Campaigns Collection
```json
{
  "campaign_id": "string (UUID)",
  "student_id": "string (FK to users)",
  "title": "string",
  "story": "string (long text)",
  "category": "enum: tuition | books | laptop | housing | travel | emergency",
  "target_amount": "float",
  "raised_amount": "float (default: 0)",
  "donor_count": "integer (default: 0)",
  "timeline": "string",
  "impact_log": "string",
  "status": "enum: active | completed | cancelled",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 4. Donations Collection
```json
{
  "donation_id": "string (UUID)",
  "campaign_id": "string (FK to campaigns)",
  "donor_id": "string (FK to users, nullable for anonymous)",
  "donor_name": "string",
  "amount": "float",
  "anonymous": "boolean",
  "stripe_session_id": "string",
  "payment_status": "enum: pending | paid | failed",
  "created_at": "datetime"
}
```

### 5. User Sessions Collection
```json
{
  "session_id": "string (UUID)",
  "user_id": "string (FK to users)",
  "session_token": "string",
  "expires_at": "datetime",
  "created_at": "datetime"
}
```

### 6. Payment Transactions Collection
```json
{
  "transaction_id": "string (UUID)",
  "session_id": "string (Stripe session ID)",
  "campaign_id": "string",
  "donor_id": "string (nullable)",
  "amount": "float",
  "currency": "string",
  "payment_status": "enum: initiated | pending | paid | failed | expired",
  "metadata": "object",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/session` | Exchange session_id for session_token | No |
| GET | `/api/auth/me` | Get current user data | Yes |
| POST | `/api/auth/logout` | Logout and clear session | Yes |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/me` | Get current user profile | Yes |
| PUT | `/api/users/me` | Update current user profile | Yes |
| GET | `/api/users/{user_id}` | Get public user info | No |

### Student Profile Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/students/profile` | Create student profile | Yes (Student) |
| GET | `/api/students/profile` | Get own student profile | Yes (Student) |
| PUT | `/api/students/profile` | Update student profile | Yes (Student) |
| POST | `/api/students/verify` | Submit verification docs | Yes (Student) |

### Campaign Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/campaigns` | List all active campaigns (with filters) | No |
| GET | `/api/campaigns/{campaign_id}` | Get campaign details | No |
| POST | `/api/campaigns` | Create new campaign | Yes (Verified Student) |
| PUT | `/api/campaigns/{campaign_id}` | Update campaign | Yes (Owner) |
| DELETE | `/api/campaigns/{campaign_id}` | Cancel campaign | Yes (Owner/Admin) |
| GET | `/api/campaigns/my` | Get user's campaigns | Yes (Student) |

### Donation Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/donations/checkout` | Create Stripe checkout session | No |
| GET | `/api/donations/status/{session_id}` | Get payment status | No |
| GET | `/api/donations/campaign/{campaign_id}` | Get campaign donors (public wall) | No |
| GET | `/api/donations/my` | Get user's donation history | Yes |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/students/pending` | List pending verifications | Yes (Admin) |
| PUT | `/api/admin/students/{user_id}/verify` | Approve/reject student | Yes (Admin) |
| GET | `/api/admin/campaigns` | List all campaigns | Yes (Admin) |
| GET | `/api/admin/stats` | Get platform statistics | Yes (Admin) |

### Webhook Endpoint

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/webhook/stripe` | Handle Stripe webhooks | No (Stripe signature) |

---

## Static Data Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get campaign categories |
| GET | `/api/countries` | Get supported countries |
| GET | `/api/fields-of-study` | Get fields of study |

---

## Query Parameters for Campaign Listing

```
GET /api/campaigns?category=tuition&country=Kenya&field_of_study=Computer%20Science&search=education&page=1&limit=12
```

- `category`: Filter by campaign category
- `country`: Filter by student's country
- `field_of_study`: Filter by field of study
- `search`: Search in title and story
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 12)

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "detail": "Detailed error info (optional)"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 50,
    "total_pages": 5
  }
}
```

---

## Default Admin Account

Seeded on startup:
- Email: `admin@funded.com`
- Name: `FundEd Admin`
- Role: `admin`

---

## Integration Notes

### Google OAuth Flow
1. Frontend redirects to `https://auth.emergentagent.com/?redirect={redirect_url}`
2. User completes Google auth
3. Redirected back with `#session_id=xxx`
4. Frontend extracts session_id, calls `POST /api/auth/session`
5. Backend exchanges for user data, creates/updates user, returns session_token as cookie

### Stripe Payment Flow
1. Donor selects amount, calls `POST /api/donations/checkout`
2. Backend creates Stripe checkout session, stores pending transaction
3. Frontend redirects to Stripe checkout URL
4. After payment, Stripe redirects to success URL with session_id
5. Frontend polls `GET /api/donations/status/{session_id}`
6. Backend updates transaction and donation records
