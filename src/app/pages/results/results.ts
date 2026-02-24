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

  ngOnInit() {
    this.topic = localStorage.getItem('decisionTopic') || 'Your Decision';
    const storedProducts = localStorage.getItem('decisionProducts');
    const storedCriteria = localStorage.getItem('decisionCriteria');
    const storedScores = localStorage.getItem('decisionScores');

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
        value: crit.weight * score,
      };
    });

    contributions.sort((a, b) => b.value - a.value);
    const top = contributions.filter(c => c.value > 0).slice(0, 3);

    if (!top.length) {
      return `Ranked #${item.rank} based on your ratings across all criteria.`;
    }

    const names = top.map(c => c.name);
    let reason: string;
    if (names.length === 1) {
      reason = names[0];
    } else if (names.length === 2) {
      reason = `${names[0]} and ${names[1]}`;
    } else {
      reason = `${names[0]}, ${names[1]}, and ${names[2]}`;
    }

    return `Ranked #${item.rank} because it scored strongest on ${reason} given your weights.`;
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
