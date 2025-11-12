/**
 * Authentication Routes
 * Endpoints for token exchange, validation, and user info
 */

import { Router, Request, Response, NextFunction } from "express";
import winston from "winston";
import { tokenService } from "../services/token.service";
import { oidcService } from "../services/oidc.service";
import { ErrorResponse, AuthAction } from "../models/auth.model";
import {
  loginInitiatedCounter,
  loginSuccessfulCounter,
  loginFailedCounter,
  tokensIssuedCounter,
  tokensRefreshedCounter,
  tokensValidatedCounter,
  tokensValidationFailedCounter,
  userInfoRetrievedCounter,
  userLogoutCounter,
  authOperationErrorsCounter,
  tokenValidationDuration,
  oidcCallbackDuration
} from "../instrumentation/opentelemetry";

const router = Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "auth-routes" },
  transports: [new winston.transports.Console()],
});

/**
 * GET /auth/login
 * Initiate OIDC login flow
 */
router.get("/login", (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = req.query.state as string || Math.random().toString(36).substring(7);
    const scope = req.query.scope as string || "openid profile email";

    // Business metric: login initiated
    loginInitiatedCounter.add(1, {
      provider: 'keycloak',
      scope: scope,
      ip: req.ip
    });

    // Build authorization URL
    const authUrl = oidcService.buildAuthorizationUrl(state, scope);

    logger.info("Login initiated", {
      state,
      scope,
      ip: req.ip,
    });

    // Redirect to OIDC provider
    res.redirect(authUrl);
  } catch (error) {
    authOperationErrorsCounter.add(1, { operation: 'login_initiate', error_type: 'unknown' });
    next(error);
  }
});

/**
 * GET /auth/callback
 * Handle OIDC callback with authorization code
 */
router.get("/callback", async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.warn("OIDC callback error", {
        error,
        error_description,
        ip: req.ip,
      });

      // Business metric: login failed
      loginFailedCounter.add(1, {
        provider: 'keycloak',
        error_type: error as string,
        ip: req.ip
      });

      authOperationErrorsCounter.add(1, { operation: 'oidc_callback', error_type: error as string });

      return res.status(400).json({
        error: error as string,
        error_description: error_description as string,
        status_code: 400,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    if (!code) {
      loginFailedCounter.add(1, {
        provider: 'keycloak',
        error_type: 'missing_code',
        ip: req.ip
      });

      authOperationErrorsCounter.add(1, { operation: 'oidc_callback', error_type: 'missing_code' });

      return res.status(400).json({
        error: "invalid_request",
        error_description: "authorization code is required",
        status_code: 400,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Exchange code for tokens
    const oidcToken = await oidcService.exchangeCodeForToken(code as string, state as string || "");

    // Get user info
    const userInfo = await oidcService.getUserInfo(oidcToken.access_token);

    // Generate our JWT
    const accessToken = tokenService.generateAccessToken({
      sub: userInfo.sub,
      email: userInfo.email,
      email_verified: userInfo.email_verified,
      name: userInfo.name,
      roles: userInfo.roles.map((r) => r.id),
      permissions: userInfo.permissions,
    });

    const refreshToken = tokenService.generateRefreshToken();

    // Business metrics: successful login and tokens issued
    loginSuccessfulCounter.add(1, {
      provider: 'keycloak',
      user_type: userInfo.roles.length > 0 ? userInfo.roles[0].id : 'unknown',
      ip: req.ip
    });

    tokensIssuedCounter.add(1, {
      grant_type: 'authorization_code',
      token_type: 'access',
      user_id: userInfo.sub
    });

    tokensIssuedCounter.add(1, {
      grant_type: 'authorization_code',
      token_type: 'refresh',
      user_id: userInfo.sub
    });

    const duration = Date.now() - startTime;
    oidcCallbackDuration.record(duration, { success: true, user_id: userInfo.sub });

    logger.info("OIDC callback successful", {
      userId: userInfo.sub,
      ip: req.ip,
    });

    // For simplicity, return tokens in JSON (in production, set httpOnly cookies)
    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: tokenService.getTokenExpirySeconds(),
      refresh_token: refreshToken,
      scope: oidcToken.scope,
      user: {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    oidcCallbackDuration.record(duration, { success: false });

    loginFailedCounter.add(1, {
      provider: 'keycloak',
      error_type: 'unknown',
      ip: req.ip
    });

    authOperationErrorsCounter.add(1, { operation: 'oidc_callback', error_type: 'unknown' });

    next(error);
  }
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
  const startTime = Date.now();

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      tokensValidationFailedCounter.add(1, { reason: 'missing_header', endpoint: 'userinfo' });
      authOperationErrorsCounter.add(1, { operation: 'userinfo', error_type: 'missing_header' });

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
      tokensValidationFailedCounter.add(1, { reason: validation.error, endpoint: 'userinfo' });
      authOperationErrorsCounter.add(1, { operation: 'userinfo', error_type: 'invalid_token' });

      return res.status(401).json({
        error: "invalid_token",
        error_description: validation.error,
        status_code: 401,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    const payload = validation.payload!;

    // Business metrics: successful token validation and user info retrieval
    tokensValidatedCounter.add(1, { endpoint: 'userinfo', user_id: payload.sub });
    userInfoRetrievedCounter.add(1, { user_id: payload.sub, ip: req.ip });

    const duration = Date.now() - startTime;
    tokenValidationDuration.record(duration, { endpoint: 'userinfo', success: true });

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
    const duration = Date.now() - startTime;
    tokenValidationDuration.record(duration, { endpoint: 'userinfo', success: false });

    authOperationErrorsCounter.add(1, { operation: 'userinfo', error_type: 'unknown' });

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
        // Business metric: user logout
        userLogoutCounter.add(1, { user_id: decoded.sub, ip: req.ip });

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
    authOperationErrorsCounter.add(1, { operation: 'logout', error_type: 'unknown' });
    next(error);
  }
});

export default router;
