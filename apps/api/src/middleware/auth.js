"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
exports.requirePublisher = requirePublisher;
var fastify_plugin_1 = require("fastify-plugin");
var supabase_auth_1 = require("../lib/supabase-auth");
function verifyTestToken(request) {
    return __awaiter(this, void 0, void 0, function () {
        var jwtRequest, jwtUser;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!(0, supabase_auth_1.shouldUseLegacyTestAuth)()) {
                        return [2 /*return*/, null];
                    }
                    jwtRequest = request;
                    if (typeof jwtRequest.jwtVerify !== "function") {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, jwtRequest.jwtVerify()];
                case 1:
                    _c.sent();
                    jwtUser = request.user;
                    if (!(jwtUser === null || jwtUser === void 0 ? void 0 : jwtUser.userId) || !jwtUser.email) {
                        throw new supabase_auth_1.SupabaseAccessTokenError("Invalid test token.");
                    }
                    return [2 /*return*/, {
                            userId: jwtUser.userId,
                            supabaseUserId: (_a = jwtUser.supabaseUserId) !== null && _a !== void 0 ? _a : jwtUser.userId,
                            email: jwtUser.email,
                            publisherId: jwtUser.publisherId,
                            publisherName: (_b = jwtUser.publisherName) !== null && _b !== void 0 ? _b : null,
                            publisherIssue: jwtUser.publisherIssue,
                        }];
            }
        });
    });
}
function authenticateRequest(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, testUser;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    authHeader = request.headers.authorization;
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
                        throw new supabase_auth_1.SupabaseAccessTokenError("Missing bearer token.");
                    }
                    token = authHeader.slice("Bearer ".length).trim();
                    if (!token) {
                        throw new supabase_auth_1.SupabaseAccessTokenError("Missing bearer token.");
                    }
                    return [4 /*yield*/, verifyTestToken(request)];
                case 1:
                    testUser = _a.sent();
                    if (testUser) {
                        return [2 /*return*/, testUser];
                    }
                    return [2 /*return*/, (0, supabase_auth_1.authenticateSupabaseAccessToken)(token)];
            }
        });
    });
}
exports.authMiddleware = (0, fastify_plugin_1.default)(function (fastify) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        fastify.addHook("onRequest", function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var publicPaths, isPublic, authHeader, _a, _b, _c, error_1, statusCode, message;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        publicPaths = [
                            "/api/auth/register",
                            "/api/auth/verify-email",
                            "/api/auth/login",
                            "/api/kits",
                            "/docs",
                            "/health",
                        ];
                        isPublic = publicPaths.some(function (p) {
                            if (request.url === p)
                                return true;
                            if (request.method === "GET" && request.url.startsWith("/api/kits") && !request.url.startsWith("/api/kits/mine"))
                                return true;
                            if (request.method === "GET" && request.url.startsWith("/api/publishers"))
                                return true;
                            if (request.method === "GET" && request.url.startsWith("/api/skills"))
                                return true;
                            return false;
                        });
                        authHeader = request.headers.authorization;
                        if (!isPublic) return [3 /*break*/, 5];
                        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) return [3 /*break*/, 4];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        _a = request;
                        return [4 /*yield*/, authenticateRequest(request)];
                    case 2:
                        _a.authUser = _e.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _b = _e.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                    case 5:
                        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
                            reply.code(401).send({
                                error: "Unauthorized",
                                message: "Authentication required. Include Bearer token.",
                                statusCode: 401,
                            });
                            return [2 /*return*/];
                        }
                        _e.label = 6;
                    case 6:
                        _e.trys.push([6, 8, , 9]);
                        _c = request;
                        return [4 /*yield*/, authenticateRequest(request)];
                    case 7:
                        _c.authUser = _e.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_1 = _e.sent();
                        statusCode = error_1 instanceof supabase_auth_1.SupabaseAuthConfigurationError ? 503 : 401;
                        message = error_1 instanceof supabase_auth_1.SupabaseAuthConfigurationError
                            ? (_d = (0, supabase_auth_1.getSupabaseAuthConfigError)()) !== null && _d !== void 0 ? _d : error_1.message
                            : "Invalid or expired token.";
                        reply.code(statusCode).send({
                            error: statusCode === 503 ? "Service Unavailable" : "Unauthorized",
                            message: message,
                            statusCode: statusCode,
                        });
                        return [2 /*return*/];
                    case 9: return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); });
function requirePublisher(request, reply) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        var _a;
        return __generator(this, function (_b) {
            user = request.authUser;
            if (!user) {
                reply.code(401).send({
                    error: "Unauthorized",
                    message: "Authentication required.",
                    statusCode: 401,
                });
                return [2 /*return*/];
            }
            if (!user.publisherId) {
                reply.code(403).send({
                    error: "Forbidden",
                    message: (_a = user.publisherIssue) !== null && _a !== void 0 ? _a : "Publisher profile required. Complete Supabase sign-in first.",
                    statusCode: 403,
                });
                return [2 /*return*/];
            }
            return [2 /*return*/];
        });
    });
}
