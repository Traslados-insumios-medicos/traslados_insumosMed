/**
 * FEATURE: user-profile — Public API
 * Solo se exporta lo que otros slices/páginas pueden consumir.
 */
export { UserProfileCard } from './ui/UserProfileCard'
export { useUserProfileStore } from './model/userProfile.store'
export type { UserProfile } from './model/userProfile.store'
