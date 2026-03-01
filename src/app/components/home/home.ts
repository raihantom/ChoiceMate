import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router ,RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule , RouterModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  decisionTopic: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    const keys = [
      'decisionTopic',
      'decisionProducts',
      'decisionCriteria',
      'decisionScores',
      'decisionProductDetails',
      'decisionBudget',
      'decisionAffordability'
    ];
    keys.forEach(k => localStorage.removeItem(k));
  }

  startBuilding() {
    if (this.decisionTopic.trim()) {
      this.router.navigate(['/products'], { queryParams: { topic: this.decisionTopic } });
    } else {
      alert('Please enter a decision topic to start building your decision tree.');
    }
  }
}
