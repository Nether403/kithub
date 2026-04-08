"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.SupabaseAccessTokenError = exports.SupabaseAuthConfigurationError = void 0;
exports.getSupabaseAuthConfigError = getSupabaseAuthConfigError;
exports.authenticateSupabaseAccessToken = authenticateSupabaseAccessToken;
exports.shouldUseLegacyTestAuth = shouldUseLegacyTestAuth;
var supabase_js_1 = require("@supabase/supabase-js");
var db_1 = require("@kithub/db");
var isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
var agentNamePattern = /^[a-zA-Z0-9_-]{2,64}$/;
var SupabaseAuthConfigurationError = /** @class */ (function (_super) {
    __extends(SupabaseAuthConfigurationError, _super);
    function SupabaseAuthConfigurationError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "SupabaseAuthConfigurationError";
        return _this;
    }
    return SupabaseAuthConfigurationError;
}(Error));
exports.SupabaseAuthConfigurationError = SupabaseAuthConfigurationError;
var SupabaseAccessTokenError = /** @class */ (function (_super) {
    __extends(SupabaseAccessTokenError, _super);
    function SupabaseAccessTokenError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "SupabaseAccessTokenError";
        return _this;
    }
    return SupabaseAccessTokenError;
}(Error));
exports.SupabaseAccessTokenError = SupabaseAccessTokenError;
function getSupabaseAuthConfig() {
    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    var key = process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE;
    return {
        url: url,
        key: key,
        error: !url || !key
            ? "Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY."
            : null,
    };
}
function getSupabaseAuthConfigError() {
    return getSupabaseAuthConfig().error;
}
var cachedConfigKey = "";
var cachedClient = null;
function getSupabaseAdminClient() {
    var _a = getSupabaseAuthConfig(), url = _a.url, key = _a.key, error = _a.error;
    if (!url || !key || error) {
        throw new SupabaseAuthConfigurationError(error !== null && error !== void 0 ? error : "Supabase auth is not configured.");
    }
    var cacheKey = "".concat(url, ":").concat(key);
    if (!cachedClient || cachedConfigKey !== cacheKey) {
        cachedClient = (0, supabase_js_1.createClient)(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        cachedConfigKey = cacheKey;
    }
    return cachedClient;
}
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function getVerifiedAt(user) {
    return user.email_confirmed_at ? new Date(user.email_confirmed_at) : null;
}
function getRequestedAgentName(user) {
    var _a, _b, _c, _d, _e;
    var candidate = (_d = (_b = (_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.agentName) !== null && _b !== void 0 ? _b : (_c = user.user_metadata) === null || _c === void 0 ? void 0 : _c.agent_name) !== null && _d !== void 0 ? _d : (_e = user.user_metadata) === null || _e === void 0 ? void 0 : _e.publisherName;
    if (typeof candidate !== "string") {
        return null;
    }
    var trimmed = candidate.trim();
    return agentNamePattern.test(trimmed) ? trimmed : null;
}
function syncLocalUser(user) {
    return __awaiter(this, void 0, void 0, function () {
        var rawEmail, email, emailVerified, bySupabaseId, localUser, _a, needsUpdate, created;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!db_1.db) {
                        throw new Error("Database not connected.");
                    }
                    rawEmail = user.email;
                    if (!rawEmail) {
                        throw new SupabaseAccessTokenError("Supabase token is missing an email address.");
                    }
                    email = normalizeEmail(rawEmail);
                    emailVerified = getVerifiedAt(user);
                    return [4 /*yield*/, db_1.db
                            .select()
                            .from(db_1.schema.users)
                            .where((0, db_1.eq)(db_1.schema.users.supabaseUserId, user.id))
                            .limit(1)];
                case 1:
                    bySupabaseId = (_b.sent())[0];
                    if (!(bySupabaseId !== null && bySupabaseId !== void 0)) return [3 /*break*/, 2];
                    _a = bySupabaseId;
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.schema.users)
                        .where((0, db_1.eq)(db_1.schema.users.email, email))
                        .limit(1)];
                case 3:
                    _a = (_b.sent())[0];
                    _b.label = 4;
                case 4:
                    localUser = _a;
                    if (!localUser) return [3 /*break*/, 7];
                    needsUpdate = localUser.email !== email ||
                        localUser.supabaseUserId !== user.id ||
                        (!!emailVerified && !localUser.emailVerified);
                    if (!needsUpdate) return [3 /*break*/, 6];
                    return [4 /*yield*/, db_1.db
                            .update(db_1.schema.users)
                            .set({
                            email: email,
                            supabaseUserId: user.id,
                            emailVerified: emailVerified !== null && emailVerified !== void 0 ? emailVerified : localUser.emailVerified,
                        })
                            .where((0, db_1.eq)(db_1.schema.users.id, localUser.id))];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6: return [2 /*return*/, __assign(__assign({}, localUser), { email: email, supabaseUserId: user.id, emailVerified: emailVerified !== null && emailVerified !== void 0 ? emailVerified : localUser.emailVerified })];
                case 7:
                    created = {
                        id: crypto.randomUUID(),
                        email: email,
                        supabaseUserId: user.id,
                        emailVerified: emailVerified,
                        createdAt: new Date(),
                    };
                    return [4 /*yield*/, db_1.db.insert(db_1.schema.users).values(created)];
                case 8:
                    _b.sent();
                    return [2 /*return*/, created];
            }
        });
    });
}
function ensurePublisherProfile(localUser, user) {
    return __awaiter(this, void 0, void 0, function () {
        var existingPublisher, requestedAgentName, agentNameConflict, publisher;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!db_1.db) {
                        throw new Error("Database not connected.");
                    }
                    return [4 /*yield*/, db_1.db
                            .select()
                            .from(db_1.schema.publisherProfiles)
                            .where((0, db_1.eq)(db_1.schema.publisherProfiles.userId, localUser.id))
                            .limit(1)];
                case 1:
                    existingPublisher = (_a.sent())[0];
                    if (existingPublisher) {
                        return [2 /*return*/, { publisher: existingPublisher }];
                    }
                    requestedAgentName = getRequestedAgentName(user);
                    if (!requestedAgentName) {
                        return [2 /*return*/, {
                                publisher: null,
                                issue: "Publisher profile required. Add an agentName to your Supabase user metadata, then sign in again.",
                            }];
                    }
                    return [4 /*yield*/, db_1.db
                            .select()
                            .from(db_1.schema.publisherProfiles)
                            .where((0, db_1.eq)(db_1.schema.publisherProfiles.agentName, requestedAgentName))
                            .limit(1)];
                case 2:
                    agentNameConflict = (_a.sent())[0];
                    if (agentNameConflict) {
                        return [2 /*return*/, {
                                publisher: null,
                                issue: "Agent name \"".concat(requestedAgentName, "\" is already taken."),
                            }];
                    }
                    publisher = {
                        id: crypto.randomUUID(),
                        userId: localUser.id,
                        agentName: requestedAgentName,
                        createdAt: new Date(),
                    };
                    return [4 /*yield*/, db_1.db.insert(db_1.schema.publisherProfiles).values(publisher)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { publisher: publisher }];
            }
        });
    });
}
function authenticateSupabaseAccessToken(token) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, _a, data, error, localUser, _b, publisher, issue;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!db_1.db) {
                        throw new Error("Database not connected.");
                    }
                    supabase = getSupabaseAdminClient();
                    return [4 /*yield*/, supabase.auth.getUser(token)];
                case 1:
                    _a = _d.sent(), data = _a.data, error = _a.error;
                    if (error || !data.user) {
                        throw new SupabaseAccessTokenError("Invalid or expired Supabase access token.");
                    }
                    return [4 /*yield*/, syncLocalUser(data.user)];
                case 2:
                    localUser = _d.sent();
                    return [4 /*yield*/, ensurePublisherProfile(localUser, data.user)];
                case 3:
                    _b = _d.sent(), publisher = _b.publisher, issue = _b.issue;
                    return [2 /*return*/, {
                            userId: localUser.id,
                            supabaseUserId: data.user.id,
                            email: localUser.email,
                            publisherId: publisher === null || publisher === void 0 ? void 0 : publisher.id,
                            publisherName: (_c = publisher === null || publisher === void 0 ? void 0 : publisher.agentName) !== null && _c !== void 0 ? _c : null,
                            publisherIssue: issue,
                        }];
            }
        });
    });
}
function shouldUseLegacyTestAuth() {
    return isTest;
}
