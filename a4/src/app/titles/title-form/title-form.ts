import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Title } from '../title';
import { Publisher, PublisherService } from '../../publishers/publisher';

@Component({
  selector: 'app-title-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './title-form.html',
  styleUrl: './title-form.scss',
})
export class TitleFormComponent implements OnChanges, OnInit {
  @Input() title: Title | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<Title>();
  @Output() cancel = new EventEmitter<void>();

  readonly idPattern = /^[A-Za-z]{2}\d{4}$/;

  localValidationMessage = '';
  publishers: Publisher[] = [];

  formTitle: Title = this.createEmptyTitle();

  constructor(private publisherService: PublisherService) {}

  ngOnInit(): void {
    this.publisherService.getPublishers().subscribe({
      next: publishers => (this.publishers = publishers),
      error: err => console.error('Error loading publishers for title form', err)
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['title']) {
      this.formTitle = this.cloneTitle(this.title);
    }
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid || !this.hasValidTitleFormat()) {
      this.localValidationMessage = this.getDetailedValidationErrors();
      return;
    }

    this.localValidationMessage = '';
    this.save.emit(this.buildTitlePayload());
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private getDetailedValidationErrors(): string {
    const errors: string[] = [];

    if (!this.formTitle.title.trim()) {
      errors.push('Title: required');
    }
    if (this.formTitle.price !== null && Number(this.formTitle.price) < 0) {
      errors.push('Price: must not be negative');
    }
    if (this.formTitle.ytd_sales !== null && Number(this.formTitle.ytd_sales) < 0) {
      errors.push('YTD sales: must not be negative');
    }

    return errors.length > 0 ? 'Fix these errors: ' + errors.join(', ') + '.' : 'Please fix all required fields.';
  }

  private hasValidTitleFormat(): boolean {
    return this.formTitle.title.trim().length > 0;
  }

  private buildTitlePayload(): Title {
    return {
      ...this.formTitle,
      title_id: this.formTitle.title_id.trim().toUpperCase(),
      title: this.formTitle.title.trim(),
      type: (this.formTitle.type || '').trim() || 'UNDECIDED',
      pub_id: this.formTitle.pub_id ? this.formTitle.pub_id : null,
      notes: (this.formTitle.notes || '').trim(),
    };
  }

  private cloneTitle(title: Title | null): Title {
    if (!title) {
      return this.createEmptyTitle();
    }

    return {
      ...title,
      pubdate: this.toDateInputValue(title.pubdate),
    };
  }

  private toDateInputValue(value: string | null): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }

  private createEmptyTitle(): Title {
    return {
      title_id: '',
      title: '',
      type: '',
      pub_id: null,
      price: null,
      advance: null,
      royalty: null,
      ytd_sales: null,
      notes: '',
      pubdate: new Date().toISOString().slice(0, 10),
    };
  }
}
