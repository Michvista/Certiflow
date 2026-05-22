import { ApiResponse } from '../types';
type LogMeta = Record<string, unknown> | undefined;
export declare function createLogger(serviceName: string): {
    info: (message: string, meta?: LogMeta) => void;
    warn: (message: string, meta?: LogMeta) => void;
    error: (message: string, meta?: LogMeta) => void;
    debug: (message: string, meta?: LogMeta) => void;
};
export declare function successResponse<T>(data: T, message?: string): ApiResponse<T>;
export declare function errorResponse(error: string, errors?: Record<string, string[]>): ApiResponse;
export declare class NotFoundError extends Error {
    statusCode: number;
    constructor(resource: string);
}
export declare class ValidationError extends Error {
    statusCode: number;
    constructor(message: string);
}
export declare class UnauthorizedError extends Error {
    statusCode: number;
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends Error {
    statusCode: number;
    constructor(service: string);
}
export {};
