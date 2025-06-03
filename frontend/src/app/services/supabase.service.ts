import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'portar';
  name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Clear any existing auth state to prevent LockManager conflicts
    localStorage.removeItem('sb-fvdjsuvfaxhgevdibfsa-auth-token');
    sessionStorage.removeItem('sb-fvdjsuvfaxhgevdibfsa-auth-token');

    this.supabase = createClient(
      'https://fvdjsuvfaxhgevdibfsa.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZGpzdXZmYXhoZ2V2ZGliZnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5ODY5MTYsImV4cCI6MjA2MjU2MjkxNn0.YOUR_REAL_ANON_KEY',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  async loginUser(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const mockUsers = [
      { email: 'adi@gmail.com', password: '123', role: 'portar' as const, name: 'Adi' },
      { email: 'adii@gmail.com', password: '12345', role: 'admin' as const, name: 'Adi Admin' },
    ];

    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser = mockUsers.find(user => user.email === email && user.password === password);

    if (mockUser) {
      const userProfile: UserProfile = {
        id: `mock-id-${Date.now()}`,
        email: mockUser.email,
        role: mockUser.role,
        name: mockUser.name
      };

      localStorage.setItem('currentUser', JSON.stringify(userProfile));
      return { success: true, user: userProfile };
    } else {
      return { success: false, error: 'Email sau parolă incorectă' };
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sb-fvdjsuvfaxhgevdibfsa-auth-token');
    sessionStorage.removeItem('sb-fvdjsuvfaxhgevdibfsa-auth-token');
  }
}
