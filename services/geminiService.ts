import { GoogleGenAI, Type, Schema } from "@google/genai";
import { D56Item, AlternativeItem } from "../types";

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
      description: "The specific name of the Department 56 item (e.g., 'Stone Cottage', 'Main Street Station', 'Santa\'s Workshop').",
    },
    series: {
      type: Type.STRING,
      description: "The specific village or sub-series (e.g., 'The Original Snow Village', 'Dickens\' Village Series', 'North Pole Series', 'Christmas in the City', 'Alpine Village', 'Halloween Snow Village').",
    },
    yearIntroduced: {
      type: Type.INTEGER,
      description: "The year the item was officially introduced by Department 56.",
      nullable: true,
    },
    yearRetired: {
      type: Type.INTEGER,
      description: "The year the item was retired.",
      nullable: true,
    },
    estimatedCondition: {
      type: Type.STRING,
      description: "Professional assessment of condition. Look for chips in the 'snow', missing flags/weather vanes, yellowing of white areas, or box wear. (e.g., 'Mint in Box', 'Excellent - No Chips', 'Fair - Missing Chimney cap').",
    },
    estimatedValueRange: {
      type: Type.STRING,
      description: "Estimated market value range in USD based on secondary market trends for this specific piece (e.g., '$45 - $65').",
    },
    description: {
      type: Type.STRING,
      description: "A detailed physical description including architectural style, materials (porcelain vs ceramic), and key features for inventory identification.",
    },
    isDepartment56: {
      type: Type.BOOLEAN,
      description: "STRICT: True ONLY if the item is a genuine Department 56 product. Set to False for Lemax, St. Nicholas Square, or generic items.",
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 100.",
    },
  },
  required: ["name", "series", "description", "isDepartment56", "estimatedCondition"],
};

export const identifyItem = async (base64Data: string, mimeType: string): Promise<D56Item> => {
  console.log("[GeminiService] Starting specialized Dept 56 identification...");
  
  if (!process.env.API_KEY) {
    console.error("[GeminiService] CRITICAL: API Key is missing in process.env");
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    console.log(`[GeminiService] Sending request to model 'gemini-2.5-flash' with mimeType: ${mimeType}`);
    
    const systemInstructionText = `
      You are the world's leading expert and archivist for Department 56 collectibles, acting as the engine for the 'NesVentory' system.
      
      YOUR EXPERTISE INCLUDES:
      1. **The Original Snow Village**: Glossy finish, ceramic, brighter colors.
      2. **Heritage Village Collection**: Matte finish porcelain. Includes:
         - Dickens' Village (Victorian England style)
         - New England Village (Colonial/coastal style)
         - Alpine Village (Bavarian/Swiss style)
         - Christmas in the City (Urban, cityscapes)
         - North Pole Series (Fantasy, Santa oriented)
         - Little Town of Bethlehem
      3. **Specialty Series**: Halloween, Disney, Grinch, Harry Potter.

      YOUR GOAL:
      Identify the item with high precision. Differentiate authentic Dept 56 from competitors like Lemax or St. Nicholas Square. 
      If it is NOT Department 56, flag it immediately.
    `;

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
            text: `Analyze this image for the inventory.
            
            1. **Identify**: What specific Department 56 piece is this? Use box text if available.
            2. **Series**: Classify it into the correct Village (e.g., Snow Village vs Heritage Village).
            3. **Condition Check**: Look closely for:
               - Chipped "snow" on roofs or bases.
               - Missing delicate parts (flags, birds, weathervanes).
               - Box condition (water damage, tears).
            4. **Validation**: Check for the Department 56 logo/bottom stamp.
            
            Return the data matching the JSON schema.`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: d56Schema,
        systemInstruction: systemInstructionText,
      },
    });

    console.log("[GeminiService] Response received.");
    if (!response.text) {
      console.error("[GeminiService] Error: No text in response.");
      throw new Error("No response text received from Gemini.");
    }

    const data = JSON.parse(response.text) as D56Item;
    console.log("[GeminiService] Data parsed successfully:", data.name);
    return data;

  } catch (error) {
    console.error("[GeminiService] API Error Details:", error);
    if (error instanceof Error) {
      console.error("[GeminiService] Stack:", error.stack);
    }
    throw error;
  }
};

export interface MarketDetails {
  summary: string;
  sources: { title: string; uri: string }[];
}

export const fetchMarketDetails = async (itemName: string, series: string): Promise<MarketDetails> => {
  console.log(`[GeminiService] Fetching market details for: ${itemName} (${series})`);
  
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
      2. Any interesting historical fact or rarity note (e.g. was it a limited edition?).
      3. Confirmation of its retirement status and year if found.`,
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
    console.error("[GeminiService] Market Search Error:", error);
    throw error;
  }
};

export const findAlternatives = async (base64Data: string, mimeType: string): Promise<AlternativeItem[]> => {
  console.log("[GeminiService] Searching for alternatives...");
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const alternativesSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          series: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Why this might be the correct item based on visual similarity." }
        },
        required: ["name", "series", "reason"]
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "The previous identification of this Department 56 item was rejected by the user. Search specifically for this item's visual match on the web. List the top 3 most likely correct Department 56 items it could be. Focus on finding the exact model name." }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: alternativesSchema
      }
    });

    if (!response.text) {
      throw new Error("No alternatives found.");
    }
    
    return JSON.parse(response.text) as AlternativeItem[];

  } catch (error) {
    console.error("[GeminiService] Find Alternatives Error:", error);
    throw error;
  }
};