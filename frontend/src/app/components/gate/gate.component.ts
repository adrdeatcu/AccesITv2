import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule]
})
export class GateComponent implements OnInit, OnDestroy {
  currentTime: string = '';
  gateStatus: 'închis' | 'deschis' | 'în curs de deschidere' | 'în curs de închidere' = 'închis';
  pendingLogs: AccessLog[] = [];
  loading = false;
  error: string = '';
  
  private timeInterval?: number;
  private logsInterval?: number;
  private subscription?: Subscription;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateTime();
    this.timeInterval = window.setInterval(() => this.updateTime(), 1000);
    
    this.loadPendingLogs();
    this.logsInterval = window.setInterval(() => this.loadPendingLogs(), 10000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.logsInterval) {
      clearInterval(this.logsInterval);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('ro-RO', { hour12: false });
  }

  async openGate() {
    if (this.gateStatus !== 'închis') return;
  
    // 🔁 Backend call to trigger ESP flag
    const success = await this.supabaseService.triggerManualGateOpen();
    if (!success) {
      alert('Eroare la deschiderea porții. Încearcă din nou.');
      return;
    }
  
    // ✅ Continue with the animation
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
      // For now, just set empty array since we don't have the backend method
      this.pendingLogs = [];
      console.log('Loading pending logs...');
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
      if (approved) {
        this.openGate();
      }
      await this.loadPendingLogs();
    } catch (error) {
      console.error('Error handling approval:', error);
      alert('Eroare la procesarea cererii.');
    }
  }

  // Add the missing trackBy method
  trackByLogId(index: number, log: AccessLog): number {
    return log.id;
  }

  // Add the missing onImageError method
  onImageError(event: any) {
    event.target.style.display = 'none';
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }
}
