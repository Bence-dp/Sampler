export interface Sample {
    url: string;
    name: string;
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
