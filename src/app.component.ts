
import { Component, inject, OnInit, signal, computed, viewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsService, NewsItem } from './services/news.service';
import { TickerComponent } from './components/ticker/ticker.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, TickerComponent],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private newsService = inject(NewsService);
  
  categories = ['World', 'Technology', 'Science', 'Business', 'Sports', 'Health', 'Entertainment'];
  selectedCategories = signal<Set<string>>(new Set(['World']));
  
  newsItems = this.newsService.newsItems;
  isLoading = this.newsService.isLoading;
  isMoreLoading = this.newsService.isMoreLoading;
  error = this.newsService.error;
  
  selectedArticle = signal<NewsItem | null>(null);
  articleImage = signal<string | null>(null);
  isImageLoading = signal<boolean>(false);
  isSpeaking = signal<boolean>(false);

  private sentinel = viewChild<ElementRef>('sentinel');
  private observer: IntersectionObserver | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // Derived state to check if a category is active
  isCategoryActive(cat: string): boolean {
    return this.selectedCategories().has(cat);
  }

  activeCount = computed(() => this.selectedCategories().size);

  ngOnInit() {
    this.refreshNews();
  }

  ngAfterViewInit() {
    this.setupInfiniteScroll();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.stopSpeech();
  }

  private setupInfiniteScroll() {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.isLoading() && !this.isMoreLoading() && this.newsItems().length > 0) {
        this.loadMore();
      }
    }, {
      rootMargin: '200px', // Start loading before the user hits the absolute bottom
      threshold: 0.1
    });

    const sentinelEl = this.sentinel();
    if (sentinelEl) {
      this.observer.observe(sentinelEl.nativeElement);
    }
  }

  toggleCategory(category: string) {
    this.selectedCategories.update(current => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      
      // Prevent empty selection
      if (next.size === 0) {
        next.add('World');
      }
      return next;
    });
    this.refreshNews();
  }

  clearAllCategories() {
    this.selectedCategories.set(new Set(['World']));
    this.refreshNews();
  }

  refreshNews() {
    this.newsService.fetchNews(Array.from(this.selectedCategories()), false);
  }

  loadMore() {
    this.newsService.fetchNews(Array.from(this.selectedCategories()), true);
  }

  async selectArticle(item: NewsItem) {
    this.selectedArticle.set(item);
    this.articleImage.set(null);
    this.isImageLoading.set(true);
    this.stopSpeech();

    const generated = await this.newsService.generateImage(item.title, item.summary);
    
    if (generated) {
      this.articleImage.set(generated);
    } else {
      // Fallback placeholder based on the title seed
      const seed = encodeURIComponent(item.title.substring(0, 10));
      this.articleImage.set(`https://picsum.photos/seed/${seed}/1200/675`);
    }
    
    this.isImageLoading.set(false);
  }

  toggleSpeech(text: string) {
    if (this.isSpeaking()) {
      this.stopSpeech();
      return;
    }

    if ('speechSynthesis' in window) {
      this.stopSpeech();
      
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.rate = 1.0;
      this.currentUtterance.pitch = 1.0;
      this.currentUtterance.onstart = () => this.isSpeaking.set(true);
      this.currentUtterance.onend = () => this.isSpeaking.set(false);
      this.currentUtterance.onerror = () => this.isSpeaking.set(false);
      
      window.speechSynthesis.speak(this.currentUtterance);
    }
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking.set(false);
    this.currentUtterance = null;
  }

  closeDetails() {
    this.stopSpeech();
    this.selectedArticle.set(null);
    this.articleImage.set(null);
  }
}
