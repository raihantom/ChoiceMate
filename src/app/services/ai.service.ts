import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface Criterion {
  name: string;
  weight: number;
}

export interface ProductDetail {
  product: string;
  byCriterion: Record<string, string>;
}

export interface SuggestCriteriaResponse {
  criteria: Criterion[];
}

export interface ProductDetailsResponse {
  details: ProductDetail[];
}

export interface SuggestScoresResponse {
  scores: Record<string, Record<string, number>>;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  suggestCriteria(topic: string, products: string[] = []): Observable<SuggestCriteriaResponse> {
    return this.http
      .post<SuggestCriteriaResponse>(`${this.baseUrl}/suggest-criteria`, { topic, products })
      .pipe(catchError(this.handleError));
  }

  getProductDetails(
    topic: string,
    products: string[],
    criteria: Criterion[]
  ): Observable<ProductDetailsResponse> {
    return this.http
      .post<ProductDetailsResponse>(`${this.baseUrl}/product-details`, {
        topic,
        products,
        criteria
      })
      .pipe(catchError(this.handleError));
  }

  suggestScores(
    topic: string,
    products: string[],
    criteria: Criterion[]
  ): Observable<SuggestScoresResponse> {
    return this.http
      .post<SuggestScoresResponse>(`${this.baseUrl}/suggest-scores`, {
        topic,
        products,
        criteria
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(err: { status?: number; error?: { error?: string }; message?: string }) {
    const msg =
      err?.error?.error ||
      err?.message ||
      'An error occurred. Make sure the API server is running and GROQ_API_KEY is set.';
    return throwError(() => new Error(msg));
  }
}
