import { supabase } from '@/lib/supabase';
import { normalizeUsername, validatePassword } from '@/lib/account-validation';
import type { Session, User } from '@supabase/supabase-js';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Erreur de session Supabase :', error.message);
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signUp(
    email: string,
    password: string,
    username: string,
    displayName: string
  ) {
    const normalizedUsername = normalizeUsername(username);

    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return 'Le nom d’utilisateur doit contenir entre 3 et 30 caractères.';
    }

    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;

    const normalizedDisplayName = displayName.trim();
    if (!normalizedDisplayName || normalizedDisplayName.length > 80) {
      return 'Le nom affiché doit contenir entre 1 et 80 caractères.';
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: normalizedDisplayName,
          adult_confirmed: true,
          terms_version: '2026-07-20',
        },
      },
    });

    if (error) {
      return error.message;
    }

    if (!data.user) {
      return 'Le compte n’a pas pu être créé.';
    }

    return null;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    return error?.message ?? null;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erreur de déconnexion :', error.message);
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [session, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider.');
  }

  return context;
}
