/**
 * ============================================================================
 * MUSKY DOSE — CENTRAL GOVERNANCE CORE ENGINE (V1.0)
 *
 * Orchestrates entity validation, state precedence, mutation authorization,
 * cascade deletion hooks, and fail-closed resolution.
 * ============================================================================
 */

import {
  GovernanceState,
  UniversalEntityType,
  GovernanceValidationResult,
  GovernanceMutationContext,
  GovernedEntityDefinition,
} from './types';
import { getEntityDefinition } from './entity-registry';

const STATE_PRECEDENCE_WEIGHTS: Record<GovernanceState, number> = {
  LOCKED: 100,
  MANUAL: 80,
  PUBLISHED: 60,
  AUTO: 50,
  NEEDS_REVIEW: 40,
  UNPUBLISHED: 30,
  ARCHIVED: 20,
  REJECTED: 10,
  DELETED: 0,
};

export class UniversalGovernanceCore {
  /**
   * Evaluates whether an incoming state update is permitted over the existing state.
   * LOCKED records can never be modified by automated/AI processes.
   */
  public static canOverrideState(
    currentState: GovernanceState,
    incomingState: GovernanceState,
    isAdminExplicit: boolean = false
  ): boolean {
    if (currentState === 'DELETED') {
      return false; // Terminal state
    }

    if (currentState === 'LOCKED' && !isAdminExplicit) {
      return false; // Locked records require explicit admin action
    }

    const currentWeight = STATE_PRECEDENCE_WEIGHTS[currentState] ?? 0;
    const incomingWeight = STATE_PRECEDENCE_WEIGHTS[incomingState] ?? 0;

    if (isAdminExplicit) {
      return true; // Authenticated admin with explicit intent can transition states
    }

    return incomingWeight >= currentWeight;
  }

  /**
   * Validates an entity against its registered governance definition.
   */
  public static validateEntity<T = any>(
    entityType: UniversalEntityType,
    entity: T,
    isNew: boolean = false
  ): GovernanceValidationResult {
    const definition = getEntityDefinition<T>(entityType);
    if (!definition) {
      return {
        isValid: false,
        errors: [`Unregistered entity type: "${entityType}". All platform entities must be registered.`],
        warnings: [],
      };
    }

    return definition.validate(entity, isNew);
  }

  /**
   * Before-mutation guard enforcing administrative gate requirements.
   */
  public static assertMutationAllowed(
    entityType: UniversalEntityType,
    context: GovernanceMutationContext
  ): void {
    const definition = getEntityDefinition(entityType);
    if (!definition) {
      throw new Error(`Governance Violation: Mutation attempted on unregistered entity "${entityType}".`);
    }

    if (definition.requiresAdminAuth && context.userRole !== 'ADMIN') {
      throw new Error(`Governance Violation: Administrative authorization required for entity "${entityType}".`);
    }
  }

  /**
   * Executes deletion lifecycle for any governed entity.
   * Cascade-prunes references across settings, navigation, and cross-entity relations.
   */
  public static async executeDeletionLifecycle(
    entityType: UniversalEntityType,
    entityId: string,
    slug?: string
  ): Promise<void> {
    const definition = getEntityDefinition(entityType);
    if (!definition) return;

    if (definition.onDeleted) {
      await definition.onDeleted(entityId, slug);
    }
  }
}
