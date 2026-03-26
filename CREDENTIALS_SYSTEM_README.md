# Secure Credentials Management System

## Overview

A comprehensive, encrypted credential management system for AI-Stacked automation agency. This system enables secure storage, management, and API access to customer automation credentials.

## 🔐 Security Features

- **AES-256-GCM Encryption**: All credentials encrypted at rest
- **API Key Authentication**: Secure n8n integration with custom API keys
- **Rate Limiting**: 30 requests per minute per API key
- **Audit Logging**: Complete access logs with IP, timestamp, and action tracking
- **Row-Level Security**: Database policies ensure proper data access
- **Secure Decryption**: Admin-only access with confirmation modals

## 📊 Database Schema

### Tables Created

#### `customer_credentials`
- Stores encrypted customer credentials
- Fields: tool_name, credential_type, encrypted_username, encrypted_password, encrypted_api_key, encrypted_extra_fields
- Metadata: connection_notes, tags, is_valid, timestamps
- RLS policies for customer and admin access

#### `credential_access_logs`
- Audit trail for all credential access
- Tracks: user, action type, IP address, user agent, timestamp
- Admin-only viewing, automatic logging

### Enums
- `credential_type`: google_oauth, wordpress_admin, meta_business, tiktok_oauth, crm_api, api_key, webhook_secret, smtp, database, other

## 🛠️ Components

### Edge Functions

#### 1. `credentials-api` (n8n Integration)
**Purpose**: External API for n8n workflows to fetch/manage credentials

**Authentication**: N8N_API_KEY header validation

**Endpoints**:
- `GET /credentials/:customer_id` - Fetch all credentials (decrypted)
- `POST /credentials` - Create new credential
- `PUT /credentials/:id` - Update existing credential

**Features**:
- Automatic encryption/decryption
- Rate limiting (30 req/min)
- Audit logging
- CORS enabled

#### 2. `decrypt-credential` (Admin UI)
**Purpose**: Admin interface credential decryption

**Authentication**: JWT (requires authenticated admin user)

**Usage**: Called from admin dashboard to decrypt and view sensitive data

#### 3. `create-credential` (Customer UI)
**Purpose**: Secure credential creation for customers

**Authentication**: JWT (requires authenticated user)

**Usage**: Encrypts credentials server-side before storage

### Frontend Pages

#### 1. `/credentials` - Customer Dashboard
**Features**:
- Add new encrypted credentials
- View owned credentials (encrypted)
- Delete credentials
- Secure form with validation
- No decryption access

**Form Fields**:
- Tool Name (required)
- Credential Type (required)
- Username/Email (optional)
- Password (optional)
- API Key/Token (optional)
- Extra Fields (JSON)
- Connection Notes

#### 2. `/admin/credentials` - Admin Dashboard
**Features**:
- View all customer credentials
- Decrypt credentials with confirmation modal
- Delete credentials
- View metadata and tags
- Audit trail integration

**Security**:
- Admin role verification
- Explicit decrypt confirmation
- Audit logging of all actions
- Hide/show decrypted data toggle

#### 3. `/credentials/api-docs` - API Documentation
**Features**:
- Complete API reference
- Code examples (cURL)
- Authentication guide
- Error codes reference
- Rate limiting details
- Security best practices

## 🚀 Setup Instructions

### 1. Environment Variables

Two secrets were configured in Supabase:

```bash
CREDENTIALS_ENCRYPTION_KEY=<hex-string-256-bit>  # 64 character hex string
N8N_API_KEY=<your-secure-api-key>                # Custom API key for n8n
```

**To generate encryption key**:
```bash
# Generate 32 random bytes (256 bits) as hex
openssl rand -hex 32
```

### 2. Database Migration

Already applied:
- Created `customer_credentials` table
- Created `credential_access_logs` table
- Created `credential_type` enum
- Set up RLS policies
- Added indexes for performance

### 3. Edge Functions

Deployed functions:
- `credentials-api` (verify_jwt = false)
- `decrypt-credential` (verify_jwt = true)
- `create-credential` (verify_jwt = true)

### 4. Routes

Added to application:
- `/credentials` - Customer credential management
- `/admin/credentials` - Admin credential management
- `/credentials/api-docs` - API documentation

## 📝 Usage Guide

### For Customers

1. Navigate to `/credentials`
2. Click "Add Credential"
3. Fill in the form with your tool credentials
4. Submit - credentials are automatically encrypted
5. View your stored credentials (encrypted data not visible)

### For Admins

1. Navigate to `/admin/credentials`
2. View all customer credentials
3. Click "Decrypt" to view sensitive data (requires confirmation)
4. Confirmation modal warns about audit logging
5. Decrypted data shown in highlighted section
6. Click "Hide" to remove decrypted data from view

### For n8n Workflows

**Base URL**: `https://wjofzwelziocuxdjicnc.supabase.co/functions/v1`

**Example: Fetch Customer Credentials**
```bash
curl -X GET \
  "https://wjofzwelziocuxdjicnc.supabase.co/functions/v1/credentials-api/credentials/CUSTOMER_UUID" \
  -H "x-api-key: YOUR_N8N_API_KEY"
```

**Example: Create Credential via API**
```bash
curl -X POST \
  "https://wjofzwelziocuxdjicnc.supabase.co/functions/v1/credentials-api/credentials" \
  -H "x-api-key: YOUR_N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "user-uuid",
    "tool_name": "WordPress Site",
    "credential_type": "wordpress_admin",
    "username": "admin",
    "password": "secure_password",
    "connection_notes": "Production site"
  }'
```

**Example: Update Credential**
```bash
curl -X PUT \
  "https://wjofzwelziocuxdjicnc.supabase.co/functions/v1/credentials-api/credentials/CREDENTIAL_UUID" \
  -H "x-api-key: YOUR_N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "new_password",
    "is_valid": true
  }'
```

## 🔒 Security Best Practices

### Encryption
- Credentials encrypted before database storage
- AES-256-GCM with random IV per encryption
- Encryption key stored in environment variables (never in code)
- Separate functions for encryption vs. decryption

### Authentication
- Customer UI: JWT authentication required
- Admin UI: JWT + admin role verification
- n8n API: Custom API key validation
- All edge functions verify authentication before processing

### Audit Trail
- Every credential access logged automatically
- Logs include: timestamp, user ID, action type, IP address, user agent
- Admin-only access to audit logs
- Permanent record (cannot be modified/deleted by users)

### Rate Limiting
- 30 requests per minute per API key
- Prevents abuse and DoS attacks
- In-memory tracking (resets on function restart)
- Returns 429 status when limit exceeded

### CORS & API Security
- CORS enabled for authorized domains only
- API key validation before any operation
- Input validation and sanitization
- Error messages don't leak sensitive information

## 📈 Monitoring & Logs

### Audit Logs Query
```sql
SELECT 
  cal.*,
  cc.tool_name,
  cc.credential_type
FROM credential_access_logs cal
JOIN customer_credentials cc ON cal.credential_id = cc.id
WHERE cal.accessed_at > NOW() - INTERVAL '7 days'
ORDER BY cal.accessed_at DESC;
```

### Recent Credential Activity
```sql
SELECT 
  customer_id,
  tool_name,
  credential_type,
  updated_at,
  is_valid
FROM customer_credentials
ORDER BY updated_at DESC
LIMIT 50;
```

### Access Statistics
```sql
SELECT 
  access_type,
  COUNT(*) as count,
  DATE_TRUNC('day', accessed_at) as day
FROM credential_access_logs
WHERE accessed_at > NOW() - INTERVAL '30 days'
GROUP BY access_type, day
ORDER BY day DESC, count DESC;
```

## 🧪 Testing

### Test Customer Flow
1. Login as customer
2. Navigate to `/credentials`
3. Add test credential
4. Verify it appears in list
5. Try to decrypt (should not be possible)

### Test Admin Flow
1. Login as admin
2. Navigate to `/admin/credentials`
3. Find test credential
4. Click "Decrypt" and confirm
5. Verify decrypted data displays
6. Check audit logs for entry

### Test n8n API
```bash
# Test GET
curl -X GET \
  "https://wjofzwelziocuxdjicnc.supabase.co/functions/v1/credentials-api/credentials/USER_UUID" \
  -H "x-api-key: YOUR_API_KEY"

# Test rate limiting (make 31 requests quickly)
for i in {1..31}; do
  curl -X GET \
    "https://wjofzwelziocuxdjicnc.supabase.co/functions/v1/credentials-api/credentials/USER_UUID" \
    -H "x-api-key: YOUR_API_KEY"
done
```

## 🎯 Next Steps

### Recommended Enhancements
1. **Email Notifications**: Alert customers when credentials are accessed
2. **Credential Expiry**: Add expiration dates with automatic invalidation
3. **Bulk Operations**: Import/export credentials in encrypted format
4. **2FA for Decryption**: Add additional authentication for sensitive access
5. **Credential Sharing**: Allow controlled sharing between team members
6. **Integration Testing**: Automated n8n workflow tests
7. **Backup/Restore**: Encrypted backup system for disaster recovery

### Performance Optimization
1. **Caching**: Cache frequently accessed credentials (encrypted)
2. **Batch Operations**: Support bulk credential fetching
3. **Database Indexing**: Review and optimize query performance
4. **Connection Pooling**: Optimize Supabase connection usage

### Compliance
1. **GDPR**: Add data export/deletion workflows
2. **SOC 2**: Document security controls
3. **Encryption Standards**: Regular security audits
4. **Access Review**: Periodic credential access reviews

## 📞 Support

For questions or issues:
1. Check `/credentials/api-docs` for API documentation
2. Review audit logs for access issues
3. Verify environment variables are set correctly
4. Check edge function logs in Supabase dashboard

## ✅ System Status

**Database**: ✅ Tables created, RLS policies active  
**Edge Functions**: ✅ Deployed and configured  
**Customer UI**: ✅ Credential management working  
**Admin UI**: ✅ Decrypt and manage working  
**n8n API**: ✅ Ready for integration  
**Audit Logging**: ✅ All access tracked  
**Encryption**: ✅ AES-256-GCM active  
**Rate Limiting**: ✅ 30 req/min enforced  

---

**Last Updated**: 2025-11-28  
**System Version**: 1.0.0  
**Security Level**: Production-Ready
