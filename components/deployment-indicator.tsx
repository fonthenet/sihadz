'use client'

import { useDeploymentStatus } from '@/hooks/use-deployment-status'

/**
 * Listens for new deployments and shows a toast when a new version is available.
 * Requires build-info.json to be written at build time (see scripts/write-build-info.js).
 */
export function DeploymentIndicator() {
  useDeploymentStatus()
  return null
}
