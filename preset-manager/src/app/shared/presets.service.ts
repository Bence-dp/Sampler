import { Injectable } from '@angular/core';
import { Observable, of } from "rxjs";
import { Preset } from '../presets/preset.model';
import { LoggingService } from './logging.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})

export class PresetsService {
  backendURL = 'http://localhost:3000/api/presets';

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
}
