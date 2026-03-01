import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AiService, AffordabilityInfo } from '../../services/ai.service';

interface Criterion {
  name: string;
  weight: number;
}

interface RankedProduct {
  name: string;
  weightedScore: number;
  rank: number;
}

interface ProductDetail {
  product: string;
  byCriterion: Record<string, string>;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class Results {
  topic: string = '';
  products: string[] = [];
  criteria: Criterion[] = [];
  scores: Record<string, Record<string, number>> = {};
  rankedProducts: RankedProduct[] = [];
  productDetails: ProductDetail[] = [];
  budget: number | null = null;
  affordability: Record<string, AffordabilityInfo> = {};

  constructor(private aiService: AiService) {}

  ngOnInit() {
    this.topic = localStorage.getItem('decisionTopic') || 'Your Decision';
    const storedProducts = localStorage.getItem('decisionProducts');
    const storedCriteria = localStorage.getItem('decisionCriteria');
    const storedScores = localStorage.getItem('decisionScores');
    const storedDetails = localStorage.getItem('decisionProductDetails');
    const storedBudget = localStorage.getItem('decisionBudget');
    const storedAffordability = localStorage.getItem('decisionAffordability');

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
    if (storedScores) {
      try {
        this.scores = JSON.parse(storedScores);
      } catch {
        this.scores = {};
      }
    }

    if (storedDetails) {
      try {
        this.productDetails = JSON.parse(storedDetails);
      } catch {
        this.productDetails = [];
      }
    }

    if (storedBudget) {
      const num = parseFloat(storedBudget);
      if (Number.isFinite(num) && num > 0) {
        this.budget = num;
      }
    }

    if (storedAffordability) {
      try {
        this.affordability = JSON.parse(storedAffordability);
      } catch {
        this.affordability = {};
      }
    }

    this.rankedProducts = this.computeRankedProducts();

    if (this.budget != null && this.products.length) {
      this.aiService
        .checkAffordability(this.topic, this.products, this.budget)
        .subscribe({
          next: res => {
            this.affordability = res.affordability || {};
            localStorage.setItem('decisionAffordability', JSON.stringify(this.affordability));
            this.rankedProducts = this.computeRankedProducts();
          },
          error: () => {
            // Fail silently for affordability errors; rankings will still be shown.
          }
        });
    }
  }

  getScore(product: string, criterionName: string): number {
    return this.scores[product]?.[criterionName] ?? 0;
  }

  getWeightedScore(product: string): number {
    const r = this.rankedProducts.find(r => r.name === product);
    return r?.weightedScore ?? 0;
  }

  getRankExplanation(item: RankedProduct): string {
    if (!this.criteria.length) {
      return `Ranked #${item.rank} based on your ratings.`;
    }

    const contributions = this.criteria.map(crit => {
      const score = this.getScore(item.name, crit.name);
      return {
        name: crit.name,
        weight: crit.weight,
        score,
        value: crit.weight * score,
      };
    });

    contributions.sort((a, b) => b.value - a.value);
    const top = contributions.filter(c => c.value > 0).slice(0, 3);

    if (!top.length) {
      return `Ranked #${item.rank} based on your ratings across all criteria.`;
    }

    const detailFor = (product: string, criterionName: string): string => {
      const pd = this.productDetails.find(p => p.product === product);
      return pd?.byCriterion?.[criterionName] ?? '';
    };

    const parts = top.map(c => {
      const detail = detailFor(item.name, c.name);
      const base = `${c.name} (${c.score}/10 with weight ${c.weight})`;
      return detail ? `${base}: ${detail}` : base;
    });

    const mainReason = `Ranked #${item.rank} because it performed best on ${parts.join(
      '; '
    )}. These are the criteria and key features that drove its score.`;

    const affordabilityInfo = this.affordability[item.name];
    if (this.budget != null && affordabilityInfo?.expensive) {
      const extra =
        affordabilityInfo.reason ||
        'This option appears more expensive than your stated budget, so its overall score was slightly penalized.';
      return `${mainReason} Note: ${extra}`;
    }

    return mainReason;
  }

  private computeRankedProducts(): RankedProduct[] {
    const results: RankedProduct[] = [];

    for (const product of this.products) {
      let weightedScore = 0;
      for (const crit of this.criteria) {
        const score = this.getScore(product, crit.name);
        weightedScore += crit.weight * score;
      }

      // Apply a gentle penalty if this product is considered above budget.
      const isExpensive = this.affordability[product]?.expensive;
      if (isExpensive) {
        weightedScore *= 0.8;
      }

      results.push({ name: product, weightedScore, rank: 0 });
    }

    results.sort((a, b) => b.weightedScore - a.weightedScore);

    results.forEach((r, i) => {
      r.rank = i + 1;
    });

    return results;
  }
}
