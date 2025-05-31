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

  // Fetch access logs that are pending approval
  async getPendingAccessLogs() {
    const { data, error } = await this.supabase
      .from('access_logs')
      .select(`
        id,
        timestamp,
        direction,
        bluetooth_code,
        is_visitor,
        employee_id,
        authorized,
        needs_approval,
        employees (
          name,
          photo_url,
          car_plate
        )
      `)
      .eq('needs_approval', true)
      .is('authorized', null)
      .order('timestamp', { ascending: false });
  
    if (error) {
      console.error('Error fetching pending logs:', error);
      return [];
    }
  
    console.log('✅ Fetched logs from Supabase:', data);
  
    // Flatten nested employee info for easy use in UI
    return data.map(log => ({
      ...log,
      name: log.employees?.name ?? 'Necunoscut',
      photo_url: log.employees?.photo_url ?? null,
      car_plate: log.employees?.car_plate ?? ''
    }));
  }
  
  
  
  
  // Update access log to approved or denied
  async updateAccessApproval(id: number, approved: boolean) {
    const { error } = await this.supabase
      .from('access_logs')
      .update({ approved: approved })
      .eq('id', id);
  
    if (error) {
      console.error('Error updating approval status:', error);
      return false;
    }
  
    return true;
  }
  
  
  
  
}
