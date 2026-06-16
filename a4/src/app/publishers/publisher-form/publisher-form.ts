import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Publisher } from '../publisher';

@Component({
  selector: 'app-publisher-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './publisher-form.html',
  styleUrl: './publisher-form.scss',
})
export class PublisherFormComponent implements OnChanges {
  @Input() publisher: Publisher | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<Publisher>();
  @Output() cancel = new EventEmitter<void>();

  readonly idPattern = /^99\d{2}$/;
  readonly statePattern = /^[A-Za-z]{2}$/;
  readonly cityPattern = /^[\p{L}\s'.-]*$/u;

  localValidationMessage = '';

  formPublisher: Publisher = this.createEmptyPublisher();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publisher']) {
      this.formPublisher = this.clonePublisher(this.publisher);
    }
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid || !this.hasValidPublisherFormat()) {
      this.localValidationMessage = this.getDetailedValidationErrors();
      return;
    }

    this.localValidationMessage = '';
    this.save.emit(this.buildPublisherPayload());
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private getDetailedValidationErrors(): string {
    const errors: string[] = [];

    if (!this.formPublisher.pub_name.trim()) {
      errors.push('Name: required');
    }
    if (this.formPublisher.city.trim() && !this.cityPattern.test(this.formPublisher.city.trim())) {
      errors.push('City: letters only (no numbers)');
    }
    if (this.formPublisher.state.trim() && !this.statePattern.test(this.formPublisher.state.trim())) {
      errors.push('State: 2 letters');
    }

    return errors.length > 0 ? 'Fix these errors: ' + errors.join(', ') + '.' : 'Please fix all required fields.';
  }

  private hasValidPublisherFormat(): boolean {
    const cityValue = this.formPublisher.city.trim();
    const stateValue = this.formPublisher.state.trim();

    return (
      this.formPublisher.pub_name.trim().length > 0 &&
      (cityValue.length === 0 || this.cityPattern.test(cityValue)) &&
      (stateValue.length === 0 || this.statePattern.test(stateValue))
    );
  }

  private buildPublisherPayload(): Publisher {
    return {
      ...this.formPublisher,
      pub_id: this.formPublisher.pub_id.trim(),
      pub_name: this.formPublisher.pub_name.trim(),
      city: this.formPublisher.city.trim(),
      state: this.formPublisher.state.trim().toUpperCase(),
      country: this.formPublisher.country.trim(),
    };
  }

  private clonePublisher(publisher: Publisher | null): Publisher {
    if (!publisher) {
      return this.createEmptyPublisher();
    }

    return {
      ...publisher,
    };
  }

  private createEmptyPublisher(): Publisher {
    return {
      pub_id: '',
      pub_name: '',
      city: '',
      state: '',
      country: '',
    };
  }
}
