import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-gate',
  standalone: true,
  imports: [CommonModule], // Needed for *ngIf, *ngFor, ngClass
  templateUrl: './gate.component.html',
  styleUrls: ['./gate.component.css']
})
export class GateComponent implements OnInit {
  currentTime: string = '';
  gateStatus: 'închis' | 'deschis' | 'în curs de deschidere' | 'în curs de închidere' = 'închis';
  pendingLogs: any[] = [];
  loading = false;
  error: string = '';

  constructor(
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  
    this.loadPendingLogs(); // initial load
    setInterval(() => this.loadPendingLogs(), 7000); // re-check every 7 seconds
  }
  

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('ro-RO', { hour12: false });
  }

  openGate() {
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
      this.pendingLogs = await this.supabaseService.getPendingAccessLogs();
    } catch (err) {
      this.error = 'Failed to load access requests.';
    } finally {
      this.loading = false;
    }
  }

  async handleApproval(id: number, approved: boolean) {
    const success = await this.supabaseService.updateAccessApproval(id, approved);
    if (success) {
      this.loadPendingLogs(); // Refresh the list
    } else {
      alert('Failed to update access status.');
    }
  }
}
