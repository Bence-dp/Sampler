import { Injectable } from '@angular/core';
import { Observable, of } from "rxjs";
import { Preset } from '../presets/preset.model';
import { LoggingService } from './logging.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})

export class PresetsService {
  backendURL = 'https://samplerserver.onrender.com/api/presets';

  constructor(private logginService: LoggingService, private http: HttpClient) {
    console.log("Service Presets créé !");
  }
  
  getPresets(): Observable<Preset[]> {
    return this.http.get<Preset[]>(this.backendURL);
  }

  addPreset(preset: Preset): Observable<Preset> {
    this.logginService.log(preset.name, "ajouté");
    return this.http.post<Preset>(this.backendURL, preset);
  }

  updatePreset(preset: Preset): Observable<Preset> {
    return this.http.put<Preset>(`${this.backendURL}/${preset.slug || preset.name}`, preset);
  }

  deletePreset(preset: Preset): Observable<void> {
    this.logginService.log(preset.name, "supprimé");
    return this.http.delete<void>(`${this.backendURL}/${preset.slug || preset.name}`);
  }

  getPreset(nameOrSlug: string): Observable<Preset | undefined> {
    return this.http.get<Preset>(`${this.backendURL}/${nameOrSlug}`);
  }

  uploadFilesAndCreatePreset(
    presetName: string, 
    presetType: string, 
    files: File[], 
    sampleNames: string[],
    urlSamples: Array<{name: string, url: string}> = []
  ): Observable<any> {
    const formData = new FormData();
    
    // Add files to form data
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    // Add preset name and type
    formData.append('presetName', presetName);
    formData.append('presetType', presetType);
    
    // Add sample names as JSON
    if (sampleNames.length > 0) {
      formData.append('sampleNames', JSON.stringify(sampleNames));
    }
    
    // Add URL samples if any
    console.log('URL samples to send:', urlSamples);
    if (urlSamples.length > 0) {
      formData.append('urlSamples', JSON.stringify(urlSamples));
      console.log('urlSamples stringified:', JSON.stringify(urlSamples));
    }
    
    // Upload to server - use preset name as folder
    const folderName = presetName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    console.log('Uploading to folder:', folderName);
    return this.http.post(`https://samplerserver.onrender.com/api/upload/${folderName}`, formData);
  }
}
