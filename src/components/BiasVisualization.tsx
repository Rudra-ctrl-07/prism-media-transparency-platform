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
  // Basic info (from article)
  articleId: string;
  title: string;
  source: string;
  sourceCredibility: number; // 0-1
  summary: string;
  // Deep verification details (only present if deep=true)
  debate?: {
    progressive: string;
    conservative: string;
    omissionFocused: string;
    moderatorVerdict: string;
    confidence: number; // 0-1
  };
  verificationTimestamp: number; // unix timestamp
  verificationType: 'basic' | 'deep';
}

interface BiasVisualizationProps {
  verification: VerificationResult | null;
  showExplanation?: boolean;
  className?: string;
}

export const BiasVisualization = ({
  verification,
  showExplanation = true,
  className = ''
}: BiasVisualizationProps) => {
  const [dimensions, setDimensions] = useState<BiasDimensions>({
    factual: 0.5,
    emotional: 0.5,
    liberal: 0.5,
    conservative: 0.5,
    optimistic: 0.5,
    pessimistic: 0.5,
    individual: 0.5,
    systemic: 0.5
  });

  const [chartType, setChartType] = useState<'radar' | 'bar' | 'pie'>('radar');

  // Extract dimensions from verification debate text
  useEffect(() => {
    if (!verification?.debate) {
      // Set default/neutral values
      setDimensions({
        factual: 0.5,
        emotional: 0.5,
        liberal: 0.5,
        conservative: 0.5,
        optimistic: 0.5,
        pessimistic: 0.5,
        individual: 0.5,
        systemic: 0.5
      });
      return;
    }

    // Analyze the debate text to determine biases
    const { progressive, conservative, omissionFocused, moderatorVerdict } = verification.debate;
    const textToAnalyze = `${progressive} ${conservative} ${omissionFocused} ${moderatorVerdict}`.toLowerCase();

    // Simple keyword-based analysis (in a real app, this would use NLP)
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

    setDimensions({
      factual: Math.max(0, Math.min(1, factualScore)),
      emotional: Math.max(0, Math.min(1, emotionalScore)),
      liberal: Math.max(0, Math.min(1, liberalScore)),
      conservative: Math.max(0, Math.min(1, conservativeScore)),
      optimistic: Math.max(0, Math.min(1, optimisticScore)),
      pessimistic: Math.max(0, Math.min(1, pessimisticScore)),
      individual: Math.max(0, Math.min(1, individualScore)),
      systemic: Math.max(0, Math.min(1, systemicScore))
    });
  }, [verification]);

  // Helper function to calculate keyword-based score
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

  const labels = [
    { label: 'Factual', value: dimensions.factual, key: 'factual' },
    { label: 'Emotional', value: dimensions.emotional, key: 'emotional' },
    { label: 'Liberal', value: dimensions.liberal, key: 'liberal' },
    { label: 'Conservative', value: dimensions.conservative, key: 'conservative' },
    { label: 'Optimistic', value: dimensions.optimistic, key: 'optimistic' },
    { label: 'Pessimistic', value: dimensions.pessimistic, key: 'pessimistic' },
    { label: 'Individual', value: dimensions.individual, key: 'individual' },
    { label: 'Systemic', value: dimensions.systemic, key: 'systemic' }
  ];

  const getColor = (key: string) => {
    const colors: Record<string, string> = {
      factual: '#3b82f6', // blue
      emotional: '#ef4444', // red
      liberal: '#10b981', // emerald
      conservative: '#f59e0b', // amber
      optimistic: '#8b5cf6', // violet
      pessimistic: '#6b7280', // gray
      individual: '#ec4899', // pink
      systemic: '#84cc16' // lime
    };
    return colors[key] || '#6b7280';
  };

  if (!verification && showExplanation) {
    return (
      <div className={className}>
        <p className="text-body-sm text-on-surface-variant">
          Click "View Analysis" on an article to see detailed bias visualization.
        </p>
      </div>
    );
  }

  if (!verification) {
    return (
      <div className={`${className} min-h-[200px] flex items-center justify-center text-on-surface-variant/60`}>
        Loading visualization...
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center space-x-3">
        <span className="text-label-sm font-label-sm">Visualization:</span>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as 'radar' | 'bar' | 'pie')}
          className="border border-silver-grey rounded px-2 py-1 text-sm bg-surface"
        >
          <option value="radar">Radar Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="pie">Pie Chart</option>
        </select>
      </div>
      <div className="relative h-[300px]">
        {chartType === 'radar' && (
          <RadarChart dimensions={dimensions} labels={labels} getColor={getColor} />
        )}
        {chartType === 'bar' && (
          <BarChart dimensions={dimensions} labels={labels} getColor={getColor} />
        )}
        {chartType === 'pie' && (
          <PieChart dimensions={dimensions} labels={labels} getColor={getColor} />
        )}
      </div>
    </div>
  );
};

// Radar Chart Component
const RadarChart = ({ dimensions, labels, getColor }: { dimensions: BiasDimensions; labels: Array<{ label: string; value: number; key: string }>; getColor: (key: string) => string }) => {
  const width = 300;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  const points = labels.map((label, index) => {
    const angle = (Math.PI * 2 * (index / labels.length)) - Math.PI / 2; // Start at top
    const x = centerX + radius * label.value * Math.cos(angle);
    const y = centerY + radius * label.value * Math.sin(angle);
    return { x, y };
  });

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
      {/* Polygon */}
      <polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill={rgba(59, 130, 246, 0.2)}
        stroke={rgba(59, 130, 246, 0.8)}
        strokeWidth="2"
      />
      {/* Points */}
      {points.map((p, index) => (
        <g key={`point-${index}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill={getColor(labels[index].key)}
            stroke="white"
            strokeWidth="2"
          />
        </g>
      ))}
    </svg>
  );
};

// Bar Chart Component
const BarChart = ({ dimensions, labels, getColor }: { dimensions: BiasDimensions; labels: Array<{ label: string; value: number; key: string }>; getColor: (key: string) => string }) => {
  const width = 300;
  const height = 250;
  const padding = { top: 20, right: 30, bottom: 30, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <svg width={width} height={height} className="block">
      {/* Bars */}
      {labels.map((label, index) => {
        const barHeight = (label.value * chartHeight);
        const x = padding.left + index * (chartWidth / labels.length);
        const y = height - padding.bottom - barHeight;
        const barWidth = chartWidth / labels.length * 0.6;
        return (
          <g key={`bar-${index}`}>
            <rect
              x={x + (chartWidth / labels.length - barWidth) / 2}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={getColor(label.key)}
              rx="4"
            />
            <text
              x={x + (chartWidth / labels.length) / 2}
              y={height - padding.bottom + 20}
              fill={rgba(107, 114, 128, 0.8)}
              fontSize="11"
              textAnchor="middle"
            >
              {label.label}
            </text>
            <text
              x={x + (chartWidth / labels.length) / 2}
              y={y - 8}
              fill={rgba(107, 114, 128, 0.9)}
              fontSize="10"
              textAnchor="middle"
            >
              {(label.value * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}
      {/* Axis line */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke={rgba(107, 114, 128, 0.2)}
        strokeWidth="1"
      />
    </svg>
  );
};

// Pie Chart Component
const PieChart = ({ dimensions, labels, getColor }: { dimensions: BiasDimensions; labels: Array<{ label: string; value: number; key: string }>; getColor: (key: string) => string }) => {
  const width = 300;
  const height = 300;
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;

  // Normalize values to sum to 100 for pie chart
  const total = labels.reduce((sum, label) => sum + label.value, 0);
  const normalized = labels.map(label => ({
    ...label,
    value: total > 0 ? (label.value / total) : 0
  }));

  let cumulativeAngle = -90; // Start at top
  const slices = normalized.map((label, index) => {
    const angle = (label.value * 360);
    const radianStart = (cumulativeAngle * Math.PI) / 180;
    const radianEnd = ((cumulativeAngle + angle) * Math.PI) / 180;

    const x1 = centerX + radius * 0.95 * Math.cos(radianStart);
    const y1 = centerY + radius * 0.95 * Math.sin(radianStart);
    const x2 = centerX + radius * 0.95 * Math.cos(radianEnd);
    const y2 = centerY + radius * 0.95 * Math.sin(radianEnd);

    const largeArc = angle > 180 ? 1 : 0;
    const path = [
      `M ${centerX},${centerY}`,
      `L ${x1},${y1}`,
      `A ${radius * 0.95},${radius * 0.95} 0 ${largeArc} 1 ${x2},${y2}`,
      'Z'
    ].join(' ');

    const midAngle = cumulativeAngle + angle / 2;
    const labelX = centerX + (radius * 0.6) * Math.cos((midAngle * Math.PI) / 180);
    const labelY = centerY + (radius * 0.6) * Math.sin((midAngle * Math.PI) / 180);

    cumulativeAngle += angle;

    return {
      path,
      label: label.label,
      value: label.value,
      color: getColor(label.key),
      midAngle,
      labelX,
      labelY
    };
  });

  return (
    <svg width={width} height={height} className="block">
      {slices.map((slice, index) => (
        <g key={`slice-${index}`}>
          <path
            d={slice.path}
            fill={slice.color}
          />
          <text
            x={slice.labelX}
            y={slice.labelY}
            fill="#ffffff"
            fontSize="11"
            textAnchor="middle"
          >
            {`${slice.label}: ${(slice.value * 100).toFixed(0)}%`}
          </text>
        </g>
      ))}
      {/* Center circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.4}
        fill="#ffffff"
      />
      {/* Center label */}
      <text
        x={centerX}
        y={centerY + 4}
        fill={rgba(107, 114, 128, 0.8)}
        fontSize="12"
        textAnchor="middle"
        fontWeight="500"
      >
        Bias Profile
      </text>
    </svg>
  );
};

// Helper function to create rgba color string
import { rgba } from '../utils/color';