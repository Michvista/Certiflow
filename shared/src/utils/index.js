"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.UnauthorizedError = exports.ValidationError = exports.NotFoundError = void 0;
exports.createLogger = createLogger;
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function createLogger(serviceName) {
    const write = (level, message, meta) => {
        console[level](`[${serviceName}] ${message}`, meta ?? '');
    };
    return {
        info: (message, meta) => write('log', message, meta),
        warn: (message, meta) => write('warn', message, meta),
        error: (message, meta) => write('error', message, meta),
        debug: (message, meta) => write('debug', message, meta),
    };
}
function successResponse(data, message) {
    return { success: true, data, message };
}
function errorResponse(error, errors) {
    return { success: false, error, errors };
}
class NotFoundError extends Error {
    constructor(resource) {
        super(`${resource} not found`);
        this.statusCode = 404;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.statusCode = 401;
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ServiceUnavailableError extends Error {
    constructor(service) {
        super(`${service} is currently unavailable`);
        this.statusCode = 503;
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
//# sourceMappingURL=index.js.map