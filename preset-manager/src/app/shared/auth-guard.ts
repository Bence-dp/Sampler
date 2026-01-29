import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  // return true;

  // injection par programe (au lieu de le faire dans le constructeur d'un composant)
  let authService = inject(AuthService);
  let router = inject(Router);

  // si ça renvoie true, alors on peut activer la route
  return authService.isAdmin()
    .then(authentifie => {
      if (authentifie) {
        console.log("Vous êtes Admin, navigation autorisée");
        return true;
      } else {
        console.log("Vous n'êtes pas Admin, navigation refusée");
        router.navigate(["/home"]);
        return false;
      }
    });
};
