import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import type { RecommendationItem, ChatMessage, VirtualTryOnParams } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const ai2 = new GoogleGenAI({ apiKey: import.meta.env.VITE_IMAGEN_API_KEY });

export const detectGender = async (imageBase64: string): Promise<string> => {
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
        },
    };

    const prompt = `
        You are a fashion stylist AI.
        Analyze ONLY style, appearance, outfit type, visual features.

        Determine the MOST LIKELY gender presentation of the *fashion styling*:
        - Consider hairstyle, accessories, body shape, clothing cut, neckline, sleeve design, makeup presence.
        - Male: short hair, broad shoulders, masculine shirt, no makeup, straight cuts.
        - Female: softer facial shape, long hair, fitted blouse, curved cuts, feminine colors, lace, makeup.
        - If visually ambiguous, choose "Female" if styling leans feminine, or "Male" if styling leans masculine.
        - If completely unclear, return { "gender": "Unknown" }

        Return JSON ONLY:
        {"gender": "Male"} or {"gender": "Female"} or {"gender": "Unknown"}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [imagePart, { text: prompt }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        gender: { type: Type.STRING, enum: ["Male", "Female", "Unknown"] }
                    },
                },
            },
        });

        const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const json = JSON.parse(rawText);

        return json.gender || "Unknown";

    } catch (error) {
        console.error("Error detecting gender:", error);
        return "Unknown"; 
    }
};


export const getGarmentDetails = async (preferences: { style: string; colors: string; occasion: string; }, gender: string): Promise<RecommendationItem[]> => {
    const { style, colors, occasion } = preferences;
    
    // Determine specific item term based on occasion to match the visual generation logic
    const occasionMap: Record<string, string> = {
        'Workout / Gym': gender === 'Male' ? "Athletic Performance Top" : "Sporty Activewear Top",
        'Formal Event': gender === 'Male' ? "Formal Tuxedo/Dress Shirt" : "Elegant Evening Blouse",
        'Office / Work': gender === 'Male' ? "Professional Button-Down" : "Workwear Blouse",
        'Beach Vacation': gender === 'Male' ? "Linen/Tropical Shirt" : "Breezy Summer Top",
        'Date Night': gender === 'Male' ? "Stylish Smart-Casual Shirt" : "Chic Evening Top",
        'Music Festival': gender === 'Male' ? "Statement Festival Shirt/Tee" : "Boho/Festival Top",
        'Wedding Guest': gender === 'Male' ? "Crisp Dress Shirt" : "Formal Top",
    };

    const itemTerm = occasionMap[occasion] || (gender === 'Male' ? "Men's Shirt" : "Women's Top/Blouse");

    const prompt = `
        **Task:** Generate a JSON list of 3 distinct ${itemTerm} recommendations based on:
        - Gender Style: ${gender}
        - Style: ${style}
        - Color Preference: ${colors}
        - Occasion: ${occasion}

        **CRITICAL DIVERSITY RULES:**
        You must generate 3 items that are COMPLETELY different from each other.
        1.  **Item 1:** Must use the primary color from the user's palette. Focus on a standard fabric for the occasion.
        2.  **Item 2:** Must use a SECONDARY/CONTRASTING color from the palette. Focus on a different texture or pattern relevant to the occasion.
        3.  **Item 3:** Must use a THIRD distinct color or a PATTERN. Focus on a unique cut or design feature.

        **Output Requirement:**
        Return ONLY a JSON array. Each object must have:
        - itemName: Creative name (e.g., "Midnight Oxford", "Silk Wrap Blouse", "Pro-Fit Mesh Tank").
        - styleCategory: e.g., "Modern", "Classic", "Edgy", "Athletic".
        - description: A short description mentioning the specific fabric texture and color.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            itemName: {
                                type: Type.STRING,
                                description: 'The specific name of the fashion item.',
                            },
                            styleCategory: {
                                type: Type.STRING,
                                description: 'The category of style this item belongs to.',
                            },
                            description: {
                                type: Type.STRING,
                                description: 'A brief description emphasizing color and texture.',
                            },
                        },
                        required: ["itemName", "styleCategory", "description"],
                    },
                },
            },
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        if (Array.isArray(result) && result.length > 0) {
            return result as RecommendationItem[];
        }
        throw new Error("The model did not return valid recommendations.");
    } catch (error) {
        console.error("Error getting garment details:", error);
        throw new Error("Could not get garment details. Please try again.");
    }
};

export const generateGarmentRecommendations = async (
    preferences: { style: string; colors: string; occasion: string; },
    aspectRatio: string = '1:1',
    gender: string
): Promise<string[]> => {
    const { style, colors, occasion } = preferences;

    // Intelligent Mapping for Realistic Garment Types based on Occasion
    const occasionConfig: Record<string, { male: string, female: string, fabric: string }> = {
        'Workout / Gym': {
            male: "sleeveless athletic tank top or moisture-wicking sports t-shirt",
            female: "athletic racerback tank top, sports crop top, or performance tee",
            fabric: "technical moisture-wicking fabric, mesh details, breathable synthetic blend"
        },
        'Office / Work': {
            male: "professional oxford button-down dress shirt",
            female: "tailored silk blouse, structured button-up shirt, or smart shell top",
            fabric: "crisp cotton, silk, poplin, or satin. Smooth professional finish"
        },
        'Formal Event': {
            male: "tuxedo shirt or high-end formal dress shirt with french cuffs",
            female: "elegant evening blouse, satin top, or chiffon overlay",
            fabric: "satin, silk, fine egyptian cotton, or velvet details"
        },
        'Date Night': {
            male: "stylish slim-fit button-down or premium knit polo shirt",
            female: "romantic off-shoulder top, lace bodysuit, or satin camisole",
            fabric: "silk, satin, fine knit, or soft cotton blend"
        },
        'Beach Vacation': {
            male: "linen button-down shirt or tropical print camp collar shirt",
            female: "breezy linen tunic, crochet top, or flowy boho blouse",
            fabric: "linen, lightweight cotton, seersucker, or sheer fabrics"
        },
        'Music Festival': {
            male: "vintage graphic tee, distressed denim shirt, or open flannel",
            female: "boho fringe top, crochet halter, or patterned kimono top",
            fabric: "distressed cotton, denim, crochet, or patterned rayon"
        },
        'Wedding Guest': {
            male: "crisp dress shirt (white or pastel)",
            female: "dressy chiffon blouse or silk shell top",
            fabric: "fine cotton, chiffon, or silk"
        },
         'Travel': {
            male: "comfortable utility shirt, soft henley, or cotton tee",
            female: "oversized tunic, soft knit top, or comfortable tee",
            fabric: "wrinkle-resistant cotton, jersey, or flannel"
        },
        // Fallback for 'Weekend Outing', 'Casual Hangout', etc.
        'default': {
            male: "casual oxford shirt, flannel, or high-quality t-shirt",
            female: "casual blouse, knit top, or everyday tee",
            fabric: "cotton, denim, flannel, or jersey"
        }
    };

    const defaults = occasionConfig['default'];
    const config = occasionConfig[occasion] || defaults;
    
    const garmentType = gender === 'Male' ? config.male : config.female;
    const fabricDetails = config.fabric;

    // Base prompt template enforcing single item
    const createPrompt = (specificDesign: string) => `
      You are a professional fashion photographer.
      **Goal:** Generate a single, studio-quality product photo of EXACTLY ONE (1) garment.
      **Item Type:** ${gender === 'Male' ? "Men's" : "Women's"} ${garmentType}.
      **Context:** ${gender} ${style} fashion for ${occasion}.
      **Fabric:** ${fabricDetails}.
      **Palette:** ${colors}.
      
      **SPECIFIC DESIGN:** ${specificDesign}

      **CRITICAL VISUAL RULES (STRICTLY ENFORCED):**
      -   **QUANTITY:** ONE SINGLE ITEM ONLY. Isolate the garment.
      -   **LAYOUT:** Ghost mannequin or flat lay on a plain white background. Front view.
      -   **NEGATIVE PROMPT:** NO pants, NO shorts, NO bottoms (TOP ONLY). NO models, NO human body parts, NO hands, NO faces, NO text, NO watermarks, NO labels, NO multiple items, NO accessories.
      -   **QUALITY:** Photorealistic, 8k, highly detailed fabric texture, professional studio lighting.
    `;

    // Customize variations based on whether the occasion allows for patterns/collars or is more sporty/casual
    const isSportyOrCasual = occasion === 'Workout / Gym' || style === 'Streetwear' || occasion === 'Music Festival';

    // Variation 1: Primary Color focus
    const var1 = isSportyOrCasual
        ? `Solid Primary Color from palette. Focus on the technical/casual texture and fit. Minimalist design.`
        : `Solid Primary Color from palette. Classic, clean design. Focus on high-quality fabric drape and finish.`;

    // Variation 2: Pattern/Texture focus
    const var2 = isSportyOrCasual
        ? `Two-tone color block or sporty geometric accents using secondary colors. Dynamic lines.`
        : `A distinct classic pattern (e.g., stripes, checks, or floral print) incorporating secondary colors.`;

    // Variation 3: Cut/Silhouette focus
    const var3 = isSportyOrCasual
        ? `Unique athletic cut (e.g., racerback, muscle fit, or mesh panels) in a contrasting third color.`
        : `Unique silhouette (e.g., interesting collar, sleeve detail, or asymmetric hem) in a contrasting third color.`;

    // Define 3 distinct prompts for diversity
    const prompts = [
        createPrompt(var1),
        createPrompt(var2),
        createPrompt(var3)
    ];
    
    try {
        const images: string[] = [];

        for (const prompt of prompts) {
            try {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/png',
                        aspectRatio: aspectRatio,
                    },
                });
                
                if (response.generatedImages && response.generatedImages.length > 0) {
                    images.push(response.generatedImages[0].image.imageBytes);
                }
            } catch (innerError) {
                console.warn("Skipping one image generation due to error or rate limit:", innerError);
            }
        }
        
        if (images.length === 0) {
            throw new Error("No images were generated. Please check your API quota or try again later.");
        }

        return images;

    } catch (error) {
        console.error("Error generating garment recommendations:", error);
        throw new Error("Could not generate garment recommendations. Please try again.");
    }
}

export const createFashionChat = (history: ChatMessage[] = []): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        history,
        config: {
            systemInstruction: "You are a friendly and knowledgeable AI Fashion Stylist. Your goal is to help users with their fashion questions, provide styling tips, and help them discover new looks. Be encouraging, concise, and helpful. Your responses should be plain text. Do not use any markdown formatting, such as asterisks for bolding or lists.",
        },
    });
};

export const performVirtualTryOn = async ({ personImage, garmentImage, width, height }: VirtualTryOnParams): Promise<string> => {
    const personImagePart = {
        inlineData: {
            mimeType: 'image/jpeg', // Assuming jpeg, could be dynamic
            data: personImage,
        },
    };

    const garmentImagePart = {
        inlineData: {
            mimeType: 'image/png', // Assuming png for potential transparency, could be dynamic
            data: garmentImage,
        },
    };

    const textPart = {
        text: `**TOP PRIORITY & NON-NEGOTIABLE RULE: IMAGE DIMENSION INTEGRITY**
The final output image's dimensions MUST be EXACTLY ${width} pixels wide by ${height} pixels high. This matches the original input person photo (Image 1). The aspect ratio MUST be IDENTICAL. There can be no stretching, cropping, or resizing of the original scene. This is the most critical instruction.

**CORE MISSION: Physics-Based 3D Virtual Try-On Simulation**

You are an expert digital tailor operating an advanced physics-based rendering (PBR) engine. Your task is to simulate draping a garment onto a person in a 2D photograph as if it were a high-fidelity 3D model. The final output must be indistinguishable from a real photograph where the person is physically wearing the garment.

**INPUTS:**
-   **[Image 1]:** A photo of a person.
-   **[Image 2]:** A photo of an isolated garment.

**KEY DIRECTIVES FOR UNMATCHED REALISM (Simulating 3D):**

1.  **Advanced Fabric & Material Simulation:**
    *   **Physics-Based Properties:** Analyze the garment in Image 2 to infer its physical properties. Simulate its **weight** (e.g., heavy denim vs. light silk), **stiffness**, and **texture**.
    *   **PBR Lighting Interaction:** The garment's material must interact with the scene's lighting realistically. Simulate **specular highlights** for shiny materials (like satin or leather) and **diffuse reflection** for matte materials (like cotton).
    *   **Micro-Wrinkles & Stretching:** Create a high-fidelity displacement map based on the person's underlying body form. Generate realistic micro-wrinkles, fabric stretching, and compression that accurately reflect the material's properties and the pose.

2.  **Body Shape & Draping Mastery:**
    *   **Conform to Body & Pose:** The garment must perfectly conform to the person's unique body shape and pose. The simulation must calculate how the fabric would naturally hang, drape, and fold.
    *   **Ambient Occlusion & Shadowing:** This is critical for 3D illusion. Calculate and render soft, realistic **ambient occlusion** in the creases and folds of the fabric. Cast subtle shadows where the garment interacts with the body (e.g., under the collar, at the waist) to create a sense of depth and separation.

3.  **Seamless Integration & Flawless Coverage:**
    *   **TOTAL Clothing Replacement:** Your second highest priority is to *completely and totally replace* the original clothing. There should be ZERO traces of the original shirt, especially at the collar, cuffs, and hem. The new garment must be fully opaque.
    *   **Preserve Identity & Scene:** The person's face, hair, skin tone, body, limbs, and the entire original background must remain absolutely unchanged.
    *   **Consistent Lighting:** The lighting on the new garment must perfectly match the lighting of the original scene in Image 1.

**CRITICAL RULES TO FOLLOW (REITERATED):**
-   **ABSOLUTE DIMENSION MATCH:** The output must have the exact same dimensions as the input person photo: ${width}x${height} pixels. NO EXCEPTIONS.
-   **THINK LIKE A 3D RENDERER:** The final output must look like it was rendered from a professional cloth simulation, not edited in 2D.
-   **ABSOLUTELY NO TRACE of the original garment.** This is the second most important rule.
-   **DO NOT** alter the person or the background.
-   **DO NOT** create a flat, "pasted-on" look. The garment must have volume, depth, and realistic lighting.
-   **AVOID** any signs of digital editing. The final output must be a single, cohesive, photorealistic image.`
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [personImagePart, garmentImagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        if (response.candidates && response.candidates[0]?.content?.parts[0]?.inlineData?.data) {
            return response.candidates[0].content.parts[0].inlineData.data;
        } else {
            throw new Error("The model did not return a valid image.");
        }
    } catch (error) {
        console.error("Error performing virtual try-on:", error);
        throw new Error("Could not perform the virtual try-on. Please check your images and try again.");
    }
};

export const getStyleComparison = async (originalImage: string, newImage: string): Promise<string> => {
    const originalImagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: originalImage,
        },
    };

    const newImagePart = {
        inlineData: {
            mimeType: 'image/png',
            data: newImage,
        },
    };

    const textPart = {
        text: `As an AI Fashion Stylist, look at these two images. The first is the "Before" photo, and the second is the "After" photo where the user has virtually tried on a new shirt. 
        
        Your task is to provide a single, concise, encouraging, and positive sentence comparing the two looks. Focus on how the new shirt enhances their style. For example: "The new shirt adds a vibrant pop of color and gives your outfit a fresh, modern look!"
        
        Keep the response to one sentence only. Do not use markdown.
        `
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, originalImagePart, newImagePart] },
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error getting style comparison:", error);
        // Return a generic positive message on error
        return "The new look really suits you! It's a great choice.";
    }
};