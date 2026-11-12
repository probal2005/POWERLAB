import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string;
  role: 'student' | 'admin';
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileError: string | null;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: string | null;
    role: 'student' | 'admin' | null;
  }>;
  signUp: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{
    error: string | null;
    emailConfirmationRequired: boolean;
  }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRequestId = useRef(0);
  const currentProfileUserId = useRef<string | null>(null);

  const loadProfile = useCallback(async (
    userId: string,
    requestId: number
  ) => {
    const isCurrentRequest = () =>
      requestId === profileRequestId.current;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (isCurrentRequest()) {
        setProfile(null);
        setProfileError(error.message);
      }
      throw error;
    }

    if (!data) {
      if (isCurrentRequest()) {
        setProfile(null);
        setProfileError(
          'Your account profile was not created. Please contact the administrator.'
        );
      }
      throw new Error('Account profile not found.');
    }

    if (data.role !== 'student' && data.role !== 'admin') {
      if (isCurrentRequest()) {
        setProfile(null);
        setProfileError('Your account has an invalid access role.');
      }
      throw new Error('Invalid account role.');
    }

    const validatedProfile = data as UserProfile;

    if (isCurrentRequest()) {
      setProfile(validatedProfile);
      setProfileError(null);
    }

    return validatedProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    const requestId = ++profileRequestId.current;

    if (!user) {
      currentProfileUserId.current = null;
      setProfile(null);
      setProfileError(null);
      return;
    }

    await loadProfile(user.id, requestId);
  }, [user, loadProfile]);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session: Session | null) => {
        if (!active) return;

        const requestId = ++profileRequestId.current;
        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentProfileUserId.current !== (currentUser?.id ?? null)) {
          currentProfileUserId.current = currentUser?.id ?? null;
          setProfile(null);
          setProfileError(null);
        }

        if (!currentUser) {
          setLoading(false);
          return;
        }

        setLoading(true);

        // Defer the profile query until after the auth callback completes.
        void Promise.resolve()
          .then(() => loadProfile(currentUser.id, requestId))
          .catch(() => {
            // The detailed error is stored in profileError.
          })
          .finally(() => {
            if (active && requestId === profileRequestId.current) {
              setLoading(false);
            }
          });
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message, role: null };
      }

      if (!data.user) {
        return {
          error: 'Authentication succeeded without a user account.',
          role: null,
        };
      }

      const requestId = ++profileRequestId.current;

      try {
        const loadedProfile = await loadProfile(data.user.id, requestId);

        return {
          error: null,
          role: loadedProfile.role,
        };
      } catch (profileLoadError) {
        const message =
          profileLoadError instanceof Error
            ? profileLoadError.message
            : 'Unable to load your account profile.';

        if (requestId === profileRequestId.current) {
          setProfile(null);
          setProfileError(message);
        }

        await supabase.auth.signOut();

        return { error: message, role: null };
      }
    },
    [loadProfile]
  );

  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      return {
        error: error?.message ?? null,
        emailConfirmationRequired: !error && !data.session,
      };
    },
    []
  );

  const signOut = useCallback(async () => {
    ++profileRequestId.current;

    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
