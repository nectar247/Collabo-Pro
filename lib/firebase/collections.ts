// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  WORKSPACES: 'workspaces',
  CHANNELS: 'channels',        // Chat channels / rooms
  MESSAGES: 'messages',
  DOCUMENTS: 'documents',
  DOCUMENT_VERSIONS: 'document_versions',
  APPROVALS: 'approvals',      // Workflow approval requests
  COMMENTS: 'comments',
  NOTIFICATIONS: 'notifications',
  INVITES: 'invites',
  ACTIVITY_LOG: 'activity_log',  // Immutable workspace activity log
  DOCUMENT_PRESENCE: 'presence',    // subcollection under each document: documents/{id}/presence/{userId}
  DOCUMENT_SUGGESTIONS: 'document_suggestions', // track-changes suggestions
  TEMPLATES: 'templates',                       // user-saved reusable document templates
  FOLDERS: 'folders',                           // workspace document folders
} as const;
