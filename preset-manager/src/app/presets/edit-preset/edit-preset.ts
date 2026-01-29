import { Component, OnInit, signal } from '@angular/core';
import { Preset, Sample } from '../preset.model';
import { PresetsService } from '../../shared/presets.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from '@angular/material/button';
import { MatIconButton } from "@angular/material/button";
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-edit-preset',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconButton,
    MatIcon,
  ],
  templateUrl: './edit-preset.html',
  styleUrl: './edit-preset.css',
})
export class EditPreset implements OnInit{
  preset = signal<Preset | undefined>(undefined);
  // pour les champs du formulaire
  nomPreset = '';
  typePreset = '';
  samples: Sample[] = [];

  constructor(
    private presetsService: PresetsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getPreset();

    // affichage des queryParams et fragment
    console.log("Query Params :");
    console.log(this.route.snapshot.queryParams);
    console.log("Fragment :");
    console.log(this.route.snapshot.fragment);
  }

  getPreset() {
    const id = this.route.snapshot.params['id'];
    this.presetsService.getPreset(id).subscribe(p => {
      console.log('Preset loaded for edit:', p);
      this.preset.set(p);
      if (p === undefined) return;
      this.nomPreset = p.name;
      this.typePreset = p.type;
      this.samples = [...p.samples];
    });
  }

  addSample(): void {
    if (this.samples.length < 16) {
      this.samples.push({ name: '', url: '' });
    }
  }

  removeSample(index: number): void {
    this.samples.splice(index, 1);
  }

  onSaveAssignment() {
    const currentPreset = this.preset();
    if (!currentPreset) return;
    if (this.nomPreset == '' || this.typePreset === '') return;

    // on récupère les valeurs dans le formulaire
    currentPreset.name = this.nomPreset;
    currentPreset.type = this.typePreset;
    currentPreset.samples = this.samples.filter(s => s.name && s.url);
    
    this.presetsService.updatePreset(currentPreset).subscribe((message) => {
      console.log(message);

      //navigation vers la home page
      this.router.navigate(['/home']);
    });
  }
}
