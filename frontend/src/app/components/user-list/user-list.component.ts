import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  isLoading = true;
  error: string | null = null;
  isDeleting: string | null = null;
  userToDelete: any = null;
  
  constructor(private supabaseService: SupabaseService) {}
  
  async ngOnInit() {
    await this.loadUsers();
  }
  
  async loadUsers() {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await fetch('http://localhost:3000/admin/users');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Nu s-au putut încărca utilizatorii');
      }
      
      this.users = data.users;
    } catch (error: any) {
      this.error = error.message || 'Nu s-au putut încărca utilizatorii';
      console.error('Failed to load users:', error);
    } finally {
      this.isLoading = false;
    }
  }

  confirmDelete(user: any) {
    this.userToDelete = user;
  }

  async deleteUser(userId: string) {
    this.isDeleting = userId;
    
    try {
      const response = await fetch(`http://localhost:3000/admin/delete-user/${userId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Nu s-a putut șterge utilizatorul');
      }
      
      // Remove from the local list
      this.users = this.users.filter(user => user.id !== userId);
      this.userToDelete = null;
    } catch (error: any) {
      this.error = error.message || 'Nu s-a putut șterge utilizatorul';
      console.error('Failed to delete user:', error);
    } finally {
      this.isDeleting = null;
    }
  }
}
