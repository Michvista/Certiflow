import { ViolationSeverity } from '@certiflow/shared'

interface ViolationProps {
  id: string
  reportId: string
  ruleReference: string
  severity: ViolationSeverity
  description: string
  suggestion: string
  sector?: string
  isResolved: boolean
  detectedAt: Date
}

export class ViolationEntity {
  private props: ViolationProps

  constructor(props: ViolationProps) {
    this.props = props
  }

  get id() { return this.props.id }
  get reportId() { return this.props.reportId }
  get ruleReference() { return this.props.ruleReference }
  get severity() { return this.props.severity }
  get description() { return this.props.description }
  get suggestion() { return this.props.suggestion }
  get sector() { return this.props.sector }
  get isResolved() { return this.props.isResolved }
  get detectedAt() { return this.props.detectedAt }

  requiresImmediateAttention(): boolean {
    return this.props.severity === 'CRITICAL' && !this.props.isResolved
  }

  canBeResolved(): boolean {
    return !this.props.isResolved
  }

  resolve(): ViolationEntity {
    if (!this.canBeResolved()) {
      throw new Error(`Violation ${this.id} is already resolved`)
    }

    return new ViolationEntity({ ...this.props, isResolved: true })
  }

  static create(props: Omit<ViolationProps, 'isResolved' | 'detectedAt'>): ViolationEntity {
    return new ViolationEntity({
      ...props,
      isResolved: false,
      detectedAt: new Date(),
    })
  }

  toObject(): ViolationProps {
    return { ...this.props }
  }
}
