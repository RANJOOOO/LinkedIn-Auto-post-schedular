const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// Comment out GPT configuration until API key is provided
/*
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);
*/

class GPTService {
    static async generateConnectionMessage(postContent, reactorInfo) {
        try {
            // Placeholder message generation
            const message = this.generatePlaceholderMessage(postContent, reactorInfo);
            return message;

            /* Comment out actual GPT implementation for now
            const prompt = `Generate a personalized LinkedIn connection request message based on the following information:
            
Post Content: ${postContent}
Reactor Name: ${reactorInfo.name}
Reactor Headline: ${reactorInfo.caption || 'Not provided'}

The message should:
1. Be professional and engaging
2. Reference the post content they reacted to
3. Be concise (max 300 characters)
4. Show genuine interest in connecting
5. Not be overly salesy or promotional

Generate the message:`;

            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                max_tokens: 150,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            return response.data.choices[0].text.trim();
            */
        } catch (error) {
            console.error('Error generating message:', error);
            throw error;
        }
    }

    static generatePlaceholderMessage(postContent, reactorInfo) {
        // Extract relevant information
        const { name, caption } = reactorInfo;
        
        // Create a basic personalized message
        let message = `Hi ${name.split(' ')[0]}, `;
        
        // Add content based on available information
        if (postContent) {
            message += `I noticed your reaction to my post about "${postContent.substring(0, 50)}${postContent.length > 50 ? '...' : ''}". `;
        }
        
        if (caption) {
            message += `I see you're ${caption}. `;
        }
        
        // Add a generic connection request
        message += "I'd love to connect and learn more about your experience. Would you be open to connecting?";
        
        return message;
    }
}

module.exports = GPTService; 