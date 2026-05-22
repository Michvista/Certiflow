interface ProjectProps {
  id: string
  name: string
  location: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export class ProjectEntity {
  private props: ProjectProps

  constructor(props: ProjectProps) {
    this.props = props
  }

  get id() { return this.props.id }
  get name() { return this.props.name }
  get location() { return this.props.location }
  get userId() { return this.props.userId }
  get createdAt() { return this.props.createdAt }
  get updatedAt() { return this.props.updatedAt }

  rename(name: string) {
    return new ProjectEntity({
      ...this.props,
      name,
      updatedAt: new Date(),
    })
  }

  relocate(location: string) {
    return new ProjectEntity({
      ...this.props,
      location,
      updatedAt: new Date(),
    })
  }

  static create(props: Omit<ProjectProps, 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return new ProjectEntity({
      ...props,
      createdAt: now,
      updatedAt: now,
    })
  }

  toObject(): ProjectProps {
    return { ...this.props }
  }
}
