
import { Component, input } from '@angular/core';
import { NewsItem } from '../../services/news.service';

@Component({
  selector: 'app-ticker',
  template: `
    <div class="fixed bottom-0 left-0 right-0 bg-red-700 text-white h-12 flex items-center overflow-hidden border-t-2 border-red-900 z-50">
      <div class="bg-red-900 px-4 h-full flex items-center font-bold uppercase tracking-widest text-sm z-10 shadow-lg">
        Breaking
      </div>
      <div class="relative flex-1 h-full overflow-hidden flex items-center">
        <div class="animate-marquee whitespace-nowrap flex items-center">
          @for (item of items(); track $index) {
            <span class="mx-8 flex items-center gap-2">
              @if (item.sourceUrl) {
                <a [href]="item.sourceUrl" 
                   target="_blank" 
                   [title]="'Source: ' + item.sourceUrl" 
                   class="font-bold text-red-200 hover:text-white transition-colors cursor-pointer underline decoration-red-400/30 underline-offset-4">
                  [{{ item.sourceName || 'News' }}]
                </a>
              } @else {
                <span class="font-bold text-red-200">[{{ item.sourceName || 'News' }}]</span>
              }
              <span>{{ item.title }}</span>
              <span class="w-2 h-2 rounded-full bg-white opacity-50"></span>
            </span>
          }
          <!-- Duplicate for seamless loop -->
          @for (item of items(); track $index + 'dup') {
            <span class="mx-8 flex items-center gap-2">
              @if (item.sourceUrl) {
                <a [href]="item.sourceUrl" 
                   target="_blank" 
                   [title]="'Source: ' + item.sourceUrl" 
                   class="font-bold text-red-200 hover:text-white transition-colors cursor-pointer underline decoration-red-400/30 underline-offset-4">
                  [{{ item.sourceName || 'News' }}]
                </a>
              } @else {
                <span class="font-bold text-red-200">[{{ item.sourceName || 'News' }}]</span>
              }
              <span>{{ item.title }}</span>
              <span class="w-2 h-2 rounded-full bg-white opacity-50"></span>
            </span>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TickerComponent {
  items = input.required<NewsItem[]>();
}
