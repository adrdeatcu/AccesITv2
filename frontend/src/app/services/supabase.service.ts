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

  async getAllAccessLogs(): Promise<any[]> {
    try {
      const response = await fetch('http://localhost:3000/admin/access-logs');
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(result.error || 'Failed to load logs');
      }
  
      return result.logs;
    } catch (error) {
      console.error('❌ Failed to fetch access logs:', error);
      return [];
    }
  }

  async getAllEmployees(): Promise<any[]> {
    try {
      const response = await fetch('http://localhost:3000/admin/employees');
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(result.error || 'Failed to load employees');
      }
  
      return result.employees;
    } catch (error) {
      console.error('❌ Failed to fetch employees:', error);
      return [];
    }
  }

  async triggerManualGateOpen(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:3000/api/manual-open', {
        method: 'POST',
      });
      const result = await res.json();
      return result.success;
    } catch (error) {
      console.error('❌ Failed to trigger manual gate open:', error);
      return false;
    }
  }

  async registerUser(userData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('http://localhost:3000/admin/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to register user');
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to register user:', error);
      return { success: false, error: error.message || 'Failed to register user' };
    }
  }

  async deleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`http://localhost:3000/admin/delete-employee/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete employee');
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to delete employee:', error);
      return { success: false, error: error.message || 'Failed to delete employee' };
    }
  }
}


