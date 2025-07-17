export interface ChatMessage {
  id: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'code' | 'system' | 'incident_link' | 'alert_link';
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    status: 'online' | 'away' | 'busy' | 'offline';
  };
  timestamp: string;
  edited?: {
    timestamp: string;
    editedBy: string;
  };
  reactions: Array<{
    emoji: string;
    users: string[];
    count: number;
  }>;
  replies?: ChatMessage[];
  mentions: string[];
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  metadata?: {
    codeLanguage?: string;
    incidentId?: string;
    alertId?: string;
    isSystemGenerated?: boolean;
  };
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct' | 'incident' | 'alert';
  topic?: string;
  members: ChannelMember[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  settings: {
    notifications: boolean;
    mentions: boolean;
    threadedReplies: boolean;
    messageRetention: number; // days
  };
  metadata?: {
    incidentId?: string;
    alertId?: string;
    projectId?: string;
    serviceId?: string;
  };
  archived: boolean;
  pinned: boolean;
}

export interface ChannelMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  lastReadAt?: string;
  permissions: {
    canPost: boolean;
    canInvite: boolean;
    canManage: boolean;
    canDelete: boolean;
  };
  notifications: {
    enabled: boolean;
    mentions: boolean;
    all: boolean;
  };
}

export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  currentActivity?: {
    type: 'viewing' | 'editing' | 'debugging' | 'deploying';
    resource: string;
    timestamp: string;
  };
  location?: {
    page: string;
    details?: string;
  };
}

export interface Notification {
  id: string;
  type: 'mention' | 'direct_message' | 'channel_invite' | 'incident_update' | 'alert' | 'deployment' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: {
    type: 'chat' | 'system' | 'incident' | 'alert' | 'pipeline' | 'monitoring';
    id: string;
    name: string;
  };
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: string;
  }>;
  metadata?: {
    channelId?: string;
    messageId?: string;
    incidentId?: string;
    alertId?: string;
    userId?: string;
  };
  expiresAt?: string;
}

export interface CollaborationContext {
  type: 'incident' | 'alert' | 'deployment' | 'debug' | 'review';
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'resolved' | 'archived';
  participants: Array<{
    userId: string;
    role: 'lead' | 'participant' | 'observer';
    joinedAt: string;
  }>;
  timeline: Array<{
    id: string;
    timestamp: string;
    type: 'message' | 'action' | 'status_change' | 'user_joined' | 'user_left';
    data: any;
    userId?: string;
  }>;
  resources: Array<{
    type: 'log' | 'metric' | 'trace' | 'alert' | 'runbook' | 'document';
    id: string;
    name: string;
    url: string;
  }>;
  chat: {
    channelId: string;
    messageCount: number;
    lastActivity: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StatusUpdate {
  id: string;
  userId: string;
  type: 'incident' | 'deployment' | 'maintenance' | 'investigation' | 'resolved';
  title: string;
  description: string;
  status: 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  timestamp: string;
  affectedServices: string[];
  estimatedCompletion?: string;
  impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  visibility: 'team' | 'organization' | 'public';
  tags: string[];
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  updates: Array<{
    id: string;
    timestamp: string;
    message: string;
    userId: string;
  }>;
}

export interface WorkspacePresence {
  userId: string;
  workspace: {
    type: 'dashboard' | 'logs' | 'monitoring' | 'incident' | 'pipeline' | 'infrastructure';
    id?: string;
    name: string;
  };
  activity: {
    type: 'viewing' | 'editing' | 'analyzing' | 'debugging' | 'configuring';
    details?: string;
  };
  cursor?: {
    x: number;
    y: number;
    element?: string;
  };
  timestamp: string;
}

export interface TeamMention {
  id: string;
  type: 'user' | 'team' | 'role' | 'channel';
  displayName: string;
  identifier: string; // @username, @team:platform, @role:admin, #channel
  metadata?: {
    userId?: string;
    teamId?: string;
    roleId?: string;
    channelId?: string;
  };
}

export interface ChatThread {
  id: string;
  parentMessageId: string;
  channelId: string;
  messages: ChatMessage[];
  participants: string[];
  lastActivity: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ChatDraft {
  channelId: string;
  content: string;
  mentions: TeamMention[];
  attachments: File[];
  replyToMessageId?: string;
  timestamp: string;
}

export interface ChatEmoji {
  id: string;
  name: string;
  url?: string;
  unicode?: string;
  category: 'people' | 'nature' | 'objects' | 'places' | 'symbols' | 'custom';
  aliases: string[];
  custom: boolean;
}

export interface ChatIntegration {
  id: string;
  name: string;
  type: 'webhook' | 'bot' | 'external_service';
  enabled: boolean;
  configuration: {
    webhookUrl?: string;
    apiKey?: string;
    channels: string[];
    events: string[];
    filters?: Record<string, any>;
  };
  permissions: {
    canPost: boolean;
    canRead: boolean;
    canManageChannels: boolean;
  };
  metadata: {
    description: string;
    iconUrl?: string;
    lastActivity?: string;
    messageCount: number;
  };
}

export interface CollaborationSettings {
  notifications: {
    desktop: boolean;
    sound: boolean;
    mentions: boolean;
    directMessages: boolean;
    channelUpdates: boolean;
    incidents: boolean;
    alerts: boolean;
    deployments: boolean;
  };
  presence: {
    showOnlineStatus: boolean;
    showCurrentActivity: boolean;
    shareLocation: boolean;
    autoAway: number; // minutes
  };
  chat: {
    enterToSend: boolean;
    showPreviews: boolean;
    compactMode: boolean;
    darkMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    emojiStyle: 'native' | 'twitter' | 'apple' | 'google';
  };
  privacy: {
    readReceipts: boolean;
    typingIndicators: boolean;
    lastSeen: boolean;
  };
}

export interface VoiceCall {
  id: string;
  channelId?: string;
  type: 'direct' | 'channel' | 'incident' | 'standup';
  status: 'active' | 'ended' | 'scheduled';
  participants: Array<{
    userId: string;
    joinedAt: string;
    leftAt?: string;
    muted: boolean;
    speaking: boolean;
    screenSharing: boolean;
  }>;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  recording?: {
    enabled: boolean;
    url?: string;
    duration?: number;
  };
  metadata?: {
    incidentId?: string;
    title?: string;
    agenda?: string;
  };
}

export interface ScreenShare {
  id: string;
  callId: string;
  userId: string;
  type: 'screen' | 'window' | 'tab';
  title: string;
  startedAt: string;
  endedAt?: string;
  viewers: string[];
  permissions: {
    canControl: string[];
    canAnnotate: string[];
  };
}

export interface ChatSearch {
  query: string;
  filters: {
    channels: string[];
    users: string[];
    dateRange: {
      start: string;
      end: string;
    };
    messageTypes: ChatMessage['type'][];
    hasAttachments: boolean;
    inThreads: boolean;
  };
  results: Array<{
    message: ChatMessage;
    channel: ChatChannel;
    highlights: Array<{
      field: string;
      fragments: string[];
    }>;
    score: number;
  }>;
  total: number;
  executionTime: number;
}