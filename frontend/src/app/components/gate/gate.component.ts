import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Subscription } from 'rxjs';

interface AccessLog {
  id: number;
  name: string;
  bluetooth_code: string;
  direction: string;
  allowed_schedule: string;
  timestamp: string;
  photo_url?: string;
  employee_id: string;
}

@Component({
  selector: 'app-gate',
  standalone: true,
  templateUrl: './gate.component.html',
  styleUrls: ['./gate.component.css'],
  imports: [CommonModule, RouterModule]
})
export class GateComponent implements OnInit, OnDestroy {
  currentTime: string = '';
  gateStatus: 'închis' | 'deschis' | 'în curs de deschidere' | 'în curs de închidere' = 'închis';
  pendingLogs: AccessLog[] = [];
  loading = false;
  error: string = '';

  lastScannedEmployee: any = null;
  lastOutOfScheduleLog: AccessLog | null = null;
  private timeInterval?: number;
  private logsInterval?: number;
  private scanPollInterval?: number;
  private subscription?: Subscription;
  previousPendingCount = 0;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateTime();
    this.timeInterval = window.setInterval(() => this.updateTime(), 1000);
    this.logsInterval = window.setInterval(() => this.loadPendingLogs(), 10000);
    this.scanPollInterval = window.setInterval(() => this.checkForScanEvent(), 3000);
    
    this.loadPendingLogs();
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
    if (this.logsInterval) clearInterval(this.logsInterval);
    if (this.scanPollInterval) clearInterval(this.scanPollInterval);
    if (this.subscription) this.subscription.unsubscribe();
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('ro-RO', { hour12: false });
  }

  async openGate() {
    if (this.gateStatus !== 'închis') return;

    const success = await this.supabaseService.triggerManualGateOpen();
    if (!success) {
      alert('Eroare la deschiderea porții. Încearcă din nou.');
      return;
    }

    this.gateStatus = 'în curs de deschidere';
    setTimeout(() => {
      this.gateStatus = 'deschis';
      setTimeout(() => {
        this.gateStatus = 'în curs de închidere';
        setTimeout(() => {
          this.gateStatus = 'închis';
        }, 2000);
      }, 3000);
    }, 2000);
  }

async handleApproval(id: number, approved: boolean) {
    try {
      const response = await fetch(`http://localhost:3000/approve-access/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      });
  
      if (!response.ok) throw new Error('Approval failed');
  
      const result = await response.json();
  
      if (result.success) {
        if (approved) {
          // Gate opens only if approved
          await this.openGate();
  
          // Show employee popup again (reused from backend scan)
          await this.checkForScanEvent();
        } else {
          // 🔴 You might notify ESP or UI here about rejection (optional)
          console.log('Access was denied. No gate action performed.');
        }
      }
  
      await this.loadPendingLogs();
    } catch (error) {
      console.error('❌ Error handling approval:', error);
      alert('Eroare la procesarea cererii.');
    }
  }

  trackByLogId(index: number, log: AccessLog): number {
    return log.id;
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }

 async checkForScanEvent() {
    try {
      const res = await fetch('http://localhost:3000/api/last-scan');
      const result = await res.json();
      if (result.found) {
        this.lastScannedEmployee = result.employee;
        setTimeout(() => this.lastScannedEmployee = null, 6000);
      }
    } catch (err) {
      console.error('❌ Error checking for scan:', err);
    }
  }


  async loadPendingLogs() {
    this.loading = true;
    this.error = '';
    try {
      const response = await fetch('http://localhost:3000/admin/access-logs');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      // Process logs and prepare them for display
      const pendingLogs = result.logs
        .filter((log: any) => log.needs_approval === true)
        .map((log: any) => ({
          id: log.id,
          name: log.employees?.name || 'Unknown',
          bluetooth_code: log.bluetooth_code,
          direction: log.direction || 'in',
          allowed_schedule: log.employees?.allowed_schedule || 'Unknown',
          timestamp: log.timestamp,
          photo_url: log.employees?.photo_url,
          employee_id: log.employee_id
        }));
      
      console.log('Found pending logs:', pendingLogs.length);
      
      // Always show popup for the first pending log if no popup is currently shown
      if (pendingLogs.length > 0 && !this.lastOutOfScheduleLog) {
        console.log('Setting out-of-schedule popup for:', pendingLogs[0].name);
        this.lastOutOfScheduleLog = pendingLogs[0];
        this.playNotificationSound();
      }
      
      this.pendingLogs = pendingLogs;
      this.previousPendingCount = pendingLogs.length;
    } catch (err) {
      this.error = 'Nu s-au putut încărca cererile de acces.';
      console.error('Error loading pending logs:', err);
    } finally {
      this.loading = false;
    }
  }

  // Add this method to dismiss the popup
  dismissOutOfSchedulePopup() {
    this.lastOutOfScheduleLog = null;
  }

  // Add this method to handle approval directly from the popup
  async handlePopupApproval(approved: boolean) {
    if (!this.lastOutOfScheduleLog) return;
    
    await this.handleApproval(this.lastOutOfScheduleLog.id, approved);
    this.lastOutOfScheduleLog = null;
  }

  // Optional: Add sound notification
  playNotificationSound() {
    try {
      const audio = new Audio('assets/notification.mp3');
      audio.play();
    } catch (error) {
      console.error('Could not play notification sound:', error);
    }
  }
}
