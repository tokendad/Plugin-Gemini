import { GoogleGenAI, Type, Schema } from "@google/genai";
import { D56Item } from "../types";

// Helper to convert file to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const d56Schema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "The specific name of the Department 56 item (e.g., 'Stone Cottage', 'Main Street Station').",
    },
    series: {
      type: Type.STRING,
      description: "The village or series the item belongs to (e.g., 'Original Snow Village', 'Dickens\' Village', 'North Pole Series').",
    },
    yearIntroduced: {
      type: Type.INTEGER,
      description: "The year the item was released.",
      nullable: true,
    },
    yearRetired: {
      type: Type.INTEGER,
      description: "The year the item was retired.",
      nullable: true,
    },
    estimatedCondition: {
      type: Type.STRING,
      description: "Assessment of condition based on visual evidence (e.g., 'Mint in Box', 'Good - Missing Flag', 'Chipped').",
    },
    estimatedValueRange: {
      type: Type.STRING,
      description: "Estimated market value range in USD (e.g., '$40 - $60').",
    },
    description: {
      type: Type.STRING,
      description: "A short physical description of the item for inventory purposes.",
    },
    isDepartment56: {
      type: Type.BOOLEAN,
      description: "True if the item is identified as a Department 56 product, False otherwise.",
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 100 regarding the identification.",
    },
  },
  required: ["name", "series", "description", "isDepartment56", "estimatedCondition"],
};

export const identifyItem = async (base64Data: string, mimeType: string): Promise<D56Item> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `You are an expert appraiser specializing in Department 56 collectibles. 
            Analyze the provided image. Identify the item specifically. 
            Look for distinctive architectural features, packaging, or bottom stamps common to Dept 56.
            If the item is in a box, use the text on the box to confirm details.
            Return the data strictly in JSON format matching the schema provided.`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: d56Schema,
        systemInstruction: "You are a specialized inventory assistant for 'NesVentory'. Your sole purpose is to identify Department 56 village pieces and accessories.",
      },
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini.");
    }

    const data = JSON.parse(response.text) as D56Item;
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export interface MarketDetails {
  summary: string;
  sources: { title: string; uri: string }[];
}

export const fetchMarketDetails = async (itemName: string, series: string): Promise<MarketDetails> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Use Google Search grounding to find live data
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for the Department 56 item "${itemName}" from the "${series}" series. 
      Provide a concise 2-3 sentence summary covering:
      1. Its current availability on secondary markets (eBay, Replacements, etc).
      2. Any interesting historical fact or rarity note.
      3. Confirmation of its retirement status if found.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (!response.text) {
      throw new Error("No market data found.");
    }

    // Extract sources from grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title)
      .map((web: any) => ({ title: web.title, uri: web.uri }));

    return {
      summary: response.text,
      sources: sources
    };

  } catch (error) {
    console.error("Market Data Search Error:", error);
    throw error;
  }
};