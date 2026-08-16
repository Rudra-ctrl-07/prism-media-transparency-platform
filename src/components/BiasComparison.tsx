import { useEffect, useState } from 'react';

interface BiasDimensions {
  factual: number;      // 0-1 (more factual)
  emotional: number;    // 0-1 (more emotional)
  liberal: number;      // 0-1 (more liberal)
  conservative: number; // 0-1 (more conservative)
  optimistic: number;   // 0-1 (more optimistic)
  pessimistic: number;  // 0-1 (more pessimistic)
  individual: number;   // 0-1 (more individual focus)
  systemic: number;     // 0-1 (more systemic focus)
}

interface VerificationResult {
  articleId: string;
  title: string;
  source: string;
  sourceCredibility: number; // 0-1
  summary: string;
  debate?: {
    progressive: string;
    conservative: string;
    omissionFocused: string;
    moderatorVerdict: string;
    confidence: number; // 0-1
  };
  verificationTimestamp: number;
  verificationType: 'basic' | 'deep';
}

interface Dataset {
  label: string;
  dimensions: BiasDimensions;
  color: string;
}

interface BiasComparisonProps {
  verifications: VerificationResult[];
  showExplanation?: boolean;
  className?: string;
}

export const BiasComparison = ({
  verifications,
  showExplanation = true,
  className = ''
}: BiasComparisonProps) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  // Convert verifications to datasets with colors
  useEffect(() => {
    if (verifications.length === 0) {
      setDatasets([]);
      return;
    }

    const colorPalette = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // emerald
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#6b7280', // gray
      '#ec4899', // pink
      '#84cc16', // lime
      '#f97316', // orange
      '#06b6d4'  // cyan
    ];

    const newDatasets: Dataset[] = verifications.map((v, index) => ({
      label: `${v.source}: ${v.title.length > 20 ? v.title.substring(0, 20) + '...' : v.title}`,
      dimensions: {
        factual: 0.5,
        emotional: 0.5,
        liberal: 0.5,
        conservative: 0.5,
        optimistic: 0.5,
        pessimistic: 0.5,
        individual: 0.5,
        systemic: 0.5
      },
      color: colorPalette[index % colorPalette.length]
    }));

    // If we have debate data, compute dimensions
    const datasetsWithData = verifications.map((v, index) => {
      if (!v.debate) {
        return {
          label: `${v.source}: ${v.title.length > 20 ? v.title.substring(0, 20) + '...' : v.title}`,
          dimensions: {
            factual: 0.5,
            emotional: 0.5,
            liberal: 0.5,
            conservative: 0.5,
            optimistic: 0.5,
            pessimistic: 0.5,
            individual: 0.5,
            systemic: 0.5
          },
          color: colorPalette[index % colorPalette.length]
        };
      }

      // Analyze the debate text to determine biases (same logic as in BiasVisualization)
      const { progressive, conservative, omissionFocused, moderatorVerdict } = v.debate;
      const textToAnalyze = `${progressive} ${conservative} ${omissionFocused} ${moderatorVerdict}`.toLowerCase();

      const factualScore = calculateKeywordScore(textToAnalyze, [
        'fact', 'data', 'study', 'research', 'evidence', 'statistic', 'proof',
        'according to', 'shows', 'indicates', 'demonstrates'
      ]);

      const emotionalScore = calculateKeywordScore(textToAnalyze, [
        'feel', 'emotion', 'heart', 'soul', 'suffering', 'tragedy', 'joy',
        'happiness', 'pain', 'anguish', 'sympathy', 'empathy'
      ]);

      const liberalScore = calculateKeywordScore(textToAnalyze, [
        'progressive', 'liberal', 'equality', 'justice', 'rights', 'reform',
        'change', 'inclusive', 'diversity', 'tolerance', 'social'
      ]);

      const conservativeScore = calculateKeywordScore(textToAnalyze, [
        'conservative', 'tradition', 'heritage', 'order', 'stability', 'law',
        'obedience', 'patriotism', 'national', 'family', 'religion'
      ]);

      const optimisticScore = calculateKeywordScore(textToAnalyze, [
        'hope', 'opportunity', 'growth', 'improvement', 'better', 'future',
        'potential', 'possibility', 'advantage', 'benefit', 'solution'
      ]);

      const pessimisticScore = calculateKeywordScore(textToAnalyze, [
        'problem', 'issue', 'challenge', 'difficulty', 'obstacle', 'risk',
        'danger', 'threat', 'concern', 'worry', 'fear', 'crisis'
      ]);

      const individualScore = calculateKeywordScore(textToAnalyze, [
        'individual', 'person', 'self', 'personal', 'independence', 'freedom',
        'choice', 'autonomy', 'responsibility', 'accountability'
      ]);

      const systemicScore = calculateKeywordScore(textToAnalyze, [
        'system', 'structure', 'institution', 'policy', 'government', 'organization',
        'community', 'society', 'network', 'infrastructure', 'framework'
      ]);

      return {
        label: `${v.source}: ${v.title.length > 20 ? v.title.substring(0, 20) + '...' : v.title}`,
        dimensions: {
          factual: Math.max(0, Math.min(1, factualScore)),
          emotional: Math.max(0, Math.min(1, emotionalScore)),
          liberal: Math.max(0, Math.min(1, liberalScore)),
          conservative: Math.max(0, Math.min(1, conservativeScore)),
          optimistic: Math.max(0, Math.min(1, optimisticScore)),
          pessimistic: Math.max(0, Math.min(1, pessimisticScore)),
          individual: Math.max(0, Math.min(1, individualScore)),
          systemic: Math.max(0, Math.min(1, systemicScore))
        },
        color: colorPalette[index % colorPalette.length]
      };
    });

    setDatasets(datasetsWithData);
  }, [verifications]);

  // Helper function to calculate keyword-based score (same as in BiasVisualization)
  const calculateKeywordScore = (text: string, keywords: string[]): number => {
    let score = 0;
    const words = text.split(/\s+/);

    for (const word of words) {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      if (keywords.includes(cleanWord)) {
        score++;
      }
    }

    // Normalize to 0-1 range (assuming max 10 matches for simplicity)
    return Math.min(1, score / 10);
  };

  if (!showExplanation || (showExplanation && verifications.length === 0)) {
    return (
      <div className={className}>
        <p className="text-body-sm text-on-surface-variant">
          Select at least one article to compare bias profiles.
        </p>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className={`${className} min-h-[200px] flex items-center justify-center text-on-surface-variant/60`}>
        Loading comparison...
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="font-hankenGrotesk text-[12px] font-bold uppercase tracking-widest text-primary mb-2">
          Bias Comparison ({datasets.length} articles)
        </h3>
        <p className="text-body-xs text-on-surface-variant/60">
          Compare bias dimensions across multiple articles. Each polygon represents an article's bias profile.
        </p>
      </div>
      <div className="relative h-[400px]">
        <MultiRadarChart datasets={datasets} />
      </div>
    </div>
  );
};

// Multi Radar Chart Component
const MultiRadarChart = ({ datasets }: { datasets: Dataset[] }) => {
  const width = 400;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  const labels = [
    { label: 'Factual', key: 'factual' },
    { label: 'Emotional', key: 'emotional' },
    { label: 'Liberal', key: 'liberal' },
    { label: 'Conservative', key: 'conservative' },
    { label: 'Optimistic', key: 'optimistic' },
    { label: 'Pessimistic', key: 'pessimistic' },
    { label: 'Individual', key: 'individual' },
    { label: 'Systemic', key: 'systemic' }
  ];

  return (
    <svg width={width} height={height} className="block">
      {/* Grid lines and labels */}
      {[0.2, 0.4, 0.6, 0.8].map((level, i) => (
        <g key={`grid-${i}`}>
          <polygon
            points={labels.map((_, index) => {
              const angle = (Math.PI * 2 * (index / labels.length)) - Math.PI / 2;
              const x = centerX + radius * level * Math.cos(angle);
              const y = centerY + radius * level * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={rgba(107, 114, 128, 0.2)}
            strokeWidth={1}
          />
          <text
            x={centerX + radius * (level + 0.05) * Math.cos(-Math.PI / 2)}
            y={centerY + radius * (level + 0.05) * Math.sin(-Math.PI / 2) - 4}
            fill={rgba(107, 114, 128, 0.5)}
            fontSize="10"
            textAnchor="middle"
          >
            {(level * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {/* Axes */}
      {labels.map((label, index) => (
        <g key={`axis-${index}`}>
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + radius * Math.cos((Math.PI * 2 * (index / labels.length)) - Math.PI / 2)}
            y2={centerY + radius * Math.sin((Math.PI * 2 * (index / labels.length)) - Math.PI / 2)}
            stroke={rgba(107, 114, 128, 0.2)}
            strokeWidth="1"
          />
          <text
            x={centerX + (radius + 18) * Math.cos((Math.PI * 2 * (index / labels.length)) - Math.PI / 2)}
            y={centerY + (radius + 18) * Math.sin((Math.PI * 2 * (index / labels.length)) - Math.PI / 2) + 4}
            fill={rgba(107, 114, 128, 0.7)}
            fontSize="11"
            textAnchor="middle"
          >
            {label.label}
          </text>
        </g>
      ))}
      {/* Datasets */}
      {datasets.map((dataset, dsIndex) => {
        const points = labels.map((label, index) => {
          const angle = (Math.PI * 2 * (index / labels.length)) - Math.PI / 2;
          const value = dataset.dimensions[label.key as keyof BiasDimensions];
          const x = centerX + radius * value * Math.cos(angle);
          const y = centerY + radius * value * Math.sin(angle);
          return { x, y };
        });

        return (
          <g key={`dataset-${dsIndex}`}>
            <polygon
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill={dataset.color}
              fillOpacity="0.1"
              stroke={dataset.color}
              strokeWidth="2"
            />
            {/* Points */}
            {points.map((p, pointIndex) => (
              <g key={`point-${dsIndex}-${pointIndex}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill={dataset.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </g>
            ))}
          </g>
        );
      })}
      {/* Center point */}
      <circle
        cx={centerX}
        cy={centerY}
        r="4"
        fill="rgba(107, 114, 128, 0.5)"
      />
      {/* Legend */}
      <g transform={`translate(${width - 140}, 20)`}>
        {datasets.map((dataset, index) => (
          <g key={`legend-${index}`} transform={`translate(0, ${index * 20})`}>
            <circle cx="0" cy="0" r="6" fill={dataset.color} fillOpacity="0.2" />
            <text x="10" y="4" fill={rgba(107, 114, 128, 0.8)} fontSize="12">
              {dataset.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

// Helper function to create rgba color string.
// Accepts either a hex string + opacity, or 3 RGB integers + opacity.
import { rgba } from '../utils/color';