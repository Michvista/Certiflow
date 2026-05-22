describe('Auditor Response Parsing', () => {
  it('correctly parses a valid Gemini JSON response', () => {
    const validResponse = JSON.stringify({
      violations: [
        {
          severity: 'CRITICAL',
          ruleReference: 'OSHA §1926.651(k)(1)',
          description: 'No daily excavation inspection performed',
          suggestion: 'Assign competent person to Sector 4 immediately',
          sector: 'Sector 4',
        },
      ],
      summary: '1 critical violation found.',
      actionableCount: 1,
    })

    const cleaned = validResponse.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    expect(parsed.violations).toHaveLength(1)
    expect(parsed.violations[0].severity).toBe('CRITICAL')
    expect(parsed.violations[0].ruleReference).toBe('OSHA §1926.651(k)(1)')
    expect(parsed.actionableCount).toBe(1)
  })

  it('handles Gemini response wrapped in markdown code fences', () => {
    const wrappedResponse = `\`\`\`json
    {
      "violations": [],
      "summary": "No violations found.",
      "actionableCount": 0
    }
    \`\`\``

    const cleaned = wrappedResponse.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    expect(parsed.violations).toHaveLength(0)
    expect(parsed.summary).toBe('No violations found.')
  })

  it('returns empty violations array when JSON is malformed', () => {
    const malformed = 'This is not JSON at all'

    let result
    try {
      const cleaned = malformed.replace(/```json|```/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      result = {
        violations: [],
        summary: 'AI analysis could not be parsed. Manual review required.',
        actionableCount: 0,
      }
    }

    expect(result.violations).toHaveLength(0)
    expect(result.summary).toContain('Manual review required')
  })
})
