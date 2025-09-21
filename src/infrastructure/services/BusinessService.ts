import { supabase } from '../database/supabaseService';
import { Business, BusinessUser, BusinessInvitation } from '../../domain/entities/Business';

export class BusinessService {
  // Business Management
  async createBusiness(businessData: {
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
  }): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_business_with_owner', {
        business_name: businessData.name,
        business_description: businessData.description,
        business_address: businessData.address,
        business_phone: businessData.phone,
        business_email: businessData.email
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating business:', error);
      throw error;
    }
  }

  async getBusiness(businessId: string): Promise<Business | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      return data ? this.convertBusinessFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching business:', error);
      return null;
    }
  }

  async getUserBusinesses(): Promise<Business[]> {
    try {
      // First get the user's profile to get their business_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile?.business_id) return [];

      // Then get the business details
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', profile.business_id);

      if (error) throw error;
      return (data || []).map(business => this.convertBusinessFromDb(business));
    } catch (error) {
      console.error('Error fetching user businesses:', error);
      return [];
    }
  }

  async updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
    try {
      const dbBusiness = this.convertBusinessToDb(updates);
      const { error } = await supabase
        .from('businesses')
        .update(dbBusiness)
        .eq('id', businessId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  }

  // Business Users Management
  async getBusinessUsers(businessId: string): Promise<BusinessUser[]> {
    try {
      console.log('Fetching business users for business ID:', businessId);
      
      // Try to get business users from business_users table first
      const { data: businessUsers, error: businessUsersError } = await supabase
        .from('business_users')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (businessUsersError) {
        console.warn('business_users table query failed, falling back to profiles table:', businessUsersError);
        
        // Fallback: Get users from profiles table directly
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('business_id', businessId);

        if (profilesError) {
          console.error('Fallback profiles query also failed:', profilesError);
          return [];
        }

        // Convert profiles to business users format
        return (profiles || []).map(profile => ({
          id: profile.id,
          businessId: businessId,
          userId: profile.auth_user_id,
          role: profile.role || 'employee',
          permissions: {
            canManageEmployees: profile.role === 'owner',
            canManageTransactions: true,
            canManageCash: profile.role === 'owner',
            canViewReports: true,
            canManageSettings: profile.role === 'owner',
            canInviteUsers: profile.role === 'owner'
          },
          isActive: true,
          invitedBy: undefined,
          invitedAt: new Date().toISOString(),
          joinedAt: profile.created_at,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }));
      }

      if (!businessUsers || businessUsers.length === 0) {
        console.log('No business users found in business_users table, trying fallback to profiles');
        
        // Fallback: Get users from profiles table directly
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('business_id', businessId);

        if (profilesError) {
          console.error('Fallback profiles query failed:', profilesError);
          return [];
        }

        // Convert profiles to business users format
        return (profiles || []).map(profile => ({
          id: profile.id,
          businessId: businessId,
          userId: profile.auth_user_id,
          role: profile.role || 'employee',
          permissions: {
            canManageEmployees: profile.role === 'owner',
            canManageTransactions: true,
            canManageCash: profile.role === 'owner',
            canViewReports: true,
            canManageSettings: profile.role === 'owner',
            canInviteUsers: profile.role === 'owner'
          },
          isActive: true,
          invitedBy: undefined,
          invitedAt: new Date().toISOString(),
          joinedAt: profile.created_at,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }));
      }

      // Original logic: Get profile information for each business user
      const profileIds = businessUsers.map(user => user.profile_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar')
        .in('id', profileIds);

      if (profilesError) {
        console.error('Supabase error fetching profiles:', profilesError);
        // Return business users without profile data
        return businessUsers.map(user => this.convertBusinessUserFromDb(user));
      }

      // Combine the data
      const combinedData = businessUsers.map(businessUser => {
        const profile = profiles?.find(p => p.id === businessUser.profile_id);
        return {
          ...businessUser,
          profiles: profile
        };
      });
      
      console.log('Business users data:', combinedData);
      return combinedData.map(user => this.convertBusinessUserFromDb(user));
    } catch (error: any) {
      console.error('Error fetching business users:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      return [];
    }
  }

  async inviteUserToBusiness(
    businessId: string,
    email: string,
    role: 'owner' | 'manager' | 'employee' | 'viewer'
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('invite_user_to_business', {
        target_business_id: businessId,
        target_email: email,
        target_role: role
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  async acceptBusinessInvitation(token: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('accept_business_invitation', {
        invitation_token: token
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  async updateUserRole(
    businessId: string,
    userId: string,
    role: 'owner' | 'manager' | 'employee' | 'viewer'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('business_users')
        .update({ role })
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async removeUserFromBusiness(businessId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('business_users')
        .update({ is_active: false })
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing user from business:', error);
      throw error;
    }
  }

  // Business Invitations
  async getBusinessInvitations(businessId: string): Promise<BusinessInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('business_invitations')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return (data || []).map(invitation => this.convertBusinessInvitationFromDb(invitation));
    } catch (error) {
      console.error('Error fetching business invitations:', error);
      return [];
    }
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('business_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw error;
    }
  }

  // Business Context Management
  async getCurrentBusiness(): Promise<Business | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      console.log('Fetching current business for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          business_id,
          businesses!inner(*)
        `)
        .eq('auth_user_id', user.id)
        .single();

      if (error) {
        console.error('Supabase error fetching current business:', error);
        
        // If the user doesn't have a business association, try to fix it
        if (error.code === 'PGRST116' || error.message.includes('No rows found')) {
          console.log('User has no business association, attempting to fix...');
          await this.assignUserToDefaultBusiness(user.id);
          
          // Try again after assignment
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select(`
              business_id,
              businesses!inner(*)
            `)
            .eq('auth_user_id', user.id)
            .single();
            
          if (retryError) {
            console.error('Still no business after assignment attempt:', retryError);
            return null;
          }
          
          console.log('Business assigned successfully:', retryData);
          return retryData?.businesses ? this.convertBusinessFromDb(retryData.businesses) : null;
        }
        
        throw error;
      }
      
      console.log('Current business data:', data);
      return data?.businesses ? this.convertBusinessFromDb(data.businesses) : null;
    } catch (error) {
      console.error('Error fetching current business:', error);
      return null;
    }
  }

  private async assignUserToDefaultBusiness(userId: string): Promise<void> {
    try {
      console.log('Assigning user to default business:', userId);
      
      // Update the user's profile to use the default business
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ business_id: '00000000-0000-0000-0000-000000000001' })
        .eq('auth_user_id', userId);
        
      if (updateError) {
        console.error('Error updating user profile:', updateError);
        return;
      }
      
      // Add user to business_users table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('auth_user_id', userId)
        .single();
        
      if (profile) {
        const { error: businessUserError } = await supabase
          .from('business_users')
          .insert({
            business_id: '00000000-0000-0000-0000-000000000001',
            profile_id: profile.id,
            role: profile.email === 'owner@scrappy.com' ? 'owner' : 'employee',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (businessUserError) {
          console.error('Error adding user to business_users:', businessUserError);
        } else {
          console.log('User successfully assigned to default business');
        }
      }
    } catch (error) {
      console.error('Error in assignUserToDefaultBusiness:', error);
    }
  }

  async switchBusiness(businessId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user has access to this business
      const { data: businessUser, error: checkError } = await supabase
        .from('business_users')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (checkError || !businessUser) {
        throw new Error('User does not have access to this business');
      }

      // Update user's profile to switch business context
      const { error } = await supabase
        .from('profiles')
        .update({ business_id: businessId })
        .eq('auth_user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error switching business:', error);
      throw error;
    }
  }

  // Conversion functions
  private convertBusinessFromDb(dbBusiness: any): Business {
    return {
      id: dbBusiness.id,
      name: dbBusiness.name,
      description: dbBusiness.description,
      address: dbBusiness.address,
      phone: dbBusiness.phone,
      email: dbBusiness.email,
      logoUrl: dbBusiness.logo_url,
      settings: dbBusiness.settings || {},
      subscriptionPlan: dbBusiness.subscription_plan,
      isActive: dbBusiness.is_active,
      createdAt: dbBusiness.created_at,
      updatedAt: dbBusiness.updated_at,
      createdBy: dbBusiness.created_by
    };
  }

  private convertBusinessToDb(business: Partial<Business>): any {
    return {
      name: business.name,
      description: business.description,
      address: business.address,
      phone: business.phone,
      email: business.email,
      logo_url: business.logoUrl,
      settings: business.settings,
      subscription_plan: business.subscriptionPlan,
      is_active: business.isActive
    };
  }

  private convertBusinessUserFromDb(dbUser: any): BusinessUser {
    return {
      id: dbUser.id,
      businessId: dbUser.business_id,
      userId: dbUser.user_id,
      role: dbUser.role,
      permissions: dbUser.permissions || {},
      isActive: dbUser.is_active,
      invitedBy: dbUser.invited_by,
      invitedAt: dbUser.invited_at,
      joinedAt: dbUser.joined_at,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    };
  }

  private convertBusinessInvitationFromDb(dbInvitation: any): BusinessInvitation {
    return {
      id: dbInvitation.id,
      businessId: dbInvitation.business_id,
      email: dbInvitation.email,
      role: dbInvitation.role,
      token: dbInvitation.token,
      expiresAt: dbInvitation.expires_at,
      status: dbInvitation.status,
      invitedBy: dbInvitation.invited_by,
      acceptedBy: dbInvitation.accepted_by,
      createdAt: dbInvitation.created_at,
      updatedAt: dbInvitation.updated_at
    };
  }
}

export const businessService = new BusinessService();
