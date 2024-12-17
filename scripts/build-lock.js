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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLock = void 0;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var BuildLock = /** @class */ (function () {
    function BuildLock() {
        this.configPath = path.resolve(process.cwd(), 'build-lock.json');
        this.config = this.loadConfig();
    }
    BuildLock.prototype.loadConfig = function () {
        try {
            var configContent = fs.readFileSync(this.configPath, 'utf-8');
            return JSON.parse(configContent);
        }
        catch (error) {
            throw new Error('Failed to load build-lock.json');
        }
    };
    BuildLock.prototype.validateCurrentPhase = function () {
        var _a = this.config, currentPhase = _a.currentPhase, phases = _a.phases;
        var phase = phases[currentPhase];
        if (!phase) {
            throw new Error("Invalid phase: ".concat(currentPhase));
        }
        if (phase.requiresPhase) {
            var requiredPhase = phases[phase.requiresPhase];
            if (requiredPhase.locked) {
                throw new Error("Phase ".concat(currentPhase, " requires completion of phase ").concat(phase.requiresPhase));
            }
        }
    };
    BuildLock.prototype.validateCurrentWeek = function () {
        var _a;
        var _b = this.config, currentPhase = _b.currentPhase, currentWeek = _b.currentWeek, phases = _b.phases;
        var phase = phases[currentPhase];
        var week = (_a = phase.weeks) === null || _a === void 0 ? void 0 : _a[currentWeek];
        if (!week) {
            throw new Error("Invalid week: ".concat(currentWeek, " in phase ").concat(currentPhase));
        }
        // Validate required files
        if (week.requiredFiles) {
            for (var _i = 0, _c = week.requiredFiles; _i < _c.length; _i++) {
                var file = _c[_i];
                var filePath = path.resolve(process.cwd(), file);
                if (!fs.existsSync(filePath)) {
                    throw new Error("Required file missing for week ".concat(currentWeek, ": ").concat(file));
                }
            }
        }
        // Validate required dependencies
        if (week.requiredDependencies) {
            var packageJsonPath = path.resolve(process.cwd(), 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error('package.json not found');
            }
            var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            var dependencies = __assign(__assign({}, packageJson.dependencies), packageJson.devDependencies);
            for (var _d = 0, _e = week.requiredDependencies; _d < _e.length; _d++) {
                var dep = _e[_d];
                if (!dependencies[dep]) {
                    throw new Error("Required dependency missing for week ".concat(currentWeek, ": ").concat(dep));
                }
            }
        }
    };
    BuildLock.prototype.advancePhase = function () {
        var nextPhase = String(Number(this.config.currentPhase) + 1);
        if (!this.config.phases[nextPhase]) {
            throw new Error('No more phases to advance to');
        }
        this.config.currentPhase = nextPhase;
        this.config.currentWeek = '1';
        this.config.currentDay = '1';
        this.saveConfig();
    };
    BuildLock.prototype.advanceWeek = function () {
        var _a;
        var nextWeek = String(Number(this.config.currentWeek) + 1);
        var phase = this.config.phases[this.config.currentPhase];
        if (!((_a = phase.weeks) === null || _a === void 0 ? void 0 : _a[nextWeek])) {
            throw new Error('No more weeks in this phase');
        }
        this.config.currentWeek = nextWeek;
        this.config.currentDay = '1';
        this.saveConfig();
    };
    BuildLock.prototype.advanceDay = function () {
        var nextDay = String(Number(this.config.currentDay) + 1);
        if (Number(nextDay) > 5) {
            throw new Error('No more days in this week');
        }
        this.config.currentDay = nextDay;
        this.saveConfig();
    };
    BuildLock.prototype.saveConfig = function () {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    };
    BuildLock.prototype.getCurrentStatus = function () {
        var _a;
        var _b = this.config, currentPhase = _b.currentPhase, currentWeek = _b.currentWeek, currentDay = _b.currentDay, phases = _b.phases;
        var phase = phases[currentPhase];
        var week = (_a = phase.weeks) === null || _a === void 0 ? void 0 : _a[currentWeek];
        return "\nCurrent Status:\nPhase: ".concat(currentPhase, " - ").concat(phase.name, "\nWeek: ").concat(currentWeek, " - ").concat((week === null || week === void 0 ? void 0 : week.name) || 'N/A', "\nDay: ").concat(currentDay, "\n    ").trim();
    };
    return BuildLock;
}());
exports.buildLock = new BuildLock();
