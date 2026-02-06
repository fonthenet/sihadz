/**
 * Shared dashboard layout constants.
 * Use across ALL dashboards: patient, professional (doctor, pharmacy, lab, clinic, nurse, ambulance), old, new, and future.
 *
 * @see .cursor/rules/consistent-fixes-all-profiles.mdc
 * @see .cursor/rules/mobile-cards-edge-to-edge.mdc
 */

/** Sidebar width on md breakpoint (768px+) */
export const SIDEBAR_WIDTH_MD = '14rem'

/** Sidebar width on lg breakpoint (1024px+) */
export const SIDEBAR_WIDTH_LG = '16rem'

/** Tailwind classes for dashboard sidebar width - use on Sidebar components */
export const SIDEBAR_WIDTH_CLASSES = 'w-16 md:w-[14rem] lg:w-[16rem]'

/** CSS custom property overrides for SidebarProvider - responsive widths */
export const SIDEBAR_WIDTH_RESPONSIVE = 'md:[--sidebar-width:14rem] lg:[--sidebar-width:16rem]'
