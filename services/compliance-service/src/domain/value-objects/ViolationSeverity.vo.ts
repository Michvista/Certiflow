type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR'

const SEVERITY_PRIORITY: Record<SeverityLevel, number> = {
  CRITICAL: 3,
  MAJOR: 2,
  MINOR: 1,
}

export class ViolationSeverityVO {
  private readonly level: SeverityLevel

  private constructor(level: SeverityLevel) {
    this.level = level
  }

  static critical() { return new ViolationSeverityVO('CRITICAL') }
  static major() { return new ViolationSeverityVO('MAJOR') }
  static minor() { return new ViolationSeverityVO('MINOR') }

  static fromString(value: string): ViolationSeverityVO {
    const upper = value.toUpperCase()
    if (!['CRITICAL', 'MAJOR', 'MINOR'].includes(upper)) {
      throw new Error(`Invalid severity level: "${value}". Must be CRITICAL, MAJOR, or MINOR.`)
    }

    return new ViolationSeverityVO(upper as SeverityLevel)
  }

  isCritical(): boolean { return this.level === 'CRITICAL' }
  isMajor(): boolean { return this.level === 'MAJOR' }
  isMinor(): boolean { return this.level === 'MINOR' }

  isMoreUrgentThan(other: ViolationSeverityVO): boolean {
    return SEVERITY_PRIORITY[this.level] > SEVERITY_PRIORITY[other.level]
  }

  equals(other: ViolationSeverityVO): boolean {
    return this.level === other.level
  }

  toString(): SeverityLevel {
    return this.level
  }
}
