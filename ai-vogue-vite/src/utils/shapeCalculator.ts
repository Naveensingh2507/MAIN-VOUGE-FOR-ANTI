// Body shape calculator — placeholder algorithm.
// Real classification will be refined; this gives sensible buckets from ratios.
// NOTE: This is a placeholder seam per AI Vogue blueprint Section 4.5.
// It may later be replaced by a real classification model or photo-based detection.
export interface Measurements {
  shoulders: number;
  waist: number;
  legs: number;
}

export function calculateShape(m: Measurements): string {
  const { shoulders, waist, legs } = m;
  if (!shoulders || !waist || !legs) return "Not yet calculated";
  
  // Adjusted body shape logic based on shoulder width vs waist circumference
  // UI Sliders -> Shoulders: 30-60cm, Waist: 50-130cm
  const ratio = shoulders / waist;
  
  if (ratio >= 0.65) return "Inverted Triangle";
  if (ratio >= 0.55 && ratio < 0.65) return "Rectangle";
  if (ratio >= 0.45 && ratio < 0.55) return "Trapezoid";
  return "Triangle (Pear)";
}

export function inferBuildType(m: Measurements): string {
  if (!m.shoulders) return "Unspecified";
  
  // A simple build type inference
  if (m.shoulders >= 50) return "Heavy";
  if (m.shoulders >= 45) return "Athletic";
  if (m.shoulders >= 40) return "Lean";
  return "Skinny";
}