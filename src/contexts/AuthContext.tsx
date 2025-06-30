import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminLevel: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Enhanced admin checks
  const isSuperAdmin = profile?.admin_level === 'superadmin' || profile?.email === 'simonstrumse@gmail.com';
  const isAdmin = profile?.is_admin || profile?.admin_level === 'admin' || isSuperAdmin;
  const adminLevel = profile?.admin_level || null;

  // Utility function to create a timeout promise
  const timeoutPromise = (ms: number) => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  };

  const fetchProfile = async (userId: string, userEmail?: string, retries = 3): Promise<Profile | null> => {
    console.log(`Starting profile fetch for user: ${userId}, email: ${userEmail || 'unknown'}`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching profile for user (attempt ${attempt}):`, userId);
        
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const { data, error } = await Promise.race([
          fetchPromise,
          timeoutPromise(5000)
        ]) as any;

        if (error) {
          console.error(`Error fetching profile (attempt ${attempt}):`, error);
          
          // If it's the last attempt and we have user email, try to create profile
          if (attempt === retries && userEmail) {
            console.log('Profile fetch failed after all retries, attempting to create profile using upsert');
            return await createProfileFromEmail(userId, userEmail);
          }
          
          if (attempt === retries) {
            throw error;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        console.log('Profile fetched successfully:', data);
        return data;
      } catch (error) {
        console.error(`Error fetching profile (attempt ${attempt}):`, error);
        
        // If it's a timeout and we have user email, try to create profile
        if (error.message === 'Timeout' && attempt === retries && userEmail) {
          console.log('Profile fetch timed out, attempting to create profile using upsert');
          return await createProfileFromEmail(userId, userEmail);
        }
        
        if (attempt === retries) {
          console.error('Failed to fetch profile after all retries');
          
          // Last resort: try to create profile if we have email
          if (userEmail) {
            console.log('Last resort: creating profile from email');
            return await createProfileFromEmail(userId, userEmail);
          }
          
          return null;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return null;
  };

  const createProfileFromEmail = async (userId: string, email: string): Promise<Profile | null> => {
    try {
      console.log('Creating profile from email for user:', userId, email);
      
      // Generate a username from email
      const baseUsername = email.split('@')[0];
      const username = baseUsername + Math.random().toString(36).substr(2, 4);
      
      const isSuperAdminUser = email === 'simonstrumse@gmail.com';
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          username,
          beta_approved: true,
          is_admin: isSuperAdminUser,
          admin_level: isSuperAdminUser ? 'superadmin' : null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile from email:', error);
        return null;
      }

      console.log('Profile created successfully from email:', data);
      return data;
    } catch (error) {
      console.error('Error in createProfileFromEmail:', error);
      return null;
    }
  };

  const createProfile = async (userId: string, email: string, username: string): Promise<Profile | null> => {
    try {
      const isSuperAdminUser = email === 'simonstrumse@gmail.com';
      
      console.log('Creating profile for user:', userId, email, username);
      
      // ALWAYS use upsert, never insert
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          username,
          beta_approved: true,
          is_admin: isSuperAdminUser,
          admin_level: isSuperAdminUser ? 'superadmin' : null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      console.log('Profile created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('Refreshing profile for user:', user.id);
      const profileData = await fetchProfile(user.id, user.email);
      setProfile(profileData);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log('Starting sign up process for:', email, username);
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingProfile) {
        return { error: { message: 'Username is already taken' } };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Auth signup error:', error);
        return { error };
      }

      if (data.user) {
        console.log('User created, creating profile...');
        const profileData = await createProfile(data.user.id, email, username);
        if (profileData) {
          setProfile(profileData);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
      } else {
        console.log('Sign in successful:', data);
      }
      
      return { error };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      
      // Clear state immediately without waiting
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out from Supabase:', error);
        // Don't throw - we already cleared local state
      }
      
      console.log('Sign out successful');
    } catch (error) {
      console.error('Error signing out:', error);
      // Don't throw - we want to ensure logout completes
    }
  };

  useEffect(() => {
    console.log('AuthProvider initializing');
    
    let isMounted = true;

    // Get initial session with improved error handling
    const initializeAuth = async () => {
      try {
        console.log('Fetching initial session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          console.log('Initial session:', session ? 'Found' : 'None');
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('Fetching profile for authenticated user in background...');
            // Fetch profile in background without blocking
            fetchProfile(session.user.id, session.user.email).then(profileData => {
              if (isMounted && profileData) {
                setProfile(profileData);
              }
            }).catch(err => {
              console.error('Background profile fetch failed:', err);
            });
          }
        }
        
        // CRITICAL: Always set loading to false and auth as initialized
        if (isMounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
        
        console.log('Auth initialization complete');
      } catch (error) {
        console.error('Error in auth initialization:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        
        if (!isMounted) return;
        
        // CRITICAL: Always update auth state immediately
        setSession(session);
        setUser(session?.user ?? null);
        
        // CRITICAL: Set loading to false immediately for auth state changes
        // This is separate from profile loading
        if (authInitialized) {
          setLoading(false);
        }

        if (session?.user) {
          console.log('Fetching profile for auth state change in background...');
          // Fetch profile in background without blocking
          fetchProfile(session.user.id, session.user.email).then(profileData => {
            if (isMounted) {
              setProfile(profileData);
            }
          }).catch(err => {
            console.error('Background profile fetch failed in auth state change:', err);
          });
        } else if (isMounted) {
          setProfile(null);
        }
      }
    );

    return () => {
      console.log('Cleaning up auth subscription');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove dependencies to prevent re-initialization

  // Debug logging
  useEffect(() => {
    console.log('Auth state update:', {
      user: !!user,
      profile: !!profile,
      loading,
      authInitialized,
      isAdmin,
      isSuperAdmin,
      adminLevel
    });
  }, [user, profile, loading, authInitialized, isAdmin, isSuperAdmin, adminLevel]);

  const value = {
    user,
    profile,
    session,
    loading,
    isAdmin,
    isSuperAdmin,
    adminLevel,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};