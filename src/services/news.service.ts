
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from "@google/genai";

export interface NewsItem {
  title: string;
  summary: string;
  category: string;
  timestamp: string;
  sourceUrl?: string;
  sourceName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });
  
  newsItems = signal<NewsItem[]>([]);
  isLoading = signal<boolean>(false);
  isMoreLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  async fetchNews(categories: string[], append: boolean = false) {
    if (append) {
      this.isMoreLoading.set(true);
    } else {
      this.isLoading.set(true);
    }
    this.error.set(null);
    
    const categoriesStr = categories.join(', ');
    
    try {
      const prompt = `Provide exactly 6 of the most recent and trending news headlines across these categories: ${categoriesStr}. 
      Distribute the headlines reasonably across the requested categories.
      If this is an update, try to find headlines different from generic top stories.
      For each headline, provide a short 1-sentence summary and the news source name. 
      Format as a JSON array of objects with keys: "title", "summary", "category", "sourceName".
      Make sure the news is real and current. Use Google Search to verify.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const items: NewsItem[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      items.forEach((item, index) => {
        item.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (chunks[index]?.web?.uri) {
          item.sourceUrl = chunks[index].web.uri;
        }
      });

      if (items.length > 0) {
        if (append) {
          // Filter out items that might already exist by title
          const existingTitles = new Set(this.newsItems().map(n => n.title));
          const newUniqueItems = items.filter(item => !existingTitles.has(item.title));
          this.newsItems.update(current => [...current, ...newUniqueItems]);
        } else {
          this.newsItems.set(items);
        }
      } else if (!append) {
        this.setFallbackNews();
      }

    } catch (err) {
      console.error("Error fetching news:", err);
      if (!append) {
        this.error.set("Failed to load news. Please try again.");
        this.setFallbackNews();
      }
    } finally {
      this.isLoading.set(false);
      this.isMoreLoading.set(false);
    }
  }

  async generateImage(title: string, summary: string): Promise<string | null> {
    try {
      const prompt = `A professional news editorial photograph for: "${title}". ${summary}. Realistic, high-resolution, award-winning photojournalism style.`;
      
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg'
        },
      });

      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (err) {
      console.error("Error generating image:", err);
      return null;
    }
  }

  private setFallbackNews() {
    this.newsItems.set([
      { title: "Major Tech Breakthrough in AI Chips", summary: "A new architecture promises 5x efficiency in large model inference.", category: "Technology", timestamp: "Just now", sourceName: "Tech Daily" },
      { title: "Global Climate Summit Reaches Historical Accord", summary: "World leaders agree on aggressive new carbon neutral targets for 2040.", category: "World", timestamp: "12m ago", sourceName: "World News" },
      { title: "Market Volatility Decreases After Central Bank Update", summary: "Stocks rally as investors process new economic guidance on interest rates.", category: "Business", timestamp: "45m ago", sourceName: "Financial Times" },
      { title: "Discovery of Prehistoric Cave Art in Europe", summary: "Archaeologists find perfectly preserved paintings dating back 30,000 years.", category: "Science", timestamp: "1h ago", sourceName: "Science Monitor" },
      { title: "Championship Finals Set for Weekend Showdown", summary: "The top two seeds secure their spots after thrilling semi-final victories.", category: "Sports", timestamp: "2h ago", sourceName: "Sports Central" },
      { title: "New Study Links Sleep Quality to Heart Health", summary: "Longitudinal research suggests consistent rest is vital for cardiovascular longevity.", category: "Health", timestamp: "3h ago", sourceName: "Health Report" }
    ]);
  }
}
