import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Author } from '../author';

@Component({
  selector: 'app-author-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './author-form.html',
  styleUrl: './author-form.scss',
})
export class AuthorFormComponent implements OnChanges {
  @Input() author: Author | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<Author>();
  @Output() cancel = new EventEmitter<void>();

  readonly idPattern = /^\d{3}-\d{2}-\d{4}$/;
  readonly statePattern = /^[A-Za-z]{2}$/;
  readonly zipPattern = /^\d{5}$/;
  readonly namePattern = /^[a-zA-Z\s'-]*$/;
  readonly phoneCleanPattern = /\D/g;

  localValidationMessage = '';

  formAuthor: Author = this.createEmptyAuthor();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['author']) {
      this.formAuthor = this.cloneAuthor(this.author);
    }
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid || !this.hasValidAuthorFormat()) {
      this.localValidationMessage = this.getDetailedValidationErrors();
      return;
    }

    this.localValidationMessage = '';
    this.save.emit(this.buildAuthorPayload());
  }

  formatPhoneNumber(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(this.phoneCleanPattern, '');

    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    let formatted = '';
    if (value.length > 0) {
      formatted = value.slice(0, 3);
    }
    if (value.length > 3) {
      formatted += '-' + value.slice(3, 6);
    }
    if (value.length > 6) {
      formatted += '-' + value.slice(6, 10);
    }

    this.formAuthor.phone = formatted;
    input.value = formatted;
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private getDetailedValidationErrors(): string {
    const errors: string[] = [];

    if (!this.formAuthor.au_fname.trim() || !this.namePattern.test(this.formAuthor.au_fname.trim())) {
      errors.push('First name: letters only');
    }
    if (!this.formAuthor.au_lname.trim() || !this.namePattern.test(this.formAuthor.au_lname.trim())) {
      errors.push('Last name: letters only');
    }
    if (!this.formAuthor.phone.trim() || !/^\d{3}-\d{3}-\d{4}$/.test(this.formAuthor.phone.trim())) {
      errors.push('Phone: 000-000-0000 format');
    }
    if (!this.formAuthor.address.trim()) {
      errors.push('Address: required');
    }
    if (!this.formAuthor.city.trim()) {
      errors.push('City: required');
    }
    if (!this.formAuthor.state.trim() || !this.statePattern.test(this.formAuthor.state.trim())) {
      errors.push('State: 2 letters');
    }
    if (!this.formAuthor.zip.trim() || !this.zipPattern.test(this.formAuthor.zip.trim())) {
      errors.push('Zip: 5 digits');
    }

    return errors.length > 0 ? 'Fix these errors: ' + errors.join(', ') + '.' : 'Please fix all required fields.';
  }

  private hasValidAuthorFormat(): boolean {
    return (
      this.idPattern.test(this.formAuthor.au_id.trim()) &&
      this.statePattern.test(this.formAuthor.state.trim()) &&
      this.zipPattern.test(this.formAuthor.zip.trim()) &&
      this.namePattern.test(this.formAuthor.au_fname.trim()) &&
      this.namePattern.test(this.formAuthor.au_lname.trim()) &&
      this.formAuthor.au_fname.trim().length > 0 &&
      this.formAuthor.au_lname.trim().length > 0 &&
      /^\d{3}-\d{3}-\d{4}$/.test(this.formAuthor.phone.trim()) &&
      this.formAuthor.address.trim().length > 0 &&
      this.formAuthor.city.trim().length > 0
    );
  }

  private buildAuthorPayload(): Author {
    return {
      ...this.formAuthor,
      au_id: this.formAuthor.au_id.trim(),
      au_fname: this.formAuthor.au_fname.trim(),
      au_lname: this.formAuthor.au_lname.trim(),
      phone: this.formAuthor.phone.trim(),
      address: this.formAuthor.address.trim(),
      city: this.formAuthor.city.trim(),
      state: this.formAuthor.state.trim().toUpperCase(),
      zip: this.formAuthor.zip.trim(),
    };
  }

  private cloneAuthor(author: Author | null): Author {
    if (!author) {
      return this.createEmptyAuthor();
    }

    return {
      ...author,
    };
  }

  private createEmptyAuthor(): Author {
    return {
      au_id: '',
      au_fname: '',
      au_lname: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      contract: false,
    };
  }
}