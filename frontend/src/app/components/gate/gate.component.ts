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
  private timeInterval?: number;
  private logsInterval?: number;
  private scanPollInterval?: number;
  private subscription?: Subscription;

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

  async loadPendingLogs() {
    this.loading = true;
    this.error = '';
    try {
      this.pendingLogs = [];
    } catch (err) {
      this.error = 'Nu s-au putut încărca cererile de acces.';
      console.error('Error loading pending logs:', err);
    } finally {
      this.loading = false;
    }
  }

  async handleApproval(id: number, approved: boolean) {
    try {
      console.log(`Handling approval for ID ${id}: ${approved}`);
      if (approved) this.openGate();
      await this.loadPendingLogs();
    } catch (error) {
      console.error('Error handling approval:', error);
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
}
