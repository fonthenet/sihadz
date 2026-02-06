/**
 * CIRCUIT BREAKER PATTERN
 * 
 * Prevents cascade failures by temporarily stopping requests to failing services.
 * Essential for system resilience and graceful degradation.
 */

// =============================================================================
// TYPES
// =============================================================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitBreakerConfig {
  failureThreshold: number     // Number of failures before opening
  successThreshold: number     // Successes in half-open to close
  timeout: number              // Time before half-open (ms)
  monitoringPeriod: number     // Time window for failure count (ms)
}

interface CircuitBreakerState {
  state: CircuitState
  failures: number
  successes: number
  lastFailure: number | null
  openedAt: number | null
  lastStateChange: number
}

interface CircuitBreakerResult<T> {
  success: boolean
  data?: T
  error?: Error
  circuitState: CircuitState
  fromFallback: boolean
}

// =============================================================================
// CIRCUIT BREAKER STORE
// =============================================================================

const circuitBreakers = new Map<string, CircuitBreakerState>()

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const CIRCUIT_CONFIGS = {
  // Database operations
  DATABASE: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,        // 30 seconds
    monitoringPeriod: 60000, // 1 minute
  },
  
  // External API calls
  EXTERNAL_API: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,        // 1 minute
    monitoringPeriod: 120000, // 2 minutes
  },
  
  // Payment gateway
  PAYMENT: {
    failureThreshold: 2,
    successThreshold: 1,
    timeout: 120000,       // 2 minutes
    monitoringPeriod: 300000, // 5 minutes
  },
  
  // File upload/storage
  STORAGE: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,        // 1 minute
    monitoringPeriod: 120000, // 2 minutes
  },
  
  // Email/SMS notifications
  NOTIFICATIONS: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,        // 30 seconds
    monitoringPeriod: 60000, // 1 minute
  },
} as const

// =============================================================================
// CIRCUIT BREAKER CLASS
// =============================================================================

export class CircuitBreaker<T> {
  private name: string
  private config: CircuitBreakerConfig
  
  constructor(name: string, config: CircuitBreakerConfig) {
    this.name = name
    this.config = config
    
    if (!circuitBreakers.has(name)) {
      circuitBreakers.set(name, {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailure: null,
        openedAt: null,
        lastStateChange: Date.now(),
      })
    }
  }
  
  private getState(): CircuitBreakerState {
    return circuitBreakers.get(this.name)!
  }
  
  private setState(updates: Partial<CircuitBreakerState>): void {
    const current = this.getState()
    circuitBreakers.set(this.name, { ...current, ...updates })
  }
  
  private transitionTo(newState: CircuitState): void {
    const current = this.getState()
    if (current.state !== newState) {
      console.log(`[CIRCUIT:${this.name}] ${current.state} -> ${newState}`)
      this.setState({
        state: newState,
        lastStateChange: Date.now(),
        successes: 0,
        ...(newState === 'OPEN' && { openedAt: Date.now() }),
      })
    }
  }
  
  /**
   * Check if circuit should transition from OPEN to HALF_OPEN.
   */
  private checkTimeout(): void {
    const state = this.getState()
    if (state.state === 'OPEN' && state.openedAt) {
      if (Date.now() - state.openedAt >= this.config.timeout) {
        this.transitionTo('HALF_OPEN')
      }
    }
  }
  
  /**
   * Reset failure count if outside monitoring period.
   */
  private resetIfExpired(): void {
    const state = this.getState()
    if (state.lastFailure) {
      if (Date.now() - state.lastFailure >= this.config.monitoringPeriod) {
        this.setState({ failures: 0, lastFailure: null })
      }
    }
  }
  
  /**
   * Record a successful operation.
   */
  private recordSuccess(): void {
    const state = this.getState()
    
    if (state.state === 'HALF_OPEN') {
      const newSuccesses = state.successes + 1
      this.setState({ successes: newSuccesses })
      
      if (newSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED')
        this.setState({ failures: 0 })
      }
    } else if (state.state === 'CLOSED') {
      // Reset failures on success in closed state
      this.setState({ failures: 0 })
    }
  }
  
  /**
   * Record a failed operation.
   */
  private recordFailure(): void {
    const state = this.getState()
    const now = Date.now()
    
    if (state.state === 'HALF_OPEN') {
      // Any failure in half-open immediately opens circuit
      this.transitionTo('OPEN')
    } else if (state.state === 'CLOSED') {
      const newFailures = state.failures + 1
      this.setState({ failures: newFailures, lastFailure: now })
      
      if (newFailures >= this.config.failureThreshold) {
        this.transitionTo('OPEN')
      }
    }
  }
  
  /**
   * Execute an operation with circuit breaker protection.
   */
  async execute(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    this.checkTimeout()
    this.resetIfExpired()
    
    const state = this.getState()
    
    // If circuit is OPEN, reject immediately
    if (state.state === 'OPEN') {
      console.warn(`[CIRCUIT:${this.name}] Circuit OPEN, rejecting request`)
      
      if (fallback) {
        try {
          const data = await fallback()
          return {
            success: true,
            data,
            circuitState: 'OPEN',
            fromFallback: true,
          }
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e : new Error(String(e)),
            circuitState: 'OPEN',
            fromFallback: true,
          }
        }
      }
      
      return {
        success: false,
        error: new Error('Circuit breaker is OPEN'),
        circuitState: 'OPEN',
        fromFallback: false,
      }
    }
    
    // Try the operation
    try {
      const data = await operation()
      this.recordSuccess()
      
      return {
        success: true,
        data,
        circuitState: this.getState().state,
        fromFallback: false,
      }
    } catch (e) {
      this.recordFailure()
      
      const error = e instanceof Error ? e : new Error(String(e))
      console.error(`[CIRCUIT:${this.name}] Operation failed:`, error.message)
      
      // Try fallback if available
      if (fallback) {
        try {
          const data = await fallback()
          return {
            success: true,
            data,
            error, // Include original error for logging
            circuitState: this.getState().state,
            fromFallback: true,
          }
        } catch (fallbackError) {
          return {
            success: false,
            error,
            circuitState: this.getState().state,
            fromFallback: true,
          }
        }
      }
      
      return {
        success: false,
        error,
        circuitState: this.getState().state,
        fromFallback: false,
      }
    }
  }
  
  /**
   * Get current circuit state.
   */
  getCircuitState(): CircuitBreakerState {
    this.checkTimeout()
    return this.getState()
  }
  
  /**
   * Manually reset the circuit (for recovery).
   */
  reset(): void {
    this.setState({
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailure: null,
      openedAt: null,
      lastStateChange: Date.now(),
    })
    console.log(`[CIRCUIT:${this.name}] Manually reset to CLOSED`)
  }
  
  /**
   * Manually open the circuit (for maintenance).
   */
  forceOpen(): void {
    this.transitionTo('OPEN')
    console.log(`[CIRCUIT:${this.name}] Manually forced OPEN`)
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a circuit breaker with preset configuration.
 */
export function createCircuitBreaker<T>(
  name: string,
  preset: keyof typeof CIRCUIT_CONFIGS
): CircuitBreaker<T> {
  return new CircuitBreaker(name, CIRCUIT_CONFIGS[preset])
}

/**
 * Get health status of all circuit breakers.
 */
export function getCircuitBreakerHealth(): Record<string, {
  state: CircuitState
  failures: number
  lastFailure: string | null
}> {
  const health: Record<string, any> = {}
  
  for (const [name, state] of circuitBreakers.entries()) {
    health[name] = {
      state: state.state,
      failures: state.failures,
      lastFailure: state.lastFailure 
        ? new Date(state.lastFailure).toISOString() 
        : null,
    }
  }
  
  return health
}

/**
 * Reset all circuit breakers (for recovery after incident).
 */
export function resetAllCircuitBreakers(): void {
  for (const [name] of circuitBreakers.entries()) {
    circuitBreakers.set(name, {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailure: null,
      openedAt: null,
      lastStateChange: Date.now(),
    })
  }
  console.log('[CIRCUIT] All circuit breakers reset')
}

// =============================================================================
// SINGLETON INSTANCES FOR COMMON SERVICES
// =============================================================================

export const DatabaseCircuit = createCircuitBreaker<any>('database', 'DATABASE')
export const PaymentCircuit = createCircuitBreaker<any>('payment', 'PAYMENT')
export const StorageCircuit = createCircuitBreaker<any>('storage', 'STORAGE')
export const NotificationCircuit = createCircuitBreaker<any>('notification', 'NOTIFICATIONS')
