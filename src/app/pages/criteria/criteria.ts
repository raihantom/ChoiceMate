import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AiService, Criterion, ProductDetail } from '../../services/ai.service';

@Component({
  selector: 'app-criteria',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './criteria.html',
  styleUrl: './criteria.css',
})
export class Criteria {
  topic: string = '';
  products: string[] = [];
  errorMessage: string = '';
  isLoadingAI: boolean = false;
  isLoadingProductDetails: boolean = false;
  productDetails: ProductDetail[] = [];

  criteria: Criterion[] = [{ name: '', weight: 5 }];

  constructor(private route: ActivatedRoute,private router: Router,private aiService: AiService) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.topic = params['topic'] || localStorage.getItem('decisionTopic') || 'Your Decision';
    });
    const stored = localStorage.getItem('decisionProducts');
    if (stored) {
      try {
        this.products = JSON.parse(stored);
      } catch {
        this.products = [];
      }
    }
    const storedDetails = localStorage.getItem('decisionProductDetails');
    if (storedDetails) {
      try {
        this.productDetails = JSON.parse(storedDetails);
      } catch {
        this.productDetails = [];
      }
    }
  }

  addCriterion() {
    this.criteria.push({ name: '', weight: 5 });
  }

  removeCriterion(index: number) {
    this.criteria.splice(index, 1);
  }

  generateAICriteria() {
    this.isLoadingAI = true;
    this.errorMessage = '';

    this.aiService.suggestCriteria(this.topic, this.products).subscribe({
      next: (res: any) => {
        this.criteria = res.criteria.length > 0 ? res.criteria : [{ name: '', weight: 5 }];
        this.isLoadingAI = false;
      },
      error: (err: any) => {
        this.errorMessage = err.message;
        this.isLoadingAI = false;
      }
    });
  }

  fetchProductDetails() {
    const cleanedCriteria = this.criteria
      .map(c => ({ ...c, name: c.name.trim() }))
      .filter(c => c.name.length > 0);
    if (this.products.length === 0 || cleanedCriteria.length === 0) {
      this.errorMessage = 'Add at least one product and one criterion before fetching details.';
      return;
    }

    this.isLoadingProductDetails = true;
    this.errorMessage = '';

    this.aiService
      .getProductDetails(this.topic, this.products, cleanedCriteria)
      .subscribe({
        next: (res: any) => {
          this.productDetails = res.details;
          localStorage.setItem('decisionProductDetails', JSON.stringify(this.productDetails));
          this.isLoadingProductDetails = false;
        },
        error: (err: any) => {
          this.errorMessage = err.message;
          this.isLoadingProductDetails = false;
        }
      });
  }

  get hasValidCriteria(): boolean {
    return this.criteria.some(c => c.name.trim().length > 0);
  }

  getDetailForProduct(product: string, criterion: string): string {
    const d = this.productDetails.find(p => p.product === product);
    return d?.byCriterion?.[criterion] ?? '—';
  }

  validateAndProceed() {
    this.errorMessage = '';

    if (this.criteria.length === 0) {
      this.errorMessage = 'You must add at least one criterion to make a decision.';
      return;
    }

    for (let crit of this.criteria) {
      if (!crit.name || crit.name.trim() === '') {
        this.errorMessage = 'All criteria must have a name.';
        return;
      }
      if (crit.weight < 1 || crit.weight > 10) {
        this.errorMessage = 'Weights must be between 1 and 10.';
        return;
      }
    }

    localStorage.setItem('decisionTopic', this.topic);
    localStorage.setItem('decisionCriteria', JSON.stringify(this.criteria));
    this.router.navigate(['/weights']);
  }
}
