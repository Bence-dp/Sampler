import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Preset } from '../preset.model';
import { MatCardModule } from '@angular/material/card';
import { PresetsService } from '../../shared/presets.service';
import { MatAnchor } from "@angular/material/button";
import { Observable } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-preset-detail',
  imports: [
    MatCardModule,
    MatAnchor,
    DatePipe
],
  templateUrl: './preset-detail.html',
  styleUrl: './preset-detail.css',
})
export class PresetDetail {
  presetTransmis?: Preset;
  
  constructor(private presetsService: PresetsService, private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.getPreset();
  }

  getPreset() {
    const id = this.route.snapshot.params['id'];

    this.presetsService.getPreset(id).subscribe(p => {
      this.presetTransmis = p;
    });
  }

  onAssignmentRendu() {
    // Method kept for potential future use with presets
  }

  onClickEdit() {
    if (!this.presetTransmis) return;
    this.router.navigate(['/preset', this.presetTransmis.slug || this.presetTransmis.name, 'edit'],
      {queryParams:{nom:this.presetTransmis.name}, fragment:'edition'});
  }

  onDelete() {
    this.presetsService.deletePreset(this.presetTransmis).subscribe(() => {
      console.log('Preset deleted');
      this.presetTransmis = null;
      this.router.navigate(['home']);
    });
  }

  isAdmin(): boolean {
    return this.authService.loggedIn;
  }
}
