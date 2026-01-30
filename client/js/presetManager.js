// presetManager.js - Gestion des presets (ajout dynamique, rechargement, etc.)

export class PresetManager {
    constructor(options = {}) {
        this.apiBase = options.apiBase || 'http://localhost:3000';
        this.presetSelect = options.presetSelect;
        this.sampler = options.sampler;
        this.presets = [];
    }

    /**
     * Charge tous les presets depuis le serveur
     * @returns {Promise<Array>} Liste des presets
     */
    async fetchPresets() {
        try {
            const resp = await fetch(`${this.apiBase}/api/presets`);
            if (resp.ok) {
                this.presets = await resp.json();
                return this.presets;
            }
        } catch (err) {
            console.warn('Could not fetch presets', err);
        }
        return [];
    }

    /**
     * Met à jour le selecteur de presets dans le DOM
     */
    updatePresetSelect() {
        if (!this.presetSelect) return;
        
        // Sauvegarder la valeur actuellement sélectionnée
        const currentValue = this.presetSelect.value;
        
        // Vider le select (garder seulement l'option par défaut si elle existe)
        while (this.presetSelect.options.length > 1) {
            this.presetSelect.remove(1);
        }
        
        // Ajouter toutes les options
        this.presets.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.name || `Preset ${i+1}`;
            this.presetSelect.appendChild(opt);
        });
        
        // Restaurer la sélection si possible
        if (currentValue && this.presetSelect.querySelector(`option[value="${currentValue}"]`)) {
            this.presetSelect.value = currentValue;
        }
    }

    /**
     * Ajoute un nouveau preset dynamiquement (sans recharger la page)
     * @param {Object} preset - Le preset à ajouter
     * @param {boolean} selectIt - Si true, sélectionne automatiquement le nouveau preset
     */
    async addPresetDynamically(preset, selectIt = true) {
        if (!preset || !preset.name) {
            console.error('Invalid preset object', preset);
            return;
        }

        // Vérifier si le preset existe déjà
        const existingIndex = this.presets.findIndex(p => p.name === preset.name);
        
        if (existingIndex >= 0) {
            // Le preset existe déjà, le mettre à jour
            this.presets[existingIndex] = preset;
            console.log('Preset updated:', preset.name);
        } else {
            // Nouveau preset, l'ajouter à la liste
            this.presets.push(preset);
            console.log('New preset added:', preset.name);
        }

        // Mettre à jour le select
        this.updatePresetSelect();

        // Charger automatiquement le nouveau preset
        if (selectIt && this.sampler) {
            const index = this.presets.findIndex(p => p.name === preset.name);
            if (index >= 0) {
                // Désactiver temporairement l'event handler pour éviter une double exécution
                const oldHandler = this.presetSelect.onchange;
                this.presetSelect.onchange = null;
                this.presetSelect.value = index;
                this.presetSelect.onchange = oldHandler;
                
                // Charger le preset manuellement
                await this.loadPreset(index);
            }
        }
    }

    /**
     * Charge un preset par son index
     * @param {number} index - L'index du preset dans la liste
     */
    async loadPreset(index) {
        if (!this.sampler) {
            console.warn('No sampler instance available');
            return;
        }

        const preset = this.presets[index];
        if (!preset) {
            console.error('Preset not found at index', index);
            return;
        }

        let urls = [];
        if (preset.samples && preset.samples.length > 0) {
            urls = preset.samples.map(s => {
                // Check if URL is absolute (starts with http:// or https://)
                const isAbsoluteURL = s.url.startsWith('http://') || s.url.startsWith('https://');
                return {
                    url: isAbsoluteURL ? s.url : `${this.apiBase}/presets/${s.url}`,
                    name: s.name || s.url
                };
            });
        }

        await this.sampler.loadAndShow(urls);
    }

    /**
     * Initialise le gestionnaire de presets avec les données du serveur
     */
    async initialize() {
        await this.fetchPresets();
        this.updatePresetSelect();
        
        // Charger le premier preset par défaut
        if (this.presets.length > 0 && this.sampler) {
            await this.loadPreset(0);
        }
    }

    /**
     * Configure le handler pour le changement de preset
     */
    setupChangeHandler() {
        if (!this.presetSelect) return;
        
        this.presetSelect.onchange = async (evt) => {
            evt.preventDefault();
            const index = parseInt(evt.target.value);
            await this.loadPreset(index);
        };
    }
}
