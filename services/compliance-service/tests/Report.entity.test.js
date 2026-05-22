"use strict";
// ============================================================
// TEST — Report Entity (Domain Layer)
//
// Run: npm test
// This tests pure business logic — no database, no HTTP needed.
// That's the beauty of DDD: domain tests are fast and simple.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
const Report_entity_1 = require("../src/domain/entities/Report.entity");
describe('ReportEntity', () => {
    const makeReport = (status = 'PENDING') => new Report_entity_1.ReportEntity({
        id: 'report-123',
        projectId: 'project-456',
        reportType: 'DAILY_SAFETY_LOG',
        fileUrl: 'https://cloudinary.com/test.pdf',
        status,
        uploadedAt: new Date(),
    });
    // ─── canBeAnalyzed ────────────────────────────────────────
    describe('canBeAnalyzed()', () => {
        it('returns true when status is PENDING', () => {
            const report = makeReport('PENDING');
            expect(report.canBeAnalyzed()).toBe(true);
        });
        it('returns false when status is ANALYZING', () => {
            const report = makeReport('ANALYZING');
            expect(report.canBeAnalyzed()).toBe(false);
        });
        it('returns false when status is COMPLETE', () => {
            const report = makeReport('COMPLETE');
            expect(report.canBeAnalyzed()).toBe(false);
        });
    });
    // ─── markAsAnalyzing ──────────────────────────────────────
    describe('markAsAnalyzing()', () => {
        it('returns new ReportEntity with ANALYZING status', () => {
            const report = makeReport('PENDING');
            const updated = report.markAsAnalyzing();
            expect(updated.status).toBe('ANALYZING');
        });
        it('does not mutate the original entity', () => {
            const report = makeReport('PENDING');
            report.markAsAnalyzing();
            expect(report.status).toBe('PENDING');
        });
        it('throws if report is not PENDING', () => {
            const report = makeReport('COMPLETE');
            expect(() => report.markAsAnalyzing()).toThrow();
        });
    });
    // ─── markAsComplete ───────────────────────────────────────
    describe('markAsComplete()', () => {
        it('returns new ReportEntity with COMPLETE status', () => {
            const report = makeReport('ANALYZING');
            const updated = report.markAsComplete();
            expect(updated.status).toBe('COMPLETE');
        });
        it('throws if report is not ANALYZING', () => {
            const report = makeReport('PENDING');
            expect(() => report.markAsComplete()).toThrow();
        });
    });
    // ─── isFailed ─────────────────────────────────────────────
    describe('isFailed()', () => {
        it('returns true when status is FAILED', () => {
            const report = makeReport('FAILED');
            expect(report.isFailed()).toBe(true);
        });
        it('returns false when status is COMPLETE', () => {
            const report = makeReport('COMPLETE');
            expect(report.isFailed()).toBe(false);
        });
    });
    // ─── ReportEntity.create ──────────────────────────────────
    describe('ReportEntity.create()', () => {
        it('creates a report with PENDING status', () => {
            const report = Report_entity_1.ReportEntity.create({
                id: 'new-id',
                projectId: 'proj-1',
                reportType: 'SITE_PHOTO',
                fileUrl: 'https://example.com/file.pdf',
            });
            expect(report.status).toBe('PENDING');
        });
        it('sets uploadedAt to current date', () => {
            const before = new Date();
            const report = Report_entity_1.ReportEntity.create({
                id: 'new-id',
                projectId: 'proj-1',
                reportType: 'SITE_PHOTO',
                fileUrl: 'https://example.com/file.pdf',
            });
            expect(report.uploadedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });
    });
});
//# sourceMappingURL=Report.entity.test.js.map