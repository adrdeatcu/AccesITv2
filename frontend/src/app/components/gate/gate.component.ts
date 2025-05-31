import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-gate',
  standalone: true,
  templateUrl: './gate.component.html',
  styleUrls: ['./gate.component.css'],
  imports: [CommonModule] // ⬅️ THIS is the important part
})
export class GateComponent implements OnInit {
  currentTime: string = '';
  gateStatus: 'închis' | 'deschis' | 'în curs de deschidere' | 'în curs de închidere' = 'închis';
  pendingLogs: any[] = [];
  loading = false;
  error: string = '';

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    this.loadPendingLogs();
    setInterval(() => this.loadPendingLogs(), 10000);
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('ro-RO', { hour12: false });
  }

  get gateStatusClass() {
    switch (this.gateStatus) {
      case 'deschis': return 'deschis';
      case 'închis': return 'inchis';
      case 'în curs de deschidere': return 'in-curs-deschidere';
      case 'în curs de închidere': return 'in-curs-inchidere';
      default: return '';
    }
  }

  openGate() {
    if (this.gateStatus !== 'închis') return;
    
    this.gateStatus = 'în curs de deschidere';
    
    setTimeout(() => {
      this.gateStatus = 'deschis';
      
      setTimeout(() => {
        this.gateStatus = 'în curs de închidere';
        
        setTimeout(() => {
          this.gateStatus = 'închis';
        }, 2000); // Time for closing animation
      }, 3000); // Time gate stays open
    }, 2000); // Time for opening animation
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
      this.loadPendingLogs();
    } else {
      alert('Failed to update access status.');
    }
  }
}
