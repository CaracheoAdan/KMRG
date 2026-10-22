/**
 * Re-exporta los servicios hacia la nueva arquitectura descentralizada de Supabase
 */
export {
  syncSupabaseMessages as syncMessages,
  syncSupabaseMilestones as syncMilestones,
  sendSupabaseInteraction as sendInteraction,
  markSupabaseMessageRead as markMessageReadRemote,
} from './SupabaseService';
