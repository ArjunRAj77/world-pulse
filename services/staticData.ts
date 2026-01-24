
export type OverlayType = 'NONE' | 'NUCLEAR' | 'SPACE' | 'NATO';

export interface OverlayConfig {
    id: OverlayType;
    label: string;
    mapPath: string; // SVG path data (assuming 24x24 viewBox)
    color: string;
    description: string;
    countries: string[];
}

export const STATIC_OVERLAYS: Record<OverlayType, OverlayConfig> = {
    NONE: {
        id: 'NONE',
        label: 'None',
        mapPath: '',
        color: 'transparent',
        description: '',
        countries: []
    },
    NUCLEAR: {
        id: 'NUCLEAR',
        label: 'Nuclear State',
        // Radiation / Trefoil Symbol
        mapPath: 'M12 2L9.2 7.6h5.6L12 2zm0 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5.8-2.2L15.4 12c.5.6.8 1.3.8 2.1 0 .6-.2 1.2-.5 1.7l4.1 2.4c1.6-2.8 1.7-6.3-2-8.4zM6.2 9.8c-3.7 2.1-3.6 5.6-2 8.4l4.1-2.4c-.3-.5-.5-1.1-.5-1.7 0-.8.3-1.5.8-2.1L6.2 9.8z',
        color: '#f59e0b', // Amber 500
        description: 'Countries possessing nuclear weapons',
        countries: [
            "United States", "Russia", "China", "United Kingdom", "France", 
            "India", "Pakistan", "Israel", "North Korea"
        ]
    },
    SPACE: {
        id: 'SPACE',
        label: 'Space Port',
        // Rocket Symbol
        mapPath: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 2l5.6 5.6M15 9l-5.6 5.6',
        color: '#38bdf8', // Sky 400
        description: 'Nations with orbital launch capability',
        countries: [
            "United States", "Russia", "China", "France", "Japan", 
            "India", "Israel", "Iran", "North Korea", "South Korea", "United Kingdom"
        ]
    },
    NATO: {
        id: 'NATO',
        label: 'NATO',
        // Shield Icon
        mapPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        color: '#3b82f6', // Blue 500
        description: 'North Atlantic Treaty Organization members',
        countries: [
            "United States", "United Kingdom", "France", "Germany", "Italy", "Canada", 
            "Turkey", "Poland", "Spain", "Netherlands", "Belgium", "Norway", "Denmark", 
            "Portugal", "Greece", "Czech Republic", "Hungary", "Romania", "Bulgaria", 
            "Slovakia", "Slovenia", "Croatia", "Albania", "Montenegro", "North Macedonia", 
            "Iceland", "Estonia", "Latvia", "Lithuania", "Finland", "Sweden"
        ]
    }
};
