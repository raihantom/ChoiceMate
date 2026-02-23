import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Criteria } from './pages/criteria/criteria';
import { Results } from './pages/results/results';
import { About } from './components/about/about';
import { Contact } from './components/contact/contact';
import { Products } from './pages/products/products';
import { Weights } from './pages/weights/weights';




export const routes: Routes = [
    { path: '', component: Home },
    { path: 'products', component: Products },
    { path: 'criteria', component: Criteria },
    { path: 'results', component: Results },
    { path: 'about', component: About },
    { path: 'weights', component: Weights },
    { path: 'contact', component: Contact },
    { path: '**', redirectTo: '' }
];
