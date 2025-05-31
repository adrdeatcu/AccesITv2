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
    console.log('Trying login with:', email, password);
  
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, role, password') // include password to compare manually
      .eq('email', email);
  
    console.log('Rows returned:', data);
  
    if (!data || data.length === 0) {
      return { success: false, error: 'User not found.' };
    }
  
    const user = data[0];
  
    // Manual password check
    if (user.password !== password) {
      return { success: false, error: 'Wrong password.' };
    }
  
    return { success: true, user };
  }
  
  
  
}
