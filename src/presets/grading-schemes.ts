/**
 * Grading Scheme Presets
 * Note: All presets are APPROXIMATIONS.
 * Disclaimer notice: "Check your university's official regulations and adjust credit thresholds, pass marks, and grade scales as needed."
 */

import { GradingSchemeData } from '../types';

export interface GradingSchemePreset {
  id: string;
  name: string;
  description: string;
  is_preset: boolean;
  data: GradingSchemeData;
}

export const PRESET_DISCLAIMER_NOTICE =
  "Preset approximation: Check your university's official regulations and adjust credit thresholds, pass marks, and grade scales as needed.";

export const UGC_10_POINT_SCHEME: GradingSchemePreset = {
  id: 'preset-ugc-10-point',
  name: 'UGC 10-Point Scale (CBCS)',
  description: 'Standard UGC Choice-Based Credit System 10-point scale adopted across most Central & State universities.',
  is_preset: true,
  data: {
    type: 'point_scale',
    pass_mark: 40,
    max_point: 10,
    scale: [
      { letter: 'O', points: 10, min_percentage: 90, description: 'Outstanding' },
      { letter: 'A+', points: 9, min_percentage: 80, description: 'Excellent' },
      { letter: 'A', points: 8, min_percentage: 70, description: 'Very Good' },
      { letter: 'B+', points: 7, min_percentage: 60, description: 'Good' },
      { letter: 'B', points: 6, min_percentage: 55, description: 'Above Average' },
      { letter: 'C', points: 5, min_percentage: 50, description: 'Average' },
      { letter: 'P', points: 4, min_percentage: 40, description: 'Pass' },
      { letter: 'F', points: 0, min_percentage: 0, description: 'Fail' },
      { letter: 'Ab', points: 0, min_percentage: 0, description: 'Absent' },
    ],
    cgpa_to_percentage: {
      rule_type: 'multiplier',
      multiplier: 9.5, // Standard CBSE/AICTE/UGC conversion formula: Percentage = CGPA * 9.5
    },
    rounding: {
      precision: 2,
      mode: 'round',
    },
    notes: PRESET_DISCLAIMER_NOTICE,
  },
};

export const AICTE_10_POINT_SCHEME: GradingSchemePreset = {
  id: 'preset-aicte-10-point',
  name: 'AICTE Recommended 10-Point Scale',
  description: 'AICTE recommended engineering grading model with linear multiplier conversion.',
  is_preset: true,
  data: {
    type: 'point_scale',
    pass_mark: 40,
    max_point: 10,
    scale: [
      { letter: 'A+', points: 10, min_percentage: 90, description: 'Outstanding' },
      { letter: 'A', points: 9, min_percentage: 80, description: 'Excellent' },
      { letter: 'B+', points: 8, min_percentage: 70, description: 'Very Good' },
      { letter: 'B', points: 7, min_percentage: 60, description: 'Good' },
      { letter: 'C+', points: 6, min_percentage: 50, description: 'Fair' },
      { letter: 'C', points: 5, min_percentage: 45, description: 'Average' },
      { letter: 'D', points: 4, min_percentage: 40, description: 'Marginal Pass' },
      { letter: 'F', points: 0, min_percentage: 0, description: 'Fail / Arrear' },
    ],
    cgpa_to_percentage: {
      rule_type: 'multiplier',
      multiplier: 9.5,
    },
    rounding: {
      precision: 2,
      mode: 'round',
    },
    notes: PRESET_DISCLAIMER_NOTICE,
  },
};

export const PERCENTAGE_DIVISION_SCHEME: GradingSchemePreset = {
  id: 'preset-percentage-division',
  name: 'Percentage / Division Scheme (Annual / Traditional)',
  description: 'Used by annual programs, medical (MBBS), law, and traditional degree courses.',
  is_preset: true,
  data: {
    type: 'division',
    pass_mark: 50, // Standard pass mark for MBBS and professional division programs
    max_point: 100,
    scale: [],
    division_thresholds: [
      { name: 'First Class with Distinction', min_percentage: 75 },
      { name: 'First Class', min_percentage: 60 },
      { name: 'Second Class', min_percentage: 50 },
      { name: 'Pass Class', min_percentage: 40 },
    ],
    cgpa_to_percentage: {
      rule_type: 'multiplier',
      multiplier: 1.0, // Percentage is direct
    },
    rounding: {
      precision: 2,
      mode: 'round',
    },
    notes: PRESET_DISCLAIMER_NOTICE,
  },
};

export const US_4_POINT_SCHEME: GradingSchemePreset = {
  id: 'preset-us-4-point',
  name: 'Standard 4.0 Point Scale',
  description: 'Standard 4.0 GPA scale used internationally and by select private institutes.',
  is_preset: true,
  data: {
    type: 'point_scale',
    pass_mark: 60,
    max_point: 4,
    scale: [
      { letter: 'A', points: 4.0, min_percentage: 93, description: 'Excellent' },
      { letter: 'A-', points: 3.7, min_percentage: 90, description: 'Superior' },
      { letter: 'B+', points: 3.3, min_percentage: 87, description: 'Very Good' },
      { letter: 'B', points: 3.0, min_percentage: 83, description: 'Good' },
      { letter: 'B-', points: 2.7, min_percentage: 80, description: 'Above Average' },
      { letter: 'C+', points: 2.3, min_percentage: 77, description: 'Average' },
      { letter: 'C', points: 2.0, min_percentage: 73, description: 'Satisfactory' },
      { letter: 'C-', points: 1.7, min_percentage: 70, description: 'Minimal Pass' },
      { letter: 'D+', points: 1.3, min_percentage: 67, description: 'Poor' },
      { letter: 'D', points: 1.0, min_percentage: 60, description: 'Lowest Passing' },
      { letter: 'F', points: 0.0, min_percentage: 0, description: 'Failure' },
    ],
    cgpa_to_percentage: {
      rule_type: 'multiplier',
      multiplier: 25.0, // (4.0 * 25 = 100%)
    },
    rounding: {
      precision: 2,
      mode: 'round',
    },
    notes: PRESET_DISCLAIMER_NOTICE,
  },
};

export const CUSTOM_TEMPLATE_SCHEME: GradingSchemePreset = {
  id: 'preset-custom-template',
  name: 'Custom Grading Scheme Template',
  description: 'A customizable starter template to configure your exact university grading system.',
  is_preset: false,
  data: {
    type: 'point_scale',
    pass_mark: 40,
    max_point: 10,
    scale: [
      { letter: 'A', points: 10, min_percentage: 80, description: 'Grade A' },
      { letter: 'B', points: 8, min_percentage: 60, description: 'Grade B' },
      { letter: 'C', points: 6, min_percentage: 40, description: 'Grade C' },
      { letter: 'F', points: 0, min_percentage: 0, description: 'Fail' },
    ],
    cgpa_to_percentage: {
      rule_type: 'multiplier',
      multiplier: 10.0,
    },
    rounding: {
      precision: 2,
      mode: 'round',
    },
    notes: PRESET_DISCLAIMER_NOTICE,
  },
};

export const ALL_GRADING_PRESETS: GradingSchemePreset[] = [
  UGC_10_POINT_SCHEME,
  AICTE_10_POINT_SCHEME,
  PERCENTAGE_DIVISION_SCHEME,
  US_4_POINT_SCHEME,
  CUSTOM_TEMPLATE_SCHEME,
];

