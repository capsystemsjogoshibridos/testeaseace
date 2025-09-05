import { GoogleGenAI, Type } from "@google/genai";
import type { Rackard } from '../types';

const MOCK_RACKARDS: Omit<Rackard, 'id' | 'imageUrl'>[] = [
    { name: "Saque Ace Fulminante", description: "Um saque tão rápido que o oponente nem vê a bola passar.", power: 95 },
    { name: "Voleio Sombra", description: "Um voleio sutil e preciso que cai exatamente onde o oponente não está.", power: 88 },
    { name: "Slice Invertido", description: "Um golpe com efeito que engana a trajetória da bola, confundindo o adversário.", power: 82 },
];

export const generateRandomRackard = async (apiKey?: string): Promise<Omit<Rackard, 'id' | 'imageUrl'>> => {
  if (!apiKey) {
    console.warn("API_KEY not provided. Using mock data.");
    return MOCK_RACKARDS[Math.floor(Math.random() * MOCK_RACKARDS.length)];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Crie uma carta de baralho colecionável com tema de tênis chamada 'Rackard'. Forneça um nome criativo, uma breve descrição de um movimento ou conceito especial deênis e um nível de poder de 1 a 100. Responda em formato JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "O nome criativo da carta." },
            description: { type: Type.STRING, description: "Uma breve descrição do poder ou habilidade da carta." },
            power: { type: Type.INTEGER, description: "O nível de poder da carta, de 1 a 100." },
          },
          required: ["name", "description", "power"],
        },
      },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if(parsed.name && parsed.description && typeof parsed.power === 'number') {
        return parsed as Omit<Rackard, 'id' | 'imageUrl'>;
    } else {
        throw new Error("Invalid format from API");
    }

  } catch (error) {
    console.error("Error generating Rackard with Gemini API, returning mock data:", error);
    return MOCK_RACKARDS[Math.floor(Math.random() * MOCK_RACKARDS.length)];
  }
};