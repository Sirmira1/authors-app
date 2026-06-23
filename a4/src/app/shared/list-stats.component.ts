import { Component, Input } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';

export interface Stat {
  label: string;
  value: string | number;
  icon?: string;
}

/**
 * Reusable stats summary component for list pages.
 * Displays key metrics like "12 total records", "3 new this month", etc.
 */
@Component({
  selector: 'app-list-stats',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <div class="list-stats" *ngIf="stats && stats.length > 0">
      <div class="list-stat-item" *ngFor="let stat of stats">
        <span class="list-stat-icon" *ngIf="stat.icon">{{ stat.icon }}</span>
        <div class="list-stat-content">
          <span class="list-stat-label">{{ stat.label }}</span>
          <span class="list-stat-value">{{ stat.value }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .list-stats {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: rgba(33, 121, 183, 0.05);
        border-radius: 8px;
        border-left: 4px solid #2179b7;
        flex-wrap: wrap;
      }

      .dark-mode .list-stats {
        background: rgba(56, 182, 255, 0.08);
        border-left-color: #38b6ff;
      }

      .list-stat-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .list-stat-icon {
        font-size: 1.5rem;
      }

      .list-stat-content {
        display: flex;
        flex-direction: column;
      }

      .list-stat-label {
        font-size: 0.85rem;
        color: var(--on-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
      }

      .list-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--on-charcoal);
      }

      @media (max-width: 768px) {
        .list-stats {
          gap: 1rem;
        }

        .list-stat-label {
          font-size: 0.75rem;
        }

        .list-stat-value {
          font-size: 1.25rem;
        }
      }
    `,
  ],
})
export class ListStatsComponent {
  @Input() stats: Stat[] | null = null;
}
