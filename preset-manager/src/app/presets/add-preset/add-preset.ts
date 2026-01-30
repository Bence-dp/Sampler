import { Component, EventEmitter, OnInit, Output, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
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
    MatIcon,
    MatRadioModule,
    CommonModule
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
      this.samples.push({ name: '', url: '', uploadMode: 'url' });
    }
  }

  removeSample(index: number): void {
    this.samples.splice(index, 1);
  }

  onFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const previousName = this.samples[index].name;
      this.samples[index].file = file;
      // Only auto-fill name if it's still empty
      if (!previousName || previousName.trim() === '') {
        this.samples[index].name = file.name.replace(/\.[^/.]+$/, '');
      }
      // If user had a custom name, keep it
    }
  }

  onAjouterPreset(event: Event): void {
    event.preventDefault();
    
    // Check if any samples use file upload
    const hasFileUploads = this.samples.some(s => s.uploadMode === 'file' && s.file);
    
    if (hasFileUploads) {
      // Handle file uploads
      const fileSamples = this.samples.filter(s => s.uploadMode === 'file' && s.file && s.name);
      // Only send name and url fields for URL samples (exclude uploadMode, file)
      const urlSamples = this.samples
        .filter(s => s.uploadMode === 'url' && s.name && s.url)
        .map(s => ({ name: s.name, url: s.url }));
      
      console.log('File samples:', fileSamples);
      console.log('URL samples:', urlSamples);
      
      if (fileSamples.length > 0) {
        // Upload files first
        const files = fileSamples.map(s => s.file!);
        const sampleNames = fileSamples.map(s => s.name);
        
        console.log('Files to upload:', files.map(f => f.name));
        console.log('Sample names to send:', sampleNames);
        
        this.presetService.uploadFilesAndCreatePreset(
          this.nomPreset,
          this.typePreset,
          files,
          sampleNames,
          urlSamples
        ).subscribe({
          next: (response) => {
            console.log('Preset created with uploads:', response);
            this.router.navigate(['/home']);
          },
          error: (error) => {
            console.error('Error uploading files:', error);
            alert('Error uploading files. Please try again.');
          }
        });
      }
    } else {
      // No file uploads, use regular method
      const newPreset: Preset = {
        name: this.nomPreset,
        type: this.typePreset,
        isFactoryPresets: this.isFactoryPresets,
        samples: this.samples.filter(s => s.name && s.url)
      };
      
      this.presetService.addPreset(newPreset)
        .subscribe(message => {
          console.log(message);
          this.router.navigate(['/home']);
        });
    }
  }
}
