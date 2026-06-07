/** Stable ids for `nbs.features.items.*` translation keys */
export const LANDING_FEATURE_IDS = ['auth', 'cms', 'admin', 'seo', 'push', 'ai', 'i18n', 'deploy', 'dx'] as const

export type LandingFeatureId = (typeof LANDING_FEATURE_IDS)[number]

/** Stable ids for `nbs.hero.tech.*` translation keys */
export const LANDING_TECH_IDS = ['nextjs', 'typescript', 'tailwind', 'mongodb', 'redis', 'jwtMfa', 'docker', 'i18n'] as const

export type LandingTechId = (typeof LANDING_TECH_IDS)[number]

export const LANDING_FAQ_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const

export type LandingFaqId = (typeof LANDING_FAQ_IDS)[number]

export const LANDING_QUICK_START_STEPS = ['fork', 'product', 'env', 'run'] as const
