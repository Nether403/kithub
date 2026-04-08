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
exports.notifyOnInstall = notifyOnInstall;
exports.notifyOnLearning = notifyOnLearning;
var db_1 = require("@kithub/db");
var nodemailer_1 = require("nodemailer");
var NOTIFICATION_TYPES = {
    INSTALL: "install",
    LEARNING: "learning",
};
function sendEmail(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var smtpUrl, fromAddress, transport, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    smtpUrl = process.env.SMTP_URL;
                    fromAddress = process.env.EMAIL_FROM || "noreply@kithub.dev";
                    if (!smtpUrl) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    transport = (0, nodemailer_1.createTransport)(smtpUrl);
                    return [4 /*yield*/, transport.sendMail({
                            from: fromAddress,
                            to: payload.to,
                            subject: payload.subject,
                            text: payload.text,
                            html: payload.html,
                        })];
                case 2:
                    _a.sent();
                    console.log("[notifications] Email sent to ".concat(payload.to, ": ").concat(payload.subject));
                    return [2 /*return*/, true];
                case 3:
                    err_1 = _a.sent();
                    console.error("[notifications] Email send failed: ".concat(err_1.message));
                    return [2 /*return*/, false];
                case 4:
                    console.log("[notifications] (dev mode) Email to ".concat(payload.to, ":"));
                    console.log("  Subject: ".concat(payload.subject));
                    console.log("  Body: ".concat(payload.text));
                    return [2 /*return*/, true];
            }
        });
    });
}
var dashboardUrl = process.env.WEB_URL || "http://localhost:3000";
function notifyOnInstall(kitSlug) {
    return __awaiter(this, void 0, void 0, function () {
        var owner, alreadyNotified, kit, kitTitle, installs, sent, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, (0, db_1.getPublisherByKitSlug)(kitSlug)];
                case 1:
                    owner = _a.sent();
                    if (!owner)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, db_1.wasNotifiedRecently)(owner.publisher.id, kitSlug, NOTIFICATION_TYPES.INSTALL)];
                case 2:
                    alreadyNotified = _a.sent();
                    if (alreadyNotified)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, db_1.getKitBySlug)(kitSlug)];
                case 3:
                    kit = _a.sent();
                    kitTitle = (kit === null || kit === void 0 ? void 0 : kit.title) || kitSlug;
                    return [4 /*yield*/, (0, db_1.getInstallCount)(kitSlug)];
                case 4:
                    installs = _a.sent();
                    return [4 /*yield*/, sendEmail({
                            to: owner.user.email,
                            subject: "Your kit \"".concat(kitTitle, "\" was installed!"),
                            text: [
                                "Great news! Your kit \"".concat(kitTitle, "\" (").concat(kitSlug, ") was just installed."),
                                "",
                                "Total installs: ".concat(installs),
                                "",
                                "View your dashboard: ".concat(dashboardUrl, "/dashboard"),
                            ].join("\n"),
                            html: [
                                "<h2>Your kit was installed!</h2>",
                                "<p>Great news! Your kit <strong>".concat(kitTitle, "</strong> (<code>").concat(kitSlug, "</code>) was just installed.</p>"),
                                "<p>Total installs: <strong>".concat(installs, "</strong></p>"),
                                "<p><a href=\"".concat(dashboardUrl, "/dashboard\">View your dashboard</a></p>"),
                            ].join("\n"),
                        })];
                case 5:
                    sent = _a.sent();
                    if (!sent) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, db_1.recordNotification)(owner.publisher.id, kitSlug, NOTIFICATION_TYPES.INSTALL)];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 7:
                    console.error("[notifications] Email delivery failed for install of ".concat(kitSlug, ", will retry on next event"));
                    _a.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    err_2 = _a.sent();
                    console.error("[notifications] Install notification error for ".concat(kitSlug, ": ").concat(err_2.message));
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function notifyOnLearning(kitSlug) {
    return __awaiter(this, void 0, void 0, function () {
        var owner, alreadyNotified, kit, kitTitle, learnings, sent, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, (0, db_1.getPublisherByKitSlug)(kitSlug)];
                case 1:
                    owner = _a.sent();
                    if (!owner)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, db_1.wasNotifiedRecently)(owner.publisher.id, kitSlug, NOTIFICATION_TYPES.LEARNING)];
                case 2:
                    alreadyNotified = _a.sent();
                    if (alreadyNotified)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, db_1.getKitBySlug)(kitSlug)];
                case 3:
                    kit = _a.sent();
                    kitTitle = (kit === null || kit === void 0 ? void 0 : kit.title) || kitSlug;
                    return [4 /*yield*/, (0, db_1.getLearningsCount)(kitSlug)];
                case 4:
                    learnings = _a.sent();
                    return [4 /*yield*/, sendEmail({
                            to: owner.user.email,
                            subject: "New community learning for \"".concat(kitTitle, "\""),
                            text: [
                                "Someone submitted a learning for your kit \"".concat(kitTitle, "\" (").concat(kitSlug, ")."),
                                "",
                                "Total learnings: ".concat(learnings),
                                "",
                                "View your dashboard: ".concat(dashboardUrl, "/dashboard"),
                            ].join("\n"),
                            html: [
                                "<h2>New community learning!</h2>",
                                "<p>Someone submitted a learning for your kit <strong>".concat(kitTitle, "</strong> (<code>").concat(kitSlug, "</code>).</p>"),
                                "<p>Total learnings: <strong>".concat(learnings, "</strong></p>"),
                                "<p><a href=\"".concat(dashboardUrl, "/dashboard\">View your dashboard</a></p>"),
                            ].join("\n"),
                        })];
                case 5:
                    sent = _a.sent();
                    if (!sent) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, db_1.recordNotification)(owner.publisher.id, kitSlug, NOTIFICATION_TYPES.LEARNING)];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 7:
                    console.error("[notifications] Email delivery failed for learning on ".concat(kitSlug, ", will retry on next event"));
                    _a.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    err_3 = _a.sent();
                    console.error("[notifications] Learning notification error for ".concat(kitSlug, ": ").concat(err_3.message));
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
