/**
 * JWT Token Service
 * Handles JWT generation, validation, and refresh token management
 */

import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import winston from "winston";
import { JWTPayload, ValidateTokenResponse } from "../models/auth.model";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "auth-token-service" },
  transports: [new winston.transports.Console()],
});

export class TokenService {
  private secretKey: string;
  private algorithm: string;
  private expirySeconds: number;
  private refreshExpirySeconds: number;
  private issuer: string;

  constructor() {
    this.secretKey = process.env.JWT_SECRET_KEY || "change_me_in_production";
    this.algorithm = process.env.JWT_ALGORITHM || "HS256";
    this.expirySeconds = parseInt(process.env.JWT_EXPIRY_SECONDS || "3600");
    this.refreshExpirySeconds = parseInt(
      process.env.JWT_REFRESH_EXPIRY_SECONDS || "604800"
    );
    this.issuer = process.env.OIDC_PROVIDER_URL || "http://localhost:3001";
  }

  /**
   * Generate a new JWT token
   */
  generateAccessToken(payload: Partial<JWTPayload>): string {
    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload: JWTPayload = {
      sub: payload.sub || "",
      email: payload.email || "",
      email_verified: payload.email_verified || false,
      aud: payload.aud || ["api.unisalle.local"],
      iss: this.issuer,
      iat: now,
      exp: now + this.expirySeconds,
      jti,
      ...payload,
    };

    const options: SignOptions = {
      algorithm: this.algorithm as "HS256" | "RS256",
      noTimestamp: false,
    };

    try {
      const token = jwt.sign(tokenPayload, this.secretKey, options);
      logger.debug("Access token generated", { sub: payload.sub, jti });
      return token;
    } catch (error) {
      logger.error("Error generating access token", { error, payload });
      throw new Error("Failed to generate access token");
    }
  }

  /**
   * Generate a refresh token (opaque string)
   */
  generateRefreshToken(): string {
    const refreshToken = crypto.randomBytes(32).toString("hex");
    logger.debug("Refresh token generated");
    return refreshToken;
  }

  /**
   * Hash a refresh token (for storage in DB)
   */
  hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Validate a JWT token
   */
  validateToken(token: string): ValidateTokenResponse {
    try {
      const options: VerifyOptions = {
        algorithms: [this.algorithm as "HS256" | "RS256"],
      };

      const payload = jwt.verify(token, this.secretKey, options) as JWTPayload;

      logger.debug("Token validated successfully", { sub: payload.sub });

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn("Token validation failed", { error: errorMessage });

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(payload: JWTPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Get token expiry time in seconds
   */
  getTokenExpirySeconds(): number {
    return this.expirySeconds;
  }

  /**
   * Get refresh token expiry time in seconds
   */
  getRefreshTokenExpirySeconds(): number {
    return this.refreshExpirySeconds;
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload | null;
      return decoded;
    } catch (error) {
      logger.error("Error decoding token", { error });
      return null;
    }
  }
}

export const tokenService = new TokenService();
