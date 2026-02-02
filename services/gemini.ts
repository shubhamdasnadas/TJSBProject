import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const categorizeHardware = async (name: string, notes: string): Promise<{ manufacturer: string; category: string; model_guess: string }> => {
  try {
    if (!apiKey) return { manufacturer: '', category: '', model_guess: '' };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this hardware item name: "${name}" and notes: "${notes}". Suggest the Manufacturer, Category (e.g., Laptop, Monitor, Furniture, Peripheral), and a guess at the Model.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            manufacturer: { type: Type.STRING },
            category: { type: Type.STRING },
            model_guess: { type: Type.STRING },
          }
        }
      }
    });

    const text = response.text;
    if (!text) return { manufacturer: '', category: '', model_guess: '' };
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return { manufacturer: '', category: '', model_guess: '' };
  }
};

export const analyzeSecurity = async (passwords: {serviceName: string, username: string}[]): Promise<string> => {
  try {
    if (!apiKey) return "API Key missing. Cannot perform security analysis.";
    
    const listStr = passwords.map(p => `${p.serviceName} (${p.username})`).join(', ');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Review this list of services stored in a password manager: ${listStr}. Provide a brief, 2-sentence security recommendation or risk assessment regarding the mix of services (e.g., if many critical infrastructure services are listed). Do not mention specific usernames.`,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error(error);
    return "Failed to analyze security.";
  }
}
