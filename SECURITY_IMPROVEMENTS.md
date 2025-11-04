# Security Improvements - MCP Directory Policy Compliance

**Date**: November 4, 2025  
**Version**: 1.0

This document outlines the security improvements made to ensure compliance with Anthropic's MCP Directory Policy requirements.

**Note**: This repository contains the implementation of our hosted MCP service. It is intended for:
- Internal development by Success.co team
- Review by integration partners (e.g., Anthropic)
- Security and compliance auditing

Customers connect to our hosted service at `https://www.success.co/mcp` - they do not deploy this code themselves.

---

## ✅ Completed Improvements

### 1. Privacy Policy & Documentation

**Status**: ✅ Complete

- Created comprehensive `PRIVACY.md` with detailed data handling practices
- Added privacy section to `README.md` with quick reference
- Linked to hosted privacy policy at https://www.success.co/privacy
- Documented data collection, retention, and deletion procedures
- Clarified what data we DON'T collect (conversations, tracking, etc.)

**Files Modified**:
- `PRIVACY.md` (new)
- `README.md` (updated)

---

### 2. Production Security Enforcement

**Status**: ✅ Complete

**Implementation**:
- Added runtime check that prevents API key mode in production
- Server exits immediately if `DEVMODE_SUCCESS_USE_API_KEY=true` in production
- Clear error messages guide users to fix the configuration

**Code Location**: `middleware/auth.js` (lines 19-27)

```javascript
if (IS_PRODUCTION && DEV_CONFIG.USE_API_KEY) {
  logger.error("[AUTH] SECURITY ERROR: API key mode is enabled in production!");
  logger.error("[AUTH] This is a serious security risk. Exiting immediately.");
  logger.error("[AUTH] Set DEVMODE_SUCCESS_USE_API_KEY=false or remove it from .env");
  process.exit(1);
}
```

---

### 3. Enhanced Error Handling

**Status**: ✅ Complete

**Improvements**:
- Added unique request IDs for all requests
- Added error codes to all error responses (e.g., `AUTH_401`, `MCP_500`)
- Included support URLs and documentation links in error responses
- Better error context for debugging

**Error Code Schema**:
- `AUTH_401` - Generic authentication failure
- `AUTH_NO_CREDENTIALS` - No authentication provided
- `AUTH_JWT_INVALID` - JWT validation failed
- `AUTH_TOKEN_REVOKED` - Token was revoked
- `MCP_500` - MCP endpoint internal error
- `MCP_GET_500` - MCP GET endpoint error
- `MCP_DELETE_500` - MCP DELETE endpoint error

**Example Error Response**:
```json
{
  "error": "unauthorized",
  "errorCode": "AUTH_NO_CREDENTIALS",
  "message": "Authentication required. Provide a valid OAuth Bearer token or API key.",
  "requestId": "req_a1b2c3d4e5f6...",
  "supportUrl": "https://www.success.co/support",
  "docs": "https://github.com/successco/mcp-success-co"
}
```

**Files Modified**:
- `middleware/auth.js` (error handling, request IDs)
- `routes/mcp.js` (error responses)

---

### 4. PII Protection in Logs

**Status**: ✅ Complete

**Improvements**:
- Redacted user IDs and company IDs in logs (shows only last 4 characters)
- Removed email addresses from authentication success logs
- Shortened authorization header logging (12 chars instead of 20)
- Added request IDs to all log entries for correlation

**Before**:
```javascript
logger.info("[AUTH] Authentication successful (OAuth)", {
  user: "john@example.com",  // ❌ PII exposed
  company: "comp-12345",
  client: "client-xyz"
});
```

**After**:
```javascript
logger.info("[AUTH] Authentication successful (OAuth)", {
  requestId: "req_abc123...",
  userId: "user_***2345",      // ✅ Redacted
  companyId: "comp_***2345",   // ✅ Redacted
  clientId: "client-xyz"
});
```

**Files Modified**:
- `middleware/auth.js` (logging)

---

### 5. Request Tracking

**Status**: ✅ Complete

**Implementation**:
- Every request gets a unique request ID (`req_` + 32 hex chars)
- Request IDs are included in all logs for correlation
- Request IDs are returned in error responses for support

**Benefits**:
- Easy to trace a request through the entire system
- Users can provide request ID to support for faster debugging
- Better security auditing and threat detection

**Files Modified**:
- `middleware/auth.js` (request ID generation and tracking)
- `routes/mcp.js` (request ID usage)

---

### 6. Enhanced Security Warnings

**Status**: ✅ Complete

**Improvements**:
- Added prominent security warnings in README about API key mode
- Multiple warnings at different locations (setup, configuration, auth section)
- Clear guidance on what NOT to do:
  - Never use API key mode in production
  - Never commit API keys to version control
  - Always use OAuth 2.0 in production

**Warnings Added**:
- Fast Setup section (line 34)
- Development Mode section (lines 138-143)
- Throughout documentation where API keys are mentioned

**Files Modified**:
- `README.md`

---

### 7. Contact & Support Information

**Status**: ✅ Complete

**Added**:
- Dedicated "Support & Contact" section in README
- Multiple contact points:
  - General support: support@success.co
  - Privacy questions: privacy@success.co
  - Security issues: security@success.co
- Testing account information for Anthropic verification
- Links to documentation and resources

**Files Modified**:
- `README.md` (new section)
- `PRIVACY.md` (contact section)

---

### 8. Support URLs in Responses

**Status**: ✅ Complete

**Implementation**:
- All error responses now include `supportUrl` field
- Points to https://www.success.co/support
- Also includes `docs` field pointing to GitHub repository
- Helps users get help quickly when errors occur

**Files Modified**:
- `middleware/auth.js`
- `routes/mcp.js`

---

## 🔒 Security Best Practices Implemented

### Authentication
- ✅ OAuth 2.0 with JWT validation
- ✅ JWKS-based token verification
- ✅ Token revocation checking
- ✅ Automatic token expiration (90 days)
- ✅ Production enforcement (no API keys)

### Data Protection
- ✅ PII redaction in logs
- ✅ Minimal data collection
- ✅ Clear data retention policies
- ✅ No conversation data logging
- ✅ TLS encryption for all traffic

### Error Handling
- ✅ Informative error messages
- ✅ Error codes for categorization
- ✅ Request ID tracking
- ✅ Support URLs in errors
- ✅ No sensitive data in error responses

### Logging
- ✅ Request ID correlation
- ✅ Redacted PII
- ✅ 30-day log retention
- ✅ Security event logging
- ✅ Structured logging format

---

## 📋 MCP Directory Policy Compliance Checklist

### Safety and Security
- ✅ OAuth 2.0 implementation with recognized certificates
- ✅ Token revocation checking
- ✅ Production security enforcement
- ✅ Privacy-first data handling
- ✅ Minimal data collection
- ✅ PII protection in logs

### Compatibility
- ✅ Clear tool descriptions
- ✅ No interference with other MCP servers
- ✅ Well-documented functionality

### Functionality
- ✅ Graceful error handling
- ✅ Helpful error messages with context
- ✅ Error codes for categorization
- ✅ Request ID tracking
- ✅ Performance optimization (JWKS caching, connection pooling)

### Developer Requirements
- ✅ Privacy policy (PRIVACY.md)
- ✅ Contact information (README.md, PRIVACY.md)
- ✅ Comprehensive documentation (README.md)
- ✅ Testing account availability (documented)
- ✅ Security issue reporting process
- ✅ Support channels

---

## 📈 Metrics & Monitoring

### Request Tracking
Every request now includes:
- **Request ID**: Unique identifier for tracking
- **Authentication Method**: OAuth or API Key (dev only)
- **Timestamp**: When the request occurred
- **Outcome**: Success or error code

### Log Retention
- **Access Logs**: 30 days
- **Error Logs**: 30 days
- **OAuth Tokens**: 90 days (or until revoked)

### Privacy Metrics
- ✅ No conversation data stored
- ✅ No query analytics collected
- ✅ PII redacted in all logs
- ✅ Minimal authentication data only

---

## 🔄 Future Improvements (Optional)

These are nice-to-have improvements that could be added in the future:

### Monitoring
- [ ] Add response size tracking to logs
- [ ] Add execution time tracking
- [ ] Add rate limiting documentation
- [ ] Add uptime monitoring

### Analytics
- [ ] Token usage/response size tracking per tool
- [ ] Performance metrics dashboard
- [ ] Error rate monitoring

### Security
- [ ] Security audit log
- [ ] Suspicious activity detection
- [ ] Rate limiting implementation
- [ ] IP allowlisting (optional)

---

## 🛡️ Security Vulnerability Reporting

If you discover a security vulnerability in the Success.co MCP Server:

1. **DO NOT** disclose it publicly
2. **Email**: security@success.co immediately
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 24 hours and work with you to address the issue.

---

## 📝 Change Log

### Version 1.0 - November 4, 2025
- ✅ Added PRIVACY.md with comprehensive privacy policy
- ✅ Updated README.md with privacy and contact sections
- ✅ Implemented production security check for API key mode
- ✅ Added request ID tracking to all requests
- ✅ Enhanced error handling with error codes
- ✅ Added PII redaction to logs
- ✅ Added support URLs to all error responses
- ✅ Enhanced security warnings in documentation
- ✅ Improved error messages with context

---

## 📚 Related Documents

- [Privacy Policy](./PRIVACY.md)
- [README - Main Documentation](./README.md)
- [Success.co Privacy Policy](https://www.success.co/privacy)
- [Anthropic MCP Directory Policy](https://support.claude.com/en/articles/11697096-anthropic-mcp-directory-policy)

---

## 👥 Contributors

Security improvements implemented by the Success.co team to ensure compliance with Anthropic's MCP Directory Policy and industry best practices.

For questions or concerns, contact: security@success.co

