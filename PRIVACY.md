# Privacy Policy - Success.co MCP Server

**Last Updated**: November 4, 2025  
**Version**: 1.0

This privacy policy describes how the Success.co MCP (Model Context Protocol) Server handles your data when you use our hosted service with AI assistants like Claude.

For our complete privacy policy covering all Success.co services, please visit: [https://www.success.co/privacy](https://www.success.co/privacy)

---

## Overview

The Success.co MCP Server is a **hosted service** operated by Success.co that allows AI assistants to securely access your EOS (Entrepreneurial Operating System) data. We take your privacy seriously and follow strict data handling practices.

**Service Model**: This is a cloud-hosted service. You connect your AI assistant to our servers - you do not deploy or manage the MCP server yourself.

---

## Data We Collect

### Authentication Data

When you authenticate with the MCP server, we collect and store:

- **OAuth Access Tokens**: Secure tokens that grant the MCP server access to your Success.co account
- **User ID**: Your Success.co user identifier
- **Company ID**: Your Success.co company identifier
- **Email Address**: Your Success.co account email
- **Client ID**: The OAuth client identifier for the MCP connection

**Storage**: OAuth tokens are stored in our PostgreSQL database for session management and revocation checking.

**Retention**: OAuth tokens are valid for 90 days and are automatically expired after this period. You can revoke access at any time through your Success.co account settings.

### Development & Testing

Our service uses OAuth 2.0 for all production authentication. During internal development and testing, our team may use API keys, but these are never exposed to or used by customers.

### Access Logs

For security and debugging purposes, we maintain logs of:

- **Timestamp**: When requests are made
- **Request Type**: Which MCP tools are called (e.g., `getRocks`, `getIssues`)
- **Authentication Status**: Whether requests succeed or fail
- **Request Metadata**: Basic request information (not including the actual data)

**Retention**: Access logs are retained for 30 days and then automatically deleted.

**What We DON'T Log**:

- Your conversation with the AI assistant
- The specific data returned from queries
- Personal information beyond what's needed for authentication
- Your EOS business data (rocks, issues, todos, meetings, etc.)

---

## Data We Do NOT Collect

We explicitly do NOT collect or store:

- **Conversation Data**: Your conversations with AI assistants (Claude, ChatGPT, etc.)
- **Query Context**: The context or reasons for your data queries
- **Business Intelligence**: We do not analyze, aggregate, or use your EOS data for any purpose
- **Third-Party Data**: We do not share your data with third parties
- **Tracking Data**: No cookies, analytics, or tracking pixels

---

## How We Use Your Data

### Authentication & Authorization

Your authentication data is used exclusively to:

1. Verify your identity when the MCP server makes requests on your behalf
2. Check token validity and revocation status
3. Ensure you have permission to access the requested Success.co data
4. Update last-used timestamps for session management

### Security & Debugging

Access logs are used only for:

1. Security monitoring and threat detection
2. Debugging connection issues
3. System performance monitoring
4. Compliance with security best practices

---

## Data Storage & Security

### Encryption

- **In Transit**: All data is encrypted using TLS 1.2+ (HTTPS)
- **At Rest**: OAuth tokens are stored in encrypted database fields
- **API Keys**: Stored locally on your machine only (development mode)

### Database Security

- PostgreSQL database with role-based access controls
- Regular security updates and patches
- Automated backups with encryption
- Access restricted to authorized personnel only

### Token Security

- JWT tokens signed with RS256 algorithm
- Token validation with JWKS (JSON Web Key Set)
- Automatic token expiration after 90 days
- Revocation checking on every request

---

## Your Rights & Control

### Access & Deletion

You have the right to:

- **View**: See what authentication data we store about you
- **Revoke**: Disconnect the MCP server from your Success.co account at any time
- **Delete**: Request deletion of all your authentication data

To exercise these rights, contact us at: **support@success.co**

### Revoking Access

You can revoke MCP server access at any time by:

1. Disconnecting the integration in your Success.co account settings
2. Deleting the OAuth token from the MCP server
3. Removing the MCP server configuration from your AI assistant

When you revoke access, all associated tokens are immediately marked as invalid and cannot be used for future requests.

---

## Data Retention

| Data Type        | Retention Period           | Deletion Method                           |
| ---------------- | -------------------------- | ----------------------------------------- |
| OAuth Tokens     | 90 days (or until revoked) | Automatic expiration or manual revocation |
| Access Logs      | 30 days                    | Automatic deletion                        |
| User/Company IDs | Duration of active token   | Deleted when token is revoked/expired     |

---

## Third-Party Services

### What We Share

The MCP server acts as a bridge between:

- **Your AI Assistant** (e.g., Claude, ChatGPT)
- **Success.co GraphQL API** (your EOS data)

We do NOT share your data with any other third parties.

### AI Assistant Privacy

Your conversations with AI assistants (Claude, ChatGPT, etc.) are subject to their respective privacy policies:

- **Claude (Anthropic)**: [https://www.anthropic.com/privacy](https://www.anthropic.com/privacy)
- **ChatGPT (OpenAI)**: [https://openai.com/privacy/](https://openai.com/privacy/)

The MCP server only provides data in response to tool calls made by the AI assistant. We do not see or store your conversations.

---

## International Users

Success.co operates globally. By using the MCP server, you consent to the transfer of your authentication data to our servers, which may be located in different countries than where you reside.

---

## Changes to This Privacy Policy

We may update this privacy policy from time to time. When we make changes:

1. We will update the "Last Updated" date at the top
2. We will increment the version number
3. Significant changes will be communicated via email (if we have your contact information)

Continued use of the MCP server after changes constitutes acceptance of the updated policy.

---

## Compliance

The Success.co MCP Server is designed to comply with:

- **GDPR** (General Data Protection Regulation) for EU users
- **CCPA** (California Consumer Privacy Act) for California users
- **SOC 2** security standards
- **OAuth 2.0** industry-standard authentication protocols

---

## Contact & Support

### General Privacy Questions

**Email**: privacy@success.co  
**Website**: [https://www.success.co/privacy](https://www.success.co/privacy)

### Technical Support

**Email**: support@success.co  
**Documentation**: [https://github.com/successco/mcp-success-co](https://github.com/successco/mcp-success-co)

---

## Additional Resources

- **Full Privacy Policy**: [https://www.success.co/privacy](https://www.success.co/privacy)
- **Terms of Service**: [https://www.success.co/terms](https://www.success.co/terms)
- **Security Best Practices**: See `README.md` in this repository
- **OAuth 2.0 Documentation**: [https://oauth.net/2/](https://oauth.net/2/)
