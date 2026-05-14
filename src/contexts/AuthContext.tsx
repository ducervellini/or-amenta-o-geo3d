import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Record<string, unknown> | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  canViewAppData: boolean;
  canEditMestres: boolean;
  canEditParametros: boolean;
  canEditOrcamentos: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  hasRole: () => false,
  canViewAppData: false,
  canEditMestres: false,
  canEditParametros: false,
  canEditOrcamentos: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles(data?.map((r: any) => r.role) || []);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: string) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const canViewAppData = roles.length > 0;
  const canEditMestres = hasRole("admin") || hasRole("diretor") || hasRole("gerente");
  const canEditParametros = canEditMestres;
  const canEditOrcamentos =
    canEditMestres || hasRole("orcamentista") || hasRole("engenheiro");

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        loading,
        signOut,
        hasRole,
        canViewAppData,
        canEditMestres,
        canEditParametros,
        canEditOrcamentos,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
