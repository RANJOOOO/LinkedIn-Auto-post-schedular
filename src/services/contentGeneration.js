// Base interface for content generation
class ContentGenerationService {
  async generateTitles(topic) {
    throw new Error('Method not implemented');
  }

  async generateOutline(title, type) {
    throw new Error('Method not implemented');
  }

  async generateKeyPoints(title, type) {
    throw new Error('Method not implemented');
  }

  async generateStats(topic) {
    throw new Error('Method not implemented');
  }
}

// Basic implementation without AI
class BasicContentGenerationService extends ContentGenerationService {
  constructor() {
    super();
    this.titleTemplates = [
      "How to Master {topic} in 2024",
      "10 Proven Strategies for {topic}",
      "The Ultimate Guide to {topic}",
      "{topic}: A Complete Guide",
      "Top Tips for {topic} Success"
    ];

    this.outlineTemplates = {
      'how-to': [
        'Introduction',
        'Why This Matters',
        'Step-by-Step Guide',
        'Common Mistakes to Avoid',
        'Tips for Success',
        'Conclusion'
      ],
      'list': [
        'Introduction',
        'Why These Points Matter',
        'The List',
        'Implementation Tips',
        'Conclusion'
      ]
    };

    this.keyPointsTemplates = {
      'how-to': [
        'Define the problem clearly',
        'Break down the solution into steps',
        'Provide practical examples',
        'Include expert tips',
        'Address common challenges'
      ],
      'list': [
        'Research-backed points',
        'Real-world examples',
        'Actionable insights',
        'Industry statistics',
        'Expert opinions'
      ]
    };
  }

  async generateTitles(topic) {
    return this.titleTemplates.map(template => ({
      title: template.replace('{topic}', topic),
      type: this.getTitleType(template),
      engagement: 'medium' // Placeholder for AI prediction
    }));
  }

  async generateOutline(title, type) {
    return this.outlineTemplates[type] || this.outlineTemplates['how-to'];
  }

  async generateKeyPoints(title, type) {
    return this.keyPointsTemplates[type] || this.keyPointsTemplates['how-to'];
  }

  async generateStats(topic) {
    // Placeholder stats
    return [
      '85% of professionals report increased engagement',
      'Companies see 3x growth in reach',
      'Average 45% higher click-through rates'
    ];
  }

  getTitleType(template) {
    if (template.includes('How to')) return 'how-to';
    if (template.includes('10') || template.includes('Top')) return 'list';
    return 'guide';
  }
}

// Future AI implementation
class AIContentGenerationService extends ContentGenerationService {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
  }

  async generateTitles(topic) {
    // This will be implemented when we have the API key
    // Example structure:
    // const response = await fetch('AI_API_ENDPOINT', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ topic })
    // });
    // return response.json();
    throw new Error('AI implementation not available');
  }

  async generateOutline(title, type) {
    // AI implementation
    throw new Error('AI implementation not available');
  }

  async generateKeyPoints(title, type) {
    // AI implementation
    throw new Error('AI implementation not available');
  }

  async generateStats(topic) {
    // AI implementation
    throw new Error('AI implementation not available');
  }
}

// Factory to create the appropriate service
export const createContentGenerationService = (useAI = false, apiKey = null) => {
  if (useAI && apiKey) {
    return new AIContentGenerationService(apiKey);
  }
  return new BasicContentGenerationService();
};

export default createContentGenerationService;
