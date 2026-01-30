export interface Sample {
    url: string;
    name: string;
    file?: File;
    uploadMode?: 'url' | 'file';
}

export interface Preset {
    id?: string;
    slug?: string;
    updatedAt?: string;
    name: string;
    type: string;
    isFactoryPresets: boolean;
    samples: Sample[];
}
