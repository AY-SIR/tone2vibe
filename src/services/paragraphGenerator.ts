
// Free paragraph generation service using open APIs
export const generateParagraph = async (topic: string): Promise<string> => {
  try {
    // Using a combination of Lorem Ipsum generators and simple templates
    const templates = [
      `In today's digital world, ${topic} has become increasingly important. This technology represents a significant advancement in how we approach modern challenges. Through innovative solutions and cutting-edge techniques, ${topic} continues to evolve and shape our understanding of what's possible.`,
      
      `The field of ${topic} offers numerous opportunities for growth and development. As we explore new methodologies and applications, it becomes clear that ${topic} will play a crucial role in future innovations. This comprehensive approach ensures sustainable progress and meaningful impact.`,
      
      `Understanding ${topic} requires careful consideration of various factors and perspectives. By examining different aspects and implementing best practices, we can maximize the potential benefits. The integration of ${topic} into existing systems creates new possibilities for enhancement and optimization.`,
      
      `Recent developments in ${topic} have opened doors to exciting possibilities. These advancements demonstrate the power of combining traditional approaches with modern techniques. As we continue to refine our understanding of ${topic}, we unlock new potential for practical applications.`,
      
      `The importance of ${topic} cannot be overstated in our current technological landscape. Through systematic research and practical implementation, ${topic} continues to drive innovation and create value. This multifaceted approach ensures comprehensive coverage of all relevant aspects.`
    ];
    
    // Select a random template
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Add some delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return randomTemplate;
  } catch (error) {
    console.error('Error generating paragraph:', error);
    throw new Error('Failed to generate paragraph. Please try again.');
  }
};

// Alternative service using JSONPlaceholder for more varied content
export const generateContentFromAPI = async (): Promise<string> => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data = await response.json();
    return `${data.title}. ${data.body}. This content demonstrates the capabilities of our voice cloning technology and shows how natural speech can be generated from any text input.`;
  } catch (error) {
    console.error('Error fetching content from API:', error);
    // Fallback to static content
    return "This is a sample paragraph generated for testing voice cloning capabilities. The technology allows you to convert any text into natural-sounding speech using your own voice characteristics. This demonstration shows the quality and accuracy of the voice synthesis process.";
  }
};
