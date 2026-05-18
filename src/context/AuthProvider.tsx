import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useDisclosure } from '@chakra-ui/react';

export type Account = {
  email: string;
  password: string;
};

export interface AuthContextType {
  user: any;
  login: (userData: Account) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Account) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  loginControls: {
    isOpen: boolean;
    onToggleLogin: () => void;
    onClose: () => void;
  };
  isAuth: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { open: isOpen, onToggle, onClose } = useDisclosure();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async ({ email, password }: Account) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    onClose();
  };

  const register = async ({ email, password }: Account) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // ✅ KEY FIX: Sign out immediately so Supabase's auto-session
    // from signUp doesn't bypass the login requirement.
    await supabase.auth.signOut();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: oldPassword,
      });
      if (verifyError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(updateError.message);

      return true;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
        changePassword,
        resetPassword,
        isAuth: !!user,
        loginControls: {
          isOpen,
          onClose,
          onToggleLogin: onToggle,
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
