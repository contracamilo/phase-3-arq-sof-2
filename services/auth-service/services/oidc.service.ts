/**
 * OIDC Authentication Service
 * Handles communication with OpenID Connect provider
 */

import axios, { AxiosError } from "axios";
import winston from "winston";
import { OIDCToken, UserInfo, Role } from "../models/auth.model";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "oidc-auth-service" },
  transports: [new winston.transports.Console()],
});

export class OIDCService {
  private providerUrl: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string[];

  constructor() {
    this.providerUrl = process.env.OIDC_PROVIDER_URL || "https://idp.example.com";
    this.clientId = process.env.OIDC_CLIENT_ID || "";
    this.clientSecret = process.env.OIDC_CLIENT_SECRET || "";
    this.redirectUri = process.env.OIDC_REDIRECT_URI || "http://localhost:3001/auth/callback";
    this.scopes = (process.env.OIDC_SCOPES || "openid,profile,email,roles").split(",");

    if (!this.clientId || !this.clientSecret) {
      logger.error("OIDC credentials not configured");
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<OIDCToken> {
    try {
      logger.debug("Exchanging authorization code for token", { code: code.substring(0, 10) });

      const response = await axios.post(
        `${this.providerUrl}/oauth/token`,
        {
          grant_type: "authorization_code",
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          state,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          timeout: 5000,
        }
      );

      const token: OIDCToken = {
        access_token: response.data.access_token,
        token_type: response.data.token_type || "Bearer",
        expires_in: response.data.expires_in || 3600,
        refresh_token: response.data.refresh_token,
        id_token: response.data.id_token,
        scope: response.data.scope || this.scopes.join(" "),
      };

      logger.info("Authorization code exchanged successfully");
      return token;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data as Record<string, string | undefined>;
      
      logger.error("Failed to exchange authorization code", {
        error: errorData?.error || axiosError.message,
        status: axiosError.response?.status,
      });

      throw {
        error: errorData?.error || "invalid_grant",
        error_description:
          errorData?.error_description || "Failed to exchange authorization code",
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OIDCToken> {
    try {
      logger.debug("Refreshing access token");

      const response = await axios.post(
        `${this.providerUrl}/oauth/token`,
        {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          timeout: 5000,
        }
      );

      const token: OIDCToken = {
        access_token: response.data.access_token,
        token_type: response.data.token_type || "Bearer",
        expires_in: response.data.expires_in || 3600,
        refresh_token: response.data.refresh_token || refreshToken,
        scope: response.data.scope || this.scopes.join(" "),
      };

      logger.info("Access token refreshed successfully");
      return token;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data as Record<string, string | undefined>;
      
      logger.error("Failed to refresh access token", {
        error: errorData?.error || axiosError.message,
      });

      throw {
        error: errorData?.error || "invalid_grant",
        error_description: errorData?.error_description || "Failed to refresh token",
      };
    }
  }

  /**
   * Get user information from OIDC provider
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      logger.debug("Fetching user information from OIDC provider");

      const response = await axios.get(
        `${this.providerUrl}/oauth/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 5000,
        }
      );

      const userInfo: UserInfo = {
        sub: response.data.sub,
        email: response.data.email,
        email_verified: response.data.email_verified || false,
        name: response.data.name,
        given_name: response.data.given_name,
        family_name: response.data.family_name,
        picture: response.data.picture,
        locale: response.data.locale,
        roles: this.mapRoles(response.data.roles || []),
        permissions: this.mapPermissions(response.data.permissions || []),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      logger.info("User information retrieved successfully", { sub: userInfo.sub });
      return userInfo;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      logger.error("Failed to retrieve user information", {
        error: axiosError.message,
        status: axiosError.response?.status,
      });

      throw new Error("Failed to retrieve user information");
    }
  }

  /**
   * Revoke a token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      logger.debug("Revoking token");

      await axios.post(
        `${this.providerUrl}/oauth/revoke`,
        {
          token,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 5000,
        }
      );

      logger.info("Token revoked successfully");
    } catch (error) {
      logger.error("Failed to revoke token", { error });
      // Don't throw - token revocation failure is not critical
    }
  }

  /**
   * Map OIDC roles to internal Role objects
   */
  private mapRoles(oidcRoles: string[]): Role[] {
    const roleMap: Record<string, Role> = {
      student: {
        id: "role-student",
        name: "Estudiante",
        permissions: ["read:calendar", "write:reminders", "read:grades"],
      },
      teacher: {
        id: "role-teacher",
        name: "Docente",
        permissions: [
          "read:calendar",
          "write:calendar",
          "read:grades",
          "write:grades",
        ],
      },
      admin: {
        id: "role-admin",
        name: "Administrador",
        permissions: ["admin:*"],
      },
    };

    return oidcRoles
      .map((role) => roleMap[role.toLowerCase()])
      .filter((role) => role !== undefined) as Role[];
  }

  /**
   * Map OIDC permissions to internal format
   */
  private mapPermissions(oidcPermissions: string[]): string[] {
    return oidcPermissions.map((perm) => perm.toLowerCase());
  }
}

export const oidcService = new OIDCService();
