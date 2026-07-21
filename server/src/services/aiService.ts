import natural from 'natural';
// @ts-ignore
import MLRegression from 'ml-regression';

// ─── 1. AI Message Triage (NLP) ──────────────────────────────────────────────

const classifier = new natural.BayesClassifier();
let isTrained = false;

function trainClassifier() {
  // Normal/Standard inquiries
  classifier.addDocument('When is my next appointment?', 'NORMAL');
  classifier.addDocument('How much water should I drink?', 'NORMAL');
  classifier.addDocument('Can I eat solid food now?', 'NORMAL');
  classifier.addDocument('I am feeling okay today.', 'NORMAL');
  classifier.addDocument('Thank you for the update.', 'NORMAL');
  classifier.addDocument('My pain is manageable with medication.', 'NORMAL');
  classifier.addDocument('Just checking in.', 'NORMAL');
  classifier.addDocument('I feel a bit tired but okay.', 'NORMAL');

  // Urgent/Critical inquiries
  classifier.addDocument('I am in severe pain and it is not stopping.', 'URGENT');
  classifier.addDocument('My wound is bleeding heavily.', 'URGENT');
  classifier.addDocument('I cannot breathe properly, shortness of breath.', 'URGENT');
  classifier.addDocument('I have a very high fever and chills.', 'URGENT');
  classifier.addDocument('There is green pus coming out of my incision.', 'URGENT');
  classifier.addDocument('I feel extremely dizzy and might pass out.', 'URGENT');
  classifier.addDocument('My leg is very swollen and red.', 'URGENT');
  classifier.addDocument('The pain medication is not working at all.', 'URGENT');
  classifier.addDocument('Help, I think something is wrong with my heart.', 'URGENT');

  classifier.train();
  isTrained = true;
  console.log('🤖 Local AI Message Classifier trained successfully.');
}

// Train asynchronously on startup
trainClassifier();

export interface MessageAnalysis {
  intent: 'NORMAL' | 'URGENT';
  sentimentScore: number;
}

export function analyzeMessage(content: string): MessageAnalysis {
  if (!isTrained) trainClassifier();

  const intent = classifier.classify(content) as 'NORMAL' | 'URGENT';

  // Sentiment Analysis using AFINN vocabulary
  const Analyzer = natural.SentimentAnalyzer;
  const stemmer = natural.PorterStemmer;
  const analyzer = new Analyzer('English', stemmer, 'afinn');
  const tokenizer = new natural.WordTokenizer();

  const tokens = tokenizer.tokenize(content) || [];
  const sentimentScore = analyzer.getSentiment(tokens);

  // If intent is URGENT, but sentiment is suspiciously positive, we trust the intent more due to keywords,
  // but let's override intent to URGENT if sentiment is extremely negative (<= -2) as a fallback safety net.
  let finalIntent = intent;
  if (sentimentScore <= -2) {
    finalIntent = 'URGENT';
  }

  return {
    intent: finalIntent,
    sentimentScore,
  };
}

// ─── 2. AI Recovery Predictor (Machine Learning) ──────────────────────────────

export interface RecoveryTrendData {
  day: number;
  painLevel: number;
}

export interface AIRecoveryInsight {
  status: 'Improving' | 'Stable' | 'Degrading' | 'Insufficient Data';
  message: string;
  trendSlope: number | null;
}

export function predictRecoveryTrend(checkIns: RecoveryTrendData[]): AIRecoveryInsight {
  if (checkIns.length < 3) {
    return {
      status: 'Insufficient Data',
      message: 'AI needs at least 3 days of check-ins to predict your recovery trend.',
      trendSlope: null,
    };
  }

  // Sort chronologically by day
  const sorted = [...checkIns].sort((a, b) => a.day - b.day);
  const x = sorted.map(c => c.day);
  const y = sorted.map(c => c.painLevel);

  // Simple Linear Regression: y = m*x + b
  const { SimpleLinearRegression } = MLRegression;
  const regression = new SimpleLinearRegression(x, y);
  
  // The slope (m) indicates the trend of pain over time.
  // Negative slope = Pain is decreasing (Improving)
  // Positive slope = Pain is increasing (Degrading)
  const slope = regression.slope;

  if (slope <= -0.5) {
    return {
      status: 'Improving',
      message: `AI predicts a strong recovery trajectory. Your pain levels are steadily decreasing (-${Math.abs(slope).toFixed(1)} pts/day).`,
      trendSlope: slope,
    };
  } else if (slope >= 0.5) {
    return {
      status: 'Degrading',
      message: `AI detected a worsening trend in your pain levels (+${slope.toFixed(1)} pts/day). Please consult your care team.`,
      trendSlope: slope,
    };
  } else {
    return {
      status: 'Stable',
      message: 'AI confirms your recovery is stable. Your pain levels are consistent with expected healing patterns.',
      trendSlope: slope,
    };
  }
}
