import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Replace these with your actual values
const SUPABASE_URL = 'https://fvdjsuvfaxhgevdibfsa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZGpzdXZmYXhoZ2V2ZGliZnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5ODY5MTYsImV4cCI6MjA2MjU2MjkxNn0.UfN9f3FJhaco__bM5Yw3jibZQzBekh0rf_AMXKuH2GE';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  async loginUser(email: string, password: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'User not found' };
    }

    return { success: true, user: data };
  }
}
