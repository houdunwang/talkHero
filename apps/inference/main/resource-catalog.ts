import type { ResourcePackage } from './resource-installer'

// Release engineering must fill this immutable catalog with audited per-file hashes and licenses.
// Keeping it empty makes installation visibly unavailable instead of trusting mutable upstream files.
export const MANAGED_RESOURCE_PACKAGES: readonly ResourcePackage[] = []
