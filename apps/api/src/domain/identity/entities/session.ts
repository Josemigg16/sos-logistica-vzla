export interface SessionProps {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

/**
 * Aggregate Root separado del User: una sesión vive y muere por su cuenta.
 * Un usuario puede tener varias (celular, tablet del centro). Se referencia
 * al User por id, nunca por navegación de objetos.
 */
export class Session {
  private constructor(private props: SessionProps) {}

  static rehydrate(props: SessionProps): Session {
    return new Session(props);
  }

  static issue(input: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Session {
    return new Session({
      id: input.id,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      revokedAt: null,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get refreshTokenHash(): string {
    return this.props.refreshTokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get isActive(): boolean {
    return this.props.revokedAt === null && this.props.expiresAt > new Date();
  }

  revoke(): void {
    if (this.props.revokedAt === null) this.props.revokedAt = new Date();
  }
}
