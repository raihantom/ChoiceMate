import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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

  ngOnInit() {
    this.topic = localStorage.getItem('decisionTopic') || 'Your Decision';
    const storedProducts = localStorage.getItem('decisionProducts');
    const storedCriteria = localStorage.getItem('decisionCriteria');
    const storedScores = localStorage.getItem('decisionScores');
    const storedDetails = localStorage.getItem('decisionProductDetails');

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

    this.rankedProducts = this.computeRankedProducts();
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

    return `Ranked #${item.rank} because it performed best on ${parts.join(
      '; '
    )}. These are the criteria and key features that drove its score.`;
  }

  private computeRankedProducts(): RankedProduct[] {
    const results: RankedProduct[] = [];

    for (const product of this.products) {
      let weightedScore = 0;
      for (const crit of this.criteria) {
        const score = this.getScore(product, crit.name);
        weightedScore += crit.weight * score;
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
