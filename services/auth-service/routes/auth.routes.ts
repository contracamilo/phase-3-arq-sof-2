/**
 * Authentication Routes
 * Endpoints for token exchange, validation, and user info
 */

import { Router, Request, Response, NextFunction } from "express";
import winston from "winston";
import { tokenService } from "../services/token.service";
import { oidcService } from "../services/oidc.service";
import { ErrorResponse, AuthAction } from "../models/auth.model";

const router = Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "auth-routes" },
  transports: [new winston.transports.Console()],
});

/**
 * POST /auth/token
 * Exchange authorization code for tokens
 */
router.post("/token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { grant_type, code, state, refresh_token } = req.body;

    if (!grant_type) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "grant_type parameter is required",
        status_code: 400,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    if (grant_type === "authorization_code") {
      if (!code) {
        return res.status(400).json({
          error: "invalid_request",
          error_description: "authorization code is required",
          status_code: 400,
          timestamp: new Date().toISOString(),
        } as ErrorResponse);
      }

      try {
        // Exchange code for OIDC token
        const oidcToken = await oidcService.exchangeCodeForToken(code, state || "");

        // Get user info from OIDC provider
        const userInfo = await oidcService.getUserInfo(oidcToken.access_token);

        // Generate our own JWT
        const accessToken = tokenService.generateAccessToken({
          sub: userInfo.sub,
          email: userInfo.email,
          email_verified: userInfo.email_verified,
          name: userInfo.name,
          roles: userInfo.roles.map((r) => r.id),
          permissions: userInfo.permissions,
        });

        const refreshToken = tokenService.generateRefreshToken();

        // TODO: Store refresh token in database/Redis

        logger.info("Token issued successfully", {
          action: AuthAction.CODE_EXCHANGE,
          userId: userInfo.sub,
          ip: req.ip,
        });

        return res.status(200).json({
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: tokenService.getTokenExpirySeconds(),
          refresh_token: refreshToken,
          scope: oidcToken.scope,
        });
      } catch (error) {
        const errorDetails = error as Record<string, string>;
        logger.error("Failed to exchange authorization code", {
          error: errorDetails.error,
          ip: req.ip,
        });

        return res.status(400).json({
          error: errorDetails.error || "invalid_grant",
          error_description:
            errorDetails.error_description || "Authorization code exchange failed",
          status_code: 400,
          timestamp: new Date().toISOString(),
        } as ErrorResponse);
      }
    } else if (grant_type === "refresh_token") {
      if (!refresh_token) {
        return res.status(400).json({
          error: "invalid_request",
          error_description: "refresh_token parameter is required",
          status_code: 400,
          timestamp: new Date().toISOString(),
        } as ErrorResponse);
      }

      try {
        // TODO: Validate refresh token from database/Redis

        const oidcToken = await oidcService.refreshAccessToken(refresh_token);
        const userInfo = await oidcService.getUserInfo(oidcToken.access_token);

        const newAccessToken = tokenService.generateAccessToken({
          sub: userInfo.sub,
          email: userInfo.email,
          email_verified: userInfo.email_verified,
          roles: userInfo.roles.map((r) => r.id),
        });

        logger.info("Access token refreshed successfully", {
          action: AuthAction.TOKEN_REFRESH,
          userId: userInfo.sub,
          ip: req.ip,
        });

        return res.status(200).json({
          access_token: newAccessToken,
          token_type: "Bearer",
          expires_in: tokenService.getTokenExpirySeconds(),
          scope: oidcToken.scope,
        });
      } catch (error) {
        const errorDetails = error as Record<string, string>;
        return res.status(400).json({
          error: errorDetails.error || "invalid_grant",
          error_description: errorDetails.error_description || "Token refresh failed",
          status_code: 400,
          timestamp: new Date().toISOString(),
        } as ErrorResponse);
      }
    } else {
      return res.status(400).json({
        error: "unsupported_grant_type",
        error_description: `grant_type '${grant_type}' is not supported`,
        status_code: 400,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/userinfo
 * Get authenticated user information
 */
router.get("/userinfo", (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "invalid_token",
        error_description: "Authorization header with Bearer token is required",
        status_code: 401,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    const token = authHeader.substring(7);
    const validation = tokenService.validateToken(token);

    if (!validation.valid) {
      logger.warn("Token validation failed", { error: validation.error });
      return res.status(401).json({
        error: "invalid_token",
        error_description: validation.error,
        status_code: 401,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    const payload = validation.payload!;

    logger.info("Userinfo retrieved successfully", {
      action: AuthAction.USERINFO_FETCH,
      userId: payload.sub,
      ip: req.ip,
    });

    return res.status(200).json({
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      name: payload.name,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      iat: payload.iat,
      exp: payload.exp,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/validate
 * Validate a JWT token
 */
router.post("/validate", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "token parameter is required",
        status_code: 400,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    const validation = tokenService.validateToken(token);

    logger.info("Token validated", {
      action: AuthAction.TOKEN_VALIDATE,
      valid: validation.valid,
      ip: req.ip,
    });

    return res.status(200).json({
      valid: validation.valid,
      payload: validation.payload || undefined,
      error: validation.error,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 * Logout and invalidate session
 */
router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = tokenService.decodeToken(token);

      if (decoded) {
        logger.info("User logged out", {
          action: AuthAction.LOGOUT,
          userId: decoded.sub,
          ip: req.ip,
        });

        // TODO: Revoke token, clear session
      }
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
