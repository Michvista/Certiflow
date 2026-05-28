import { ViolationEntity } from '../src/domain/entities/Violation.entity'
import { ViolationSeverityVO } from '../src/domain/value-objects/ViolationSeverity.vo'

describe('ViolationEntity', () => {
  const makeViolation = (isResolved = false) =>
    new ViolationEntity({
      id: 'viol-123',
      reportId: 'report-456',
      ruleReference: 'OSHA §1926.651',
      severity: ViolationSeverityVO.critical(),
      description: 'No competent person inspection before excavation',
      suggestion: 'Assign a competent person immediately',
      isResolved,
      detectedAt: new Date(),
    })

  describe('canBeResolved()', () => {
    it('returns true when not yet resolved', () => {
      expect(makeViolation(false).canBeResolved()).toBe(true)
    })

    it('returns false when already resolved', () => {
      expect(makeViolation(true).canBeResolved()).toBe(false)
    })
  })

  describe('requiresImmediateAttention()', () => {
    it('returns true for unresolved CRITICAL violations', () => {
      expect(makeViolation(false).requiresImmediateAttention()).toBe(true)
    })

    it('returns false for resolved CRITICAL violations', () => {
      expect(makeViolation(true).requiresImmediateAttention()).toBe(false)
    })

    it('returns false for unresolved non-CRITICAL violations', () => {
      const nonCriticalViolation = new ViolationEntity({
        id: 'viol-456',
        reportId: 'report-789',
        ruleReference: 'OSHA §1926.650',
        severity: ViolationSeverityVO.major(),
        description: 'Missing guardrails',
        suggestion: 'Install guardrails',
        isResolved: false,
        detectedAt: new Date(),
      })
      expect(nonCriticalViolation.requiresImmediateAttention()).toBe(false)
    })
  })

  describe('resolve()', () => {
    it('returns new entity with isResolved = true', () => {
      const resolved = makeViolation(false).resolve()
      expect(resolved.isResolved).toBe(true)
    })

    it('throws if already resolved', () => {
      expect(() => makeViolation(true).resolve()).toThrow()
    })
  })
})
