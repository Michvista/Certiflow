"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Violation_entity_1 = require("../src/domain/entities/Violation.entity");
describe('ViolationEntity', () => {
    const makeViolation = (isResolved = false) => new Violation_entity_1.ViolationEntity({
        id: 'viol-123',
        reportId: 'report-456',
        ruleReference: 'OSHA §1926.651',
        severity: 'CRITICAL',
        description: 'No competent person inspection before excavation',
        suggestion: 'Assign a competent person immediately',
        isResolved,
        detectedAt: new Date(),
    });
    describe('canBeResolved()', () => {
        it('returns true when not yet resolved', () => {
            expect(makeViolation(false).canBeResolved()).toBe(true);
        });
        it('returns false when already resolved', () => {
            expect(makeViolation(true).canBeResolved()).toBe(false);
        });
    });
    describe('requiresImmediateAttention()', () => {
        it('returns true for unresolved CRITICAL violations', () => {
            expect(makeViolation(false).requiresImmediateAttention()).toBe(true);
        });
        it('returns false for resolved CRITICAL violations', () => {
            expect(makeViolation(true).requiresImmediateAttention()).toBe(false);
        });
    });
    describe('resolve()', () => {
        it('returns new entity with isResolved = true', () => {
            const resolved = makeViolation(false).resolve();
            expect(resolved.isResolved).toBe(true);
        });
        it('throws if already resolved', () => {
            expect(() => makeViolation(true).resolve()).toThrow();
        });
    });
});
//# sourceMappingURL=Violation.entity.test.js.map