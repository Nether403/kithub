"use strict";
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
exports.kitRoutes = void 0;
var zod_1 = require("zod");
// ── Request Validation Schemas ──────────────────────────────────
var PublishBodySchema = zod_1.z.object({
    rawMarkdown: zod_1.z.string().min(50, "rawMarkdown is required and must be at least 50 characters"),
});
var LearningBodySchema = zod_1.z.object({
    context: zod_1.z.object({
        os: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
        runtime: zod_1.z.string().optional(),
        platform: zod_1.z.string().optional(),
    }).optional().default({}),
    payload: zod_1.z.string().min(10, "payload is required (at least 10 characters)"),
});
var SearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().max(200).optional(),
    tag: zod_1.z.string().max(50).optional(),
    sort: zod_1.z.enum(["installs", "score", "newest"]).optional().default("newest"),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
});
var db_1 = require("@kithub/db");
var schema_1 = require("@kithub/schema");
var auth_1 = require("../middleware/auth");
var notifications_1 = require("../services/notifications");
var kitRoutes = function (fastify) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        fastify.get("/", function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var parsed, _a, q, tag, sort, page, limit, sortBy, pageNum, limitNum, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        parsed = SearchQuerySchema.safeParse(request.query);
                        if (!parsed.success) {
                            return [2 /*return*/, reply.code(400).send({
                                    error: "Validation Error",
                                    message: parsed.error.issues.map(function (i) { return i.message; }).join("; "),
                                    statusCode: 400,
                                })];
                        }
                        _a = parsed.data, q = _a.q, tag = _a.tag, sort = _a.sort, page = _a.page, limit = _a.limit;
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        sortBy = sort;
                        pageNum = page;
                        limitNum = limit;
                        return [4 /*yield*/, (0, db_1.searchKitsPaginated)({
                                query: q,
                                tag: tag,
                                sort: sortBy,
                                page: pageNum,
                                limit: limitNum,
                            })];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, result];
                }
            });
        }); });
        fastify.get("/trending", function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var trending;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getTrendingKits)(3)];
                    case 1:
                        trending = _a.sent();
                        return [2 /*return*/, { kits: trending }];
                }
            });
        }); });
        fastify.get("/mine", { preHandler: [auth_1.requirePublisher] }, function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var jwtUser, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        jwtUser = request.authUser;
                        return [4 /*yield*/, (0, db_1.getKitsByPublisherId)(jwtUser.publisherId)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, { kits: result.kits, total: result.total }];
                }
            });
        }); });
        fastify.get("/:slug", function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var slug, enriched, release, learnings, scan, _a;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        slug = request.params.slug;
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getEnrichedKitBySlug)(slug)];
                    case 1:
                        enriched = _d.sent();
                        if (!enriched) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "Kit \"".concat(slug, "\" not found."),
                                    statusCode: 404,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getLatestRelease)(slug)];
                    case 2:
                        release = _d.sent();
                        return [4 /*yield*/, (0, db_1.getLearningsCount)(slug)];
                    case 3:
                        learnings = _d.sent();
                        if (!release) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, db_1.getLatestScan)(release.id)];
                    case 4:
                        _a = _d.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _a = null;
                        _d.label = 6;
                    case 6:
                        scan = _a;
                        return [2 /*return*/, {
                                slug: enriched.slug,
                                title: enriched.title,
                                summary: enriched.summary,
                                publisherName: enriched.publisherName,
                                version: enriched.version,
                                rawMarkdown: (_b = release === null || release === void 0 ? void 0 : release.rawMarkdown) !== null && _b !== void 0 ? _b : "",
                                parsedFrontmatter: release === null || release === void 0 ? void 0 : release.parsedFrontmatter,
                                conformanceLevel: (_c = release === null || release === void 0 ? void 0 : release.conformanceLevel) !== null && _c !== void 0 ? _c : "standard",
                                tags: enriched.tags,
                                installs: enriched.installs,
                                learningsCount: learnings,
                                scan: scan ? { score: scan.score, status: scan.status, findings: scan.findings } : null,
                                createdAt: enriched.createdAt,
                                updatedAt: enriched.updatedAt,
                            }];
                }
            });
        }); });
        fastify.get("/:slug/install", function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var slug, target, kit, release, frontmatter, parsed, payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        slug = request.params.slug;
                        target = request.query.target;
                        if (!target) {
                            return [2 /*return*/, reply.code(400).send({
                                    error: "Validation Error",
                                    message: "?target= parameter is required. Specify the agent harness to receive targeted install instructions.",
                                    statusCode: 400,
                                    allowedTargets: schema_1.SUPPORTED_TARGETS,
                                    example: "/api/kits/".concat(slug, "/install?target=claude-code"),
                                })];
                        }
                        if (!(0, schema_1.isValidTarget)(target)) {
                            return [2 /*return*/, reply.code(400).send({
                                    error: "Validation Error",
                                    message: "Invalid target: \"".concat(target, "\"."),
                                    statusCode: 400,
                                    allowedTargets: schema_1.SUPPORTED_TARGETS,
                                })];
                        }
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getKitBySlug)(slug)];
                    case 1:
                        kit = _a.sent();
                        if (!kit) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "Kit \"".concat(slug, "\" not found."),
                                    statusCode: 404,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getLatestRelease)(slug)];
                    case 2:
                        release = _a.sent();
                        if (!release) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "No published release for this kit.",
                                    statusCode: 404,
                                })];
                        }
                        try {
                            parsed = (0, schema_1.parseKitMd)(release.rawMarkdown);
                            frontmatter = parsed.frontmatter;
                        }
                        catch (_b) {
                            frontmatter = release.parsedFrontmatter;
                        }
                        if (!frontmatter) {
                            return [2 /*return*/, reply.code(500).send({
                                    error: "Internal Server Error",
                                    message: "Unable to parse kit frontmatter.",
                                    statusCode: 500,
                                })];
                        }
                        return [4 /*yield*/, db_1.db.insert(db_1.schema.kitInstallEvents).values({ kitSlug: slug, target: target })];
                    case 3:
                        _a.sent();
                        (0, notifications_1.notifyOnInstall)(slug).catch(function (err) {
                            fastify.log.error({ err: err, kitSlug: slug }, "Install notification trigger failed");
                        });
                        payload = (0, schema_1.generateInstallPayload)({ frontmatter: frontmatter, rawMarkdown: release.rawMarkdown }, target);
                        return [2 /*return*/, __assign(__assign({}, payload), { rawMarkdown: release.rawMarkdown })];
                }
            });
        }); });
        fastify.post("/", {
            preHandler: [auth_1.requirePublisher],
            config: {
                rateLimit: {
                    max: 10,
                    timeWindow: "1 minute",
                },
            },
        }, function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var parsed, rawMarkdown, kitData, scanResult, jwtUser, existingKit, releaseId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parsed = PublishBodySchema.safeParse(request.body);
                        if (!parsed.success) {
                            return [2 /*return*/, reply.code(400).send({
                                    error: "Validation Error",
                                    message: parsed.error.issues.map(function (i) { return i.message; }).join("; "),
                                    statusCode: 400,
                                })];
                        }
                        rawMarkdown = parsed.data.rawMarkdown;
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        try {
                            kitData = (0, schema_1.parseKitMd)(rawMarkdown);
                        }
                        catch (err) {
                            return [2 /*return*/, reply.code(422).send({
                                    error: "Validation Error",
                                    message: "Kit validation failed.",
                                    statusCode: 422,
                                    details: err.message,
                                })];
                        }
                        scanResult = (0, schema_1.scanKit)(rawMarkdown, kitData.frontmatter);
                        jwtUser = request.authUser;
                        return [4 /*yield*/, (0, db_1.getKitBySlug)(kitData.frontmatter.slug)];
                    case 1:
                        existingKit = _a.sent();
                        if (!existingKit) return [3 /*break*/, 3];
                        if (existingKit.publisherId !== jwtUser.publisherId) {
                            return [2 /*return*/, reply.code(403).send({
                                    error: "Forbidden",
                                    message: "You don't own this kit slug.",
                                    statusCode: 403,
                                })];
                        }
                        return [4 /*yield*/, db_1.db.update(db_1.schema.kits)
                                .set({ title: kitData.frontmatter.title, summary: kitData.frontmatter.summary, updatedAt: new Date() })
                                .where((0, db_1.eq)(db_1.schema.kits.slug, kitData.frontmatter.slug))];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, db_1.db.insert(db_1.schema.kits).values({
                            slug: kitData.frontmatter.slug,
                            publisherId: jwtUser.publisherId,
                            title: kitData.frontmatter.title,
                            summary: kitData.frontmatter.summary,
                        })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        releaseId = crypto.randomUUID();
                        return [4 /*yield*/, db_1.db.insert(db_1.schema.kitReleases).values({
                                id: releaseId,
                                kitSlug: kitData.frontmatter.slug,
                                version: kitData.frontmatter.version,
                                rawMarkdown: rawMarkdown,
                                parsedFrontmatter: kitData.frontmatter,
                                conformanceLevel: kitData.conformanceLevel,
                            })];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.insert(db_1.schema.kitReleaseScans).values({
                                releaseId: releaseId,
                                score: scanResult.score,
                                findings: scanResult.findings,
                                status: scanResult.passed ? "passed" : "failed",
                            })];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(db_1.schema.kitTags).where((0, db_1.eq)(db_1.schema.kitTags.kitSlug, kitData.frontmatter.slug))];
                    case 8:
                        _a.sent();
                        if (!(kitData.frontmatter.tags.length > 0)) return [3 /*break*/, 10];
                        return [4 /*yield*/, db_1.db.insert(db_1.schema.kitTags).values(kitData.frontmatter.tags.map(function (tag) { return ({ kitSlug: kitData.frontmatter.slug, tag: tag }); }))];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10: return [2 /*return*/, {
                            status: scanResult.passed ? "published" : "blocked",
                            slug: kitData.frontmatter.slug,
                            version: kitData.frontmatter.version,
                            conformanceLevel: kitData.conformanceLevel,
                            scan: {
                                score: scanResult.score,
                                passed: scanResult.passed,
                                findings: scanResult.findings,
                                tips: scanResult.tips,
                            },
                        }];
                }
            });
        }); });
        fastify.delete("/:slug", { preHandler: [auth_1.requirePublisher] }, function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var slug, kit, jwtUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        slug = request.params.slug;
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getKitBySlug)(slug)];
                    case 1:
                        kit = _a.sent();
                        if (!kit) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "Kit \"".concat(slug, "\" not found."),
                                    statusCode: 404,
                                })];
                        }
                        jwtUser = request.authUser;
                        if (kit.publisherId !== jwtUser.publisherId) {
                            return [2 /*return*/, reply.code(403).send({
                                    error: "Forbidden",
                                    message: "You don't own this kit.",
                                    statusCode: 403,
                                })];
                        }
                        if (kit.unpublishedAt) {
                            return [2 /*return*/, reply.code(400).send({
                                    error: "Validation Error",
                                    message: "Kit is already unpublished.",
                                    statusCode: 400,
                                })];
                        }
                        return [4 /*yield*/, db_1.db.update(db_1.schema.kits)
                                .set({ unpublishedAt: new Date() })
                                .where((0, db_1.eq)(db_1.schema.kits.slug, slug))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { status: "unpublished", slug: slug }];
                }
            });
        }); });
        fastify.get("/:slug/versions", function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var slug, kit, versions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        slug = request.params.slug;
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getKitBySlug)(slug)];
                    case 1:
                        kit = _a.sent();
                        if (!kit) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "Kit \"".concat(slug, "\" not found."),
                                    statusCode: 404,
                                })];
                        }
                        if (kit.unpublishedAt) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "Kit \"".concat(slug, "\" has been unpublished."),
                                    statusCode: 404,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getAllReleases)(slug)];
                    case 2:
                        versions = _a.sent();
                        return [2 /*return*/, { slug: slug, versions: versions }];
                }
            });
        }); });
        fastify.post("/:slug/learnings", function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var slug, parsed, _a, context, payload, kit, count;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        slug = request.params.slug;
                        parsed = LearningBodySchema.safeParse(request.body);
                        if (!parsed.success) {
                            return [2 /*return*/, reply.code(400).send({
                                    error: "Validation Error",
                                    message: parsed.error.issues.map(function (i) { return i.message; }).join("; "),
                                    statusCode: 400,
                                })];
                        }
                        _a = parsed.data, context = _a.context, payload = _a.payload;
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getKitBySlug)(slug)];
                    case 1:
                        kit = _b.sent();
                        if (!kit) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "Kit \"".concat(slug, "\" not found."),
                                    statusCode: 404,
                                })];
                        }
                        return [4 /*yield*/, db_1.db.insert(db_1.schema.learnings).values({
                                kitSlug: slug,
                                context: context !== null && context !== void 0 ? context : {},
                                payload: payload,
                            })];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, (0, db_1.getLearningsCount)(slug)];
                    case 3:
                        count = _b.sent();
                        (0, notifications_1.notifyOnLearning)(slug).catch(function (err) {
                            fastify.log.error({ err: err, kitSlug: slug }, "Learning notification trigger failed");
                        });
                        return [2 /*return*/, { status: "submitted", kitSlug: slug, totalLearnings: count }];
                }
            });
        }); });
        fastify.get("/:slug/analytics", { preHandler: [auth_1.requirePublisher] }, function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var slug, kit, jwtUser, _a, dailyInstalls, byTarget, totalInstalls;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        slug = request.params.slug;
                        if (!db_1.db) {
                            return [2 /*return*/, reply.code(503).send({
                                    error: "Service Unavailable",
                                    message: "Database not connected.",
                                    statusCode: 503,
                                })];
                        }
                        return [4 /*yield*/, (0, db_1.getKitBySlug)(slug)];
                    case 1:
                        kit = _b.sent();
                        if (!kit) {
                            return [2 /*return*/, reply.code(404).send({
                                    error: "Not Found",
                                    message: "Kit \"".concat(slug, "\" not found."),
                                    statusCode: 404,
                                })];
                        }
                        jwtUser = request.authUser;
                        if (kit.publisherId !== jwtUser.publisherId) {
                            return [2 /*return*/, reply.code(403).send({
                                    error: "Forbidden",
                                    message: "You don't own this kit.",
                                    statusCode: 403,
                                })];
                        }
                        return [4 /*yield*/, Promise.all([
                                (0, db_1.getDailyInstalls)(slug, 30),
                                (0, db_1.getInstallsByTarget)(slug),
                                (0, db_1.getInstallCount)(slug),
                            ])];
                    case 2:
                        _a = _b.sent(), dailyInstalls = _a[0], byTarget = _a[1], totalInstalls = _a[2];
                        return [2 /*return*/, {
                                slug: slug,
                                totalInstalls: totalInstalls,
                                dailyInstalls: dailyInstalls,
                                byTarget: byTarget,
                            }];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.kitRoutes = kitRoutes;
