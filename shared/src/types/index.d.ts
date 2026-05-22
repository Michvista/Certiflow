export type ReportStatus = 'PENDING' | 'ANALYZING' | 'COMPLETE' | 'FAILED';
export type ViolationSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';
export type ReportType = 'DAILY_SAFETY_LOG' | 'SITE_PHOTO' | 'INCIDENT_REPORT';
export interface Project {
    id: string;
    name: string;
    location: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Report {
    id: string;
    projectId: string;
    reportType: ReportType;
    fileUrl: string;
    status: ReportStatus;
    notes?: string;
    uploadedAt: Date;
}
export interface Violation {
    id: string;
    reportId: string;
    ruleReference: string;
    severity: ViolationSeverity;
    description: string;
    suggestion: string;
    sector?: string;
    isResolved: boolean;
    detectedAt: Date;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
}
export interface AuditJobPayload {
    reportId: string;
    fileUrl: string;
    projectId: string;
    projectName: string;
    reportType: ReportType;
}
export interface AuditViolationResult {
    severity: ViolationSeverity;
    ruleReference: string;
    description: string;
    suggestion: string;
    sector?: string;
}
export interface AuditResult {
    violations: AuditViolationResult[];
    summary: string;
    actionableCount: number;
}
export interface JwtPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}
