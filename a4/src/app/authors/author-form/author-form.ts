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

  localValidationMessage = '';

  formAuthor: Author = this.createEmptyAuthor();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['author']) {
      this.formAuthor = this.cloneAuthor(this.author);
    }
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid || !this.hasValidAuthorFormat()) {
      this.localValidationMessage =
        'Please fix invalid fields. Format: ID 123-45-6789, State 2 letters, Zip 5 digits.';
      return;
    }

    this.localValidationMessage = '';
    this.save.emit(this.buildAuthorPayload());
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private hasValidAuthorFormat(): boolean {
    return (
      this.idPattern.test(this.formAuthor.au_id.trim()) &&
      this.statePattern.test(this.formAuthor.state.trim()) &&
      this.zipPattern.test(this.formAuthor.zip.trim())
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