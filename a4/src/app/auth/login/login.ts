import { Component, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);

  empId = '';
  password = '';
  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  onSubmit(): void {
    const empId = this.empId.trim();
    const password = this.password;

    if (!empId || !password) {
      this.errorMessage.set('Please enter both your Employee ID and password.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.login(empId, password).subscribe({
      next: () => {
        // Navigation inside an HTTP callback must run in the Angular zone.
        this.ngZone.run(() => {
          this.submitting.set(false);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/authors';
          this.router.navigateByUrl(returnUrl);
        });
      },
      error: (err: HttpErrorResponse) => {
        this.ngZone.run(() => {
          this.submitting.set(false);
          this.errorMessage.set(err.error?.error || 'Login failed. Please try again.');
        });
      },
    });
  }
}
