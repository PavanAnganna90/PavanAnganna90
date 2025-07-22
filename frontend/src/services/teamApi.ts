/**
 * Team API Service
 * 
 * Service for connecting to team management backend endpoints.
 * Provides methods for team CRUD operations, member management, and team settings.
 */

import {
  Team,
  TeamCreate,
  TeamUpdate,
  TeamMember,
  TeamMembershipRequest,
  TeamMemberResponse,
  TeamListResponse,
  TeamMembersResponse,
  TeamFilter,
  TeamSortOptions,
  TeamStats,
  TeamInvitation,
  TeamInvitationRequest,
  TeamActivity
} from '../types/team';

class TeamApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/v1/teams' 
      : 'http://localhost:8000/api/v1/teams';
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // In development mode, use mock data if backend is not available
    if (process.env.NODE_ENV === 'development') {
      try {
        const token = this.getAuthToken();
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config: RequestInit = {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
          },
        };

        const response = await fetch(url, config);
        
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to perform this action.');
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        // If fetch fails in development, return mock data
        console.warn('🔌 Backend not available, using mock team data for development');
        return this.getMockData(endpoint, options) as T;
      }
    } else {
      // Production mode - normal fetch behavior
      try {
        const token = this.getAuthToken();
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config: RequestInit = {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
          },
        };

        const response = await fetch(url, config);
        
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to perform this action.');
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Team API request failed: ${this.baseUrl}${endpoint}`, error);
        throw error;
      }
    }
  }

  /**
   * Get teams with filtering, sorting, and pagination
   */
  async getTeams(
    filter?: TeamFilter,
    sort?: TeamSortOptions,
    page: number = 1,
    perPage: number = 20
  ): Promise<TeamListResponse> {
    const queryParams = new URLSearchParams();
    
    // Pagination
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());
    
    // Sorting
    if (sort) {
      queryParams.append('sort_by', sort.field);
      queryParams.append('sort_order', sort.direction);
    }
    
    // Filtering
    if (filter) {
      if (filter.search) {
        queryParams.append('search', filter.search);
      }
      
      if (filter.role) {
        queryParams.append('role', filter.role);
      }
      
      if (filter.is_active !== undefined) {
        queryParams.append('is_active', filter.is_active.toString());
      }
      
      if (filter.created_by) {
        queryParams.append('created_by', filter.created_by.toString());
      }
      
      if (filter.member_of) {
        queryParams.append('member_of', filter.member_of.toString());
      }
    }

    return this.request<TeamListResponse>(`?${queryParams}`);
  }

  /**
   * Get a specific team by ID
   */
  async getTeam(teamId: number): Promise<Team> {
    return this.request<Team>(`/${teamId}`);
  }

  /**
   * Create a new team
   */
  async createTeam(teamData: TeamCreate): Promise<Team> {
    return this.request<Team>('', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  /**
   * Update an existing team
   */
  async updateTeam(teamId: number, teamData: TeamUpdate): Promise<Team> {
    return this.request<Team>(`/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  }

  /**
   * Delete a team
   */
  async deleteTeam(teamId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return this.request<TeamMember[]>(`/${teamId}/members`);
  }

  /**
   * Add a member to a team
   */
  async addTeamMember(
    teamId: number,
    memberData: TeamMembershipRequest
  ): Promise<TeamMemberResponse> {
    return this.request<TeamMemberResponse>(`/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  /**
   * Update a team member's role
   */
  async updateTeamMemberRole(
    teamId: number,
    userId: number,
    role: string
  ): Promise<TeamMemberResponse> {
    return this.request<TeamMemberResponse>(`/${teamId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  /**
   * Remove a member from a team
   */
  async removeTeamMember(teamId: number, userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Send team invitation
   */
  async inviteToTeam(
    teamId: number,
    invitationData: TeamInvitationRequest
  ): Promise<TeamInvitation> {
    return this.request<TeamInvitation>(`/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify(invitationData),
    });
  }

  /**
   * Get team invitations
   */
  async getTeamInvitations(teamId: number): Promise<TeamInvitation[]> {
    return this.request<TeamInvitation[]>(`/${teamId}/invitations`);
  }

  /**
   * Cancel team invitation
   */
  async cancelInvitation(teamId: number, invitationId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(token: string): Promise<TeamMemberResponse> {
    return this.request<TeamMemberResponse>(`/invitations/accept`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Get team statistics
   */
  async getTeamStats(): Promise<TeamStats> {
    return this.request<TeamStats>('/stats');
  }

  /**
   * Get team activity log
   */
  async getTeamActivity(
    teamId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TeamActivity[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.request<TeamActivity[]>(`/${teamId}/activity?${queryParams}`);
  }

  /**
   * Check if user can perform action on team
   */
  async checkTeamPermission(
    teamId: number,
    action: 'view' | 'edit' | 'delete' | 'manage_members' | 'invite'
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.request<{ allowed: boolean; reason?: string }>(
      `/${teamId}/permissions/${action}`
    );
  }

  /**
   * Get current user's teams
   */
  async getUserTeams(): Promise<Team[]> {
    return this.request<Team[]>('/user/teams');
  }

  /**
   * Leave a team (remove self)
   */
  async leaveTeam(teamId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/leave`, {
      method: 'POST',
    });
  }

  /**
   * Transfer team ownership
   */
  async transferOwnership(
    teamId: number,
    newOwnerId: number
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ new_owner_id: newOwnerId }),
    });
  }

  /**
   * Bulk add members to team
   */
  async bulkAddMembers(
    teamId: number,
    members: TeamMembershipRequest[]
  ): Promise<{
    successful: number;
    failed: number;
    results: TeamMemberResponse[];
  }> {
    return this.request<{
      successful: number;
      failed: number;
      results: TeamMemberResponse[];
    }>(`/${teamId}/members/bulk`, {
      method: 'POST',
      body: JSON.stringify({ members }),
    });
  }

  /**
   * Search for users to invite
   */
  async searchUsers(query: string, excludeTeamId?: number): Promise<{
    users: {
      id: number;
      github_username: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
    }[];
  }> {
    const queryParams = new URLSearchParams({ q: query });
    if (excludeTeamId) {
      queryParams.append('exclude_team', excludeTeamId.toString());
    }

    return this.request<{
      users: {
        id: number;
        github_username: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
      }[];
    }>(`/search/users?${queryParams}`);
  }

  /**
   * Get team health check
   */
  async getTeamHealth(): Promise<{
    total_teams: number;
    active_teams: number;
    teams_without_owners: number;
    teams_with_single_member: number;
    average_team_size: number;
    recommendations: string[];
  }> {
    return this.request<{
      total_teams: number;
      active_teams: number;
      teams_without_owners: number;
      teams_with_single_member: number;
      average_team_size: number;
      recommendations: string[];
    }>('/health');
  }

  /**
   * Get mock data for development when backend is not available
   */
  private getMockData(endpoint: string, options: RequestInit = {}): any {
    console.log(`🎭 Serving mock data for: ${endpoint}`);
    
    // Mock teams data
    const mockTeams: Team[] = [
      {
        id: 1,
        name: 'Frontend Team',
        description: 'Responsible for all frontend development and UI/UX',
        slug: 'frontend-team',
        visibility: 'public',
        owner_id: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        member_count: 5,
        settings: {
          allow_member_invites: true,
          require_approval_for_join: false,
          default_member_role: 'member'
        }
      },
      {
        id: 2,
        name: 'Backend Team',
        description: 'Backend services, APIs, and infrastructure',
        slug: 'backend-team',
        visibility: 'public',
        owner_id: 2,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
        member_count: 4,
        settings: {
          allow_member_invites: true,
          require_approval_for_join: true,
          default_member_role: 'member'
        }
      },
      {
        id: 3,
        name: 'DevOps Team',
        description: 'Infrastructure, deployment, and monitoring',
        slug: 'devops-team',
        visibility: 'private',
        owner_id: 3,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-25T00:00:00Z',
        member_count: 3,
        settings: {
          allow_member_invites: false,
          require_approval_for_join: true,
          default_member_role: 'viewer'
        }
      }
    ];

    // Route mock responses based on endpoint
    switch (endpoint) {
      case '/user/teams':
        return mockTeams;
      
      case '/':
        if (options.method === 'GET') {
          return { teams: mockTeams, total: mockTeams.length };
        }
        if (options.method === 'POST') {
          return { ...mockTeams[0], id: Date.now() };
        }
        break;
      
      case '/health':
        return {
          total_teams: mockTeams.length,
          active_teams: mockTeams.length,
          teams_without_owners: 0,
          teams_with_single_member: 0,
          average_team_size: 4,
          recommendations: ['Consider creating specialized teams for better focus']
        };
      
      default:
        // Handle dynamic endpoints like /{id}, /{id}/members, etc.
        const teamIdMatch = endpoint.match(/^\/(\d+)/);
        if (teamIdMatch) {
          const teamId = parseInt(teamIdMatch[1]);
          const team = mockTeams.find(t => t.id === teamId);
          
          if (endpoint === `/${teamId}`) {
            return team || null;
          }
          
          if (endpoint === `/${teamId}/members`) {
            return [
              {
                id: 1,
                user_id: 1,
                team_id: teamId,
                role: 'owner',
                joined_at: '2024-01-01T00:00:00Z',
                user: {
                  id: 1,
                  email: 'owner@example.com',
                  name: 'Team Owner',
                  avatar_url: null
                }
              },
              {
                id: 2,
                user_id: 2,
                team_id: teamId,
                role: 'admin',
                joined_at: '2024-01-02T00:00:00Z',
                user: {
                  id: 2,
                  email: 'admin@example.com',
                  name: 'Team Admin',
                  avatar_url: null
                }
              }
            ];
          }
        }
        
        // Default response for unhandled endpoints
        return { message: 'Mock endpoint not implemented', endpoint };
    }
    
    return { message: 'Success', data: null };
  }
}

// Export singleton instance
export const teamApi = new TeamApiService();
export default teamApi; 