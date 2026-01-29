import { ChangeDetectionStrategy } from '@angular/core';
import { Component, OnInit, signal } from '@angular/core';
import { MatDivider } from "@angular/material/divider";
import { FormsModule } from '@angular/forms';
import { MatButton } from "@angular/material/button";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatList, MatListItem, MatListSubheaderCssMatStyler, MatListItemTitle } from '@angular/material/list';

import { Preset } from './preset.model';
import { PresetsService } from '../shared/presets.service';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-presets',
  imports: [
    MatDivider,
    MatList,
    MatListItem,
    FormsModule,
    MatButton,
    MatFormFieldModule,
    MatInputModule,
    MatListSubheaderCssMatStyler,
    MatListItemTitle,
    RouterLink
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './presets.html',
  styleUrl: './presets.css',
})

export class Presets implements OnInit {
  title = "Sampler Presets";
  formVisible = false;
  presetSelectionne!: Preset;
  presets = signal<Preset[]>([]);

  constructor(private presetService:PresetsService) {}

  ngOnInit(): void {
    this.getPresets();
  }

  presetClique(preset: Preset) {
    if (!this.presetSelectionne) {
      this.presetSelectionne = preset;
    } else {
      this.presetSelectionne = null;
    }
  }

  getPresets() {
    this.presetService.getPresets().subscribe(presets => {
      console.log('Presets received:', presets);
      this.presets.set(presets);
    });
  }
}
