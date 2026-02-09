import { useEffect, useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { setupSearchEngine, type SearchResult } from '../utils/search-engine';
import type { SearchItem } from '../utils/search-engine';

interface SearchPaletteProps {
  /** Whether to open by default */
  defaultOpen?: boolean;
}

/**
 * SearchPalette - Cmd+K style search palette component
 * 
 * Features:
 * - Keyboard shortcut Cmd+K / Ctrl+K to open/close
 * - Real-time video content search
 * - Fuzzy matching + prefix search
 * - Click result to navigate to video detail page
 */
export default function SearchPalette({ defaultOpen = false }: SearchPaletteProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Search engine instance (use ref to avoid re-initialization)
  const engineRef = useRef<Awaited<ReturnType<typeof setupSearchEngine>> | null>(null);

  // Initialize search engine
  useEffect(() => {
    async function initSearchEngine() {
      try {
        setIsLoading(true);
        
        console.log('[SearchPalette] Loading search data...');
        
        // Fetch search data from API
        const response = await fetch('/api/search.json');
        console.log('[SearchPalette] API response status:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const searchData: SearchItem[] = await response.json();
        console.log('[SearchPalette] Received data:', {
          total: searchData.length,
          first: searchData[0],
          firstThreeTitles: searchData.slice(0, 3).map(item => item.title)
        });
        
        // Initialize search engine
        engineRef.current = await setupSearchEngine(searchData);
        
        // Verify index status
        const stats = engineRef.current.getStats();
        console.log('[SearchPalette] Search engine indexed:', stats);
        
        setIsLoading(false);
      } catch (err) {
        console.error('[SearchPalette] Initialization failed:', err);
        setError('Failed to initialize search engine');
        setIsLoading(false);
      }
    }

    initSearchEngine();
  }, []);

  // Keyboard shortcuts (Cmd+K / Ctrl+K) and custom event listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    }

    // Listen for custom 'open-search' event (from Header click)
    function handleOpenSearch() {
      setIsOpen(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search', handleOpenSearch);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-search', handleOpenSearch);
    };
  }, [isOpen]);

  // Auto-focus input field
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Execute search
  useEffect(() => {
    if (!engineRef.current) {
      console.log('[SearchPalette] Search engine not initialized, skipping search');
      return;
    }

    if (query.trim() === '') {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    try {
      console.log('[SearchPalette] Executing search:', query);
      const searchResults = engineRef.current.search(query, {
        fuzzy: 0.2,
        prefix: true,
        limit: 10,
      });
      console.log('[SearchPalette] Search results:', {
        query: query,
        resultCount: searchResults.length,
        topThree: searchResults.slice(0, 3).map(r => ({ title: r.title, score: r.score }))
      });
      
      setResults(searchResults);
      setSelectedIndex(0);
    } catch (err) {
      console.error('[SearchPalette] Search error:', err);
    }
  }, [query]);

  // Keyboard navigation (Arrow keys + Enter)
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigateToVideo(results[selectedIndex].id);
        }
        break;
    }
  }

  // Scroll to selected item
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Navigate to video detail page
  function navigateToVideo(slug: string) {
    window.location.href = `/videos/${slug}`;
  }

  // Close search panel
  function closeSearch() {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={closeSearch}
        aria-hidden="true"
      />

      {/* Search panel */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
        <div
          className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input field */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? 'Loading...' : 'Search videos, artists, directors...'}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-lg"
            />
            <button
              onClick={closeSearch}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close search"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search results */}
          <div
            ref={resultsRef}
            className="max-h-[50vh] overflow-y-auto overscroll-contain"
          >
            {error && (
              <div className="p-8 text-center text-red-500">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="p-8 text-center text-gray-500">
                Loading search engine...
              </div>
            )}

            {!isLoading && !error && query && results.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No results found
              </div>
            )}

            {!isLoading && !error && query === '' && (
              <div className="p-8 text-center text-gray-400">
                <div className="text-sm mb-2">Keyboard Shortcuts</div>
                <div className="text-xs space-y-1">
                  <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd> Navigate</div>
                  <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> Open</div>
                  <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> Close</div>
                </div>
              </div>
            )}

            {!isLoading && !error && results.length > 0 && (
              <div className="py-1">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => navigateToVideo(result.id)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {/* Title */}
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.title}
                    </div>
                    
                    {/* Subtitle: Artist and Director */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {result.artist && (
                        <span className="truncate">{result.artist}</span>
                      )}
                      {result.artist && result.director && (
                        <span className="text-gray-400">•</span>
                      )}
                      {result.director && (
                        <span className="truncate">{result.director}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {!isLoading && !error && results.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 text-center">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>
    </>
  );
}
