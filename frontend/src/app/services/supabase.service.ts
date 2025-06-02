import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Subject } from 'rxjs';

// ✅ Interface for what we map and return to the component
export interface AccessRequest {
  id: number;
  timestamp: string;
  direction: string;
  bluetooth_code: string;
  is_visitor: boolean;
  employee_id: string;
  name: string;
  photo_url: string | null;
  car_plate: string;
  allowed_schedule: string;
}

// ✅ Interface matching Supabase return structure
interface SupabaseLogResponse {
  id: number;
  timestamp: string;
  direction: string;
  bluetooth_code: string;
  is_visitor: boolean;
  employee_id: string;
  authorized: boolean | null;
  needs_approval: boolean;
  employees: {
    id: string;
    name: string;
    photo_url: string | null;
    car_plate: string;
    allowed_schedule: string;
  } | null;
}

const SUPABASE_URL = 'https://fvdjsuvfaxhgevdibfsa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZGpzdXZmYXhoZ2V2ZGliZnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5ODY5MTYsImV4cCI6MjA2MjU2MjkxNn0.UfN9f3FJhaco__bM5Yw3jibZQzBekh0rf_AMXKuH2GE'; // replace with real one or import from env

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private accessRequestSubject = new Subject<AccessRequest>();
  accessRequest$ = this.accessRequestSubject.asObservable();

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.setupRealtimeSubscription();
  }

  private setupRealtimeSubscription() {
    this.supabase
      .channel('access_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'access_logs'
          // no filter for now
        },
        (payload) => {
          console.log('🔔 Realtime insert received:', payload);
  
          this.getPendingAccessLogs().then(logs => {
            if (logs.length > 0) {
              console.log('✅ Emitting log to UI:', logs[0]);
              this.accessRequestSubject.next(logs[0]);
            } else {
              console.log('ℹ️ No pending logs to emit');
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('🔗 Realtime subscription status:', status);
      });
  }
  
  

  async loginUser(email: string, password: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, role, password')
      .eq('email', email);

    if (error || !data || data.length === 0) {
      return { success: false, error: 'User not found or error occurred.' };
    }

    const user = data[0];
    if (user.password !== password) {
      return { success: false, error: 'Incorrect password.' };
    }

    return { success: true, user };
  }

  // ✅ Get all pending access requests that need approval
  async getPendingAccessLogs(): Promise<AccessRequest[]> {
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
          id,
          name,
          photo_url,
          allowed_schedule
        )
      `)
      .eq('needs_approval', true)
      .is('authorized', null)
      .order('timestamp', { ascending: false })



    if (error || !data) {
      console.error('❌ Error fetching logs:', error);
      return [];
    }

    const logs = data as unknown as SupabaseLogResponse[];

    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      direction: log.direction,
      bluetooth_code: log.bluetooth_code,
      is_visitor: log.is_visitor,
      employee_id: log.employee_id,
      name: log.employees?.name ?? 'Necunoscut',
      photo_url: log.employees?.photo_url ?? null,
      car_plate: '',
      allowed_schedule: log.employees?.allowed_schedule ?? ''
    }));
  }

  async updateAccessApproval(id: number, approved: boolean): Promise<boolean> {
    const { error } = await this.supabase
      .from('access_logs')
      .update({
        authorized: approved,
        needs_approval: false,
        approved: approved
      })
      .eq('id', id);

    if (error) {
      console.error('❌ Error updating approval:', error);
      return false;
    }

    return true;
  }

  async checkAccessRequest(bluetoothCode: string, direction: string) {
    const { data: employee, error: employeeError } = await this.supabase
      .from('employees')
      .select('*, users!inner(*)')
      .eq('bluetooth_code', bluetoothCode)
      .single();

    if (employeeError || !employee) {
      return { success: false, error: 'Employee not found' };
    }

    if (!employee.access_enabled) {
      return { success: false, error: 'Access disabled' };
    }

    const [start, end] = employee.allowed_schedule.split('-');
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const needsApproval = currentTime < start || currentTime > end;

    const { data: logEntry, error: logError } = await this.supabase
      .from('access_logs')
      .insert([{
        employee_id: employee.id,
        bluetooth_code: bluetoothCode,
        direction,
        timestamp: now.toISOString(),
        authorized: needsApproval ? null : true,
        needs_approval: needsApproval,
        is_visitor: false
      }])
      .select()
      .single();

    if (logError) {
      return { success: false, error: logError.message };
    }

    return {
      success: true,
      needsApproval,
      employeeDetails: {
        name: employee.name,
        photo_url: employee.photo_url,
        allowed_schedule: employee.allowed_schedule
      },
      logId: logEntry.id
    };
  }
}
