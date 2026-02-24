import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AiService, Criterion as AiCriterion } from '../../services/ai.service';

interface Criterion {
  name: string;
  weight: number;
}

@Component({
  selector: 'app-weights',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './weights.html',
  styleUrl: './weights.css',
})
export class Weights {
  topic: string = '';
  products: string[] = [];
  criteria: Criterion[] = [];
  scores: Record<string, Record<string, number>> = {};
  errorMessage: string = '';
  isLoadingAIScores: boolean = false;

  constructor(
    private router: Router,
    private aiService: AiService
  ) {}

  ngOnInit() {
    this.topic = localStorage.getItem('decisionTopic') || 'Your Decision';
    const storedProducts = localStorage.getItem('decisionProducts');
    const storedCriteria = localStorage.getItem('decisionCriteria');
    if (storedProducts) {
      try {
        this.products = JSON.parse(storedProducts);
      } catch {
        this.products = [];
      }
    }
    if (storedCriteria) {
      try {
        this.criteria = JSON.parse(storedCriteria);
      } catch {
        this.criteria = [];
      }
    }
    const storedScores = localStorage.getItem('decisionScores');
    if (storedScores) {
      try {
        this.scores = JSON.parse(storedScores);
      } catch {
        this.scores = {};
      }
    }
    this.ensureScoresInitialized();
  }

  private ensureScoresInitialized() {
    for (const product of this.products) {
      if (!this.scores[product]) {
        this.scores[product] = {};
      }
      for (const crit of this.criteria) {
        if (this.scores[product][crit.name] == null) {
          this.scores[product][crit.name] = 5;
        }
      }
    }
  }

  getScore(product: string, criterionName: string): number {
    return this.scores[product]?.[criterionName] ?? 5;
  }

  setScore(product: string, criterionName: string, value: number) {
    if (!this.scores[product]) {
      this.scores[product] = {};
    }
    this.scores[product][criterionName] = Math.max(1, Math.min(10, value));
  }

  validateAndProceed() {
    this.errorMessage = '';
    localStorage.setItem('decisionScores', JSON.stringify(this.scores));
    this.router.navigate(['/results']);
  }

  generateAIScores() {
    if (!this.products.length || !this.criteria.length) {
      this.errorMessage = 'Add products and criteria before asking AI to score them.';
      return;
    }

    const cleanedCriteria: AiCriterion[] = this.criteria
      .map(c => ({ name: c.name.trim(), weight: c.weight }))
      .filter(c => c.name.length > 0);

    if (!cleanedCriteria.length) {
      this.errorMessage = 'All criteria must have a name before AI can score them.';
      return;
    }

    this.isLoadingAIScores = true;
    this.errorMessage = '';

    this.aiService
      .suggestScores(this.topic, this.products, cleanedCriteria)
      .subscribe({
        next: (res: any) => {
          this.scores = res.scores || {};
          this.ensureScoresInitialized();
          localStorage.setItem('decisionScores', JSON.stringify(this.scores));
          this.isLoadingAIScores = false;
        },
        error: (err: any) => {
          this.errorMessage = err.message;
          this.isLoadingAIScores = false;
        }
      });
  }
}
