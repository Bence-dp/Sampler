import { Component, EventEmitter, OnInit, Output, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Preset, Sample } from '../preset.model';
import { Router, RouterLink } from "@angular/router";
import { PresetsService } from '../../shared/presets.service';


@Component({
  selector: 'app-add-preset',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton,
    MatIconButton,
    MatIcon
],
  templateUrl: './add-preset.html',
  styleUrl: './add-preset.css',
})
export class AddPreset implements OnInit {
  ajoutActive = true;

  nomPreset: string = "";
  typePreset: string = "Drumkit";
  isFactoryPresets: boolean = false;
  samples: Sample[] = [];

  private router = inject(Router);

  constructor(private presetService: PresetsService) {}

  ngOnInit(): void {
  }

  addSample(): void {
    if (this.samples.length < 16) {
      this.samples.push({ name: '', url: '' });
    }
  }

  removeSample(index: number): void {
    this.samples.splice(index, 1);
  }

  onAjouterPreset(event: Event): void {
    event.preventDefault();
    
    const newPreset: Preset = {
      name: this.nomPreset,
      type: this.typePreset,
      isFactoryPresets: this.isFactoryPresets,
      samples: this.samples.filter(s => s.name && s.url)
    };
    
    this.presetService.addPreset(newPreset)
      .subscribe( message => {
        console.log(message);
        this.router.navigate(['/home']);
      });
    }
}
