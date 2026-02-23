import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router,ActivatedRoute,RouterModule } from '@angular/router'; 
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  topic: string =  '';
  products: string[] = [];
  newProductName: string = '';
  errorMessage: string = '';

  constructor(private router: Router, private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.topic = params['topic'] || 'Your Decision';
    });
  }
  addProduct() {
    const name = this.newProductName.trim();
    if (name && !this.products.includes(name)) {
      this.products.push(name);
      this.newProductName = '';
      this.errorMessage = '';
    } else if (this.products.includes(name)) {
      this.errorMessage = 'Product already exists.';
    }
  }

  removeProduct(index: number) {
    this.products.splice(index, 1);
    this.errorMessage = '';
  }

  validateAndProceed() {
    this.errorMessage = '';
    if (this.products.length === 0){
      this.errorMessage = 'Please add at least one product.';
      return; 
    }
    localStorage.setItem('decisionTopic', this.topic);
    localStorage.setItem('decisionProducts', JSON.stringify(this.products));
    this.router.navigate(['/criteria'], {
      queryParams: { topic: this.topic }
    });
  }
}
