export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public hint?: string
  ) {
    super(message)
    this.name = "ApiError"
  }

  toString() {
    return `[${this.status}] ${this.message}`
  }
}

export class AuthError extends Error {
  constructor(message?: string) {
    super(message ?? 'Not authenticated. Run "oatmeal login" first.')
    this.name = "AuthError"
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

export class ScopeError extends ApiError {
  constructor(
    public requiredScope: string,
    public currentScopes?: string[]
  ) {
    super(
      403,
      `Missing required scope: ${requiredScope}`,
      `Your API key needs the "${requiredScope}" scope. Create a new key with the required scope at your dashboard.`
    )
    this.name = "ScopeError"
  }
}
