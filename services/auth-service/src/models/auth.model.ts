/**
 * Domain Models and Types for Auth Service
 * Aligned with OIDC and OAuth2 specifications
 */

export interface OIDCToken {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

export interface JWTPayload {
  sub: string; // User ID (subject)
  aud: string[]; // Audience
  iss: string; // Issuer
  iat: number; // Issued at
  exp: number; // Expiration
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  roles?: string[];
  permissions?: string[];
  jti?: string; // JWT ID (unique identifier)
  scope?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  roles: Role[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface AuthSession {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  access_token_jti?: string;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  expires_at: Date;
  last_activity: Date;
  revoked: boolean;
  revoked_at?: Date;
}

export interface AuthRequest {
  grant_type:
    | "authorization_code"
    | "refresh_token"
    | "client_credentials"
    | "password";
  code?: string;
  state?: string;
  refresh_token?: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  username?: string;
  password?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

export interface AuditLogEntry {
  id: number;
  user_id?: string;
  action: string; // e.g., "LOGIN", "TOKEN_REFRESH", "LOGOUT"
  resource: string;
  status: "success" | "failure";
  ip_address: string;
  user_agent: string;
  error_message?: string;
  created_at: Date;
}

export enum AuthAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  TOKEN_REFRESH = "TOKEN_REFRESH",
  TOKEN_VALIDATE = "TOKEN_VALIDATE",
  USERINFO_FETCH = "USERINFO_FETCH",
  CODE_EXCHANGE = "CODE_EXCHANGE",
  SESSION_REVOKE = "SESSION_REVOKE",
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
  status_code: number;
  timestamp: string;
  trace_id?: string;
}
