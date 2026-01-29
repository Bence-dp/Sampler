import { Routes } from '@angular/router';
import { Presets } from './presets/presets';
import { AddPreset } from './presets/add-preset/add-preset';
import { PresetDetail } from './presets/preset-detail/preset-detail';
import { EditPreset } from './presets/edit-preset/edit-preset';
import { authGuard } from './shared/auth-guard';

export const routes: Routes = [
    // home page qui sera affiché avec http://localhost:4200/
    // elle sera redirigée vers la page /home
    {path: '', redirectTo: '/home', pathMatch: 'full'},

    // page home sera affichée avec l'url http://localhost:4200/home
    {path: 'home', component: Presets},
    {path: 'add', component: AddPreset},
    {path: 'preset/:id', component: PresetDetail},
    {path: 'preset/:id/edit', component: EditPreset, canActivate: [authGuard]}
];
