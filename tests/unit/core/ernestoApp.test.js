import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErnestoApp } from '../../../src/core/ernestoApp.js';
import { clearExpiredCache } from '../../../src/common/cache/summariesCache.js';
import { clearExpiredAudioCache } from '../../../src/common/cache/speechifyCache.js';
import { clearExpiredPromptsCache } from '../../../src/common/cache/promptsCache.js';

// Mock the chrome API
vi.mock('chrome', () => ({
  sidePanel: {
    setOptions: vi.fn(),
    open: vi.fn()
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn()
    }
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn()
    }
  },
  action: {
    onClicked: {
      addListener: vi.fn()
    }
  },
  storage: {
    onChanged: {
      addListener: vi.fn()
    }
  },
  tabs: {
    create: vi.fn()
  }
}), { virtual: true });

// Mock cache modules
vi.mock('../../../src/common/cache/summariesCache.js', () => ({
  clearExpiredCache: vi.fn().mockResolvedValue()
}));
vi.mock('../../../src/common/cache/speechifyCache.js', () => ({
  clearExpiredAudioCache: vi.fn().mockResolvedValue()
}));
vi.mock('../../../src/common/cache/promptsCache.js', () => ({
  clearExpiredPromptsCache: vi.fn().mockResolvedValue()
}));

describe('ErnestoApp', () => {
  let app;
  let originalConsoleLog;
  let originalConsoleError;
  let consoleLogSpy;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Save original console methods
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    
    // Replace with spies
    consoleLogSpy = vi.fn();
    consoleErrorSpy = vi.fn();
    console.log = consoleLogSpy;
    console.error = consoleErrorSpy;
    
    // Create app instance for each test
    app = new ErnestoApp();
    
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Stop the interval if it's running
    if (app.cleanupInterval) {
      clearInterval(app.cleanupInterval);
      app.cleanupInterval = null;
    }
    
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      expect(app.CACHE_CLEANUP_INTERVAL).toBe(3600000); // 1 hour in ms
      expect(app.cleanupInterval).toBeNull();
    });
    
    it('should perform initialization tasks when init() is called', async () => {
      // Spy on methods
      const clearCachesSpy = vi.spyOn(app, 'clearAllExpiredCaches').mockResolvedValue();
      const startIntervalSpy = vi.spyOn(app, 'startCacheCleanupInterval').mockImplementation(() => {});
      const setupListenersSpy = vi.spyOn(app, 'setupEventListeners').mockImplementation(() => {});
      
      // Call init
      await app.init();
      
      // Verify methods were called
      expect(clearCachesSpy).toHaveBeenCalledTimes(1);
      expect(startIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setupListenersSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Ernesto extension initialized');
    });
  });
  
  describe('cache management', () => {
    it('should clear all expired caches', async () => {
      await app.clearAllExpiredCaches();
      
      expect(clearExpiredCache).toHaveBeenCalledTimes(1);
      expect(clearExpiredAudioCache).toHaveBeenCalledTimes(1);
      expect(clearExpiredPromptsCache).toHaveBeenCalledTimes(1);
    });
    
    it('should handle cache clearing errors', async () => {
      const error = new Error('Cache error');
      clearExpiredCache.mockRejectedValueOnce(error);
      
      await app.clearAllExpiredCaches();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error clearing expired caches:',
        error
      );
    });
    
    it('should start cache cleanup interval', () => {
      vi.spyOn(global, 'setInterval').mockReturnValue(123);
      
      app.startCacheCleanupInterval();
      
      expect(app.cleanupInterval).toBe(123);
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        app.CACHE_CLEANUP_INTERVAL
      );
    });
    
    it('should clear existing interval when starting a new one', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      vi.spyOn(global, 'setInterval').mockReturnValue(123);
      
      // Set an existing interval
      app.cleanupInterval = 456;
      
      app.startCacheCleanupInterval();
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(456);
      expect(app.cleanupInterval).toBe(123);
    });
    
    it('should stop cache cleanup interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      // Set an existing interval
      app.cleanupInterval = 789;
      
      app.stopCacheCleanupInterval();
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(789);
      expect(app.cleanupInterval).toBeNull();
    });
    
    it('should not call clearInterval if no interval is set', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      app.cleanupInterval = null;
      
      app.stopCacheCleanupInterval();
      
      expect(clearIntervalSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('extension setup', () => {
    it('should configure context menu on extension install', () => {
      const details = { reason: 'install' };
      
      app.setupExtension(details);
      
      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: "openAndSummarize",
        title: "Open && Summarize",
        contexts: ["link"]
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Ernesto extension installed/updated. Performing setup.',
        details
      );
    });
    
    it('should set up tab-specific sidepanel when extension icon is clicked', () => {
      const tab = { id: 123 };
      
      app.handleActionClick(tab);
      
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        enabled: true,
        path: "src/sidepanel/index.html?tabId=123",
        tabId: 123,
      });
      expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 123 });
    });
  });
  
  describe('event listeners', () => {
    it('should set up all event listeners', () => {
      app.setupEventListeners();
      
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.action.onClicked.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
    });
    
    it('should handle API key storage changes', () => {
      const changes = {
        openaiApiKey: {
          newValue: 'test-key'
        }
      };
      
      app.handleStorageChange(changes);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'API Key changed:',
        '✓ Key set'
      );
    });
    
    it('should handle API key removal', () => {
      const changes = {
        openaiApiKey: {
          newValue: null
        }
      };
      
      app.handleStorageChange(changes);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'API Key changed:',
        '✗ Key cleared'
      );
    });
    
    it('should ignore non-API key storage changes', () => {
      const changes = {
        someOtherSetting: {
          newValue: 'value'
        }
      };
      
      app.handleStorageChange(changes);
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
    
    it('should handle openAndSummarize context menu click', () => {
      const info = {
        menuItemId: 'openAndSummarize',
        linkUrl: 'https://example.com'
      };
      const tab = { id: 456 };
      
      app.handleContextMenuClick(info, tab);
      
      expect(chrome.tabs.create).toHaveBeenCalledWith(
        {
          url: 'https://example.com',
          active: false
        },
        expect.any(Function)
      );
    });
    
    it('should ignore context menu clicks with no linkUrl', () => {
      const info = {
        menuItemId: 'openAndSummarize',
        linkUrl: null
      };
      const tab = { id: 456 };
      
      app.handleContextMenuClick(info, tab);
      
      expect(chrome.tabs.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
    
    it('should ignore non-openAndSummarize context menu clicks', () => {
      const info = {
        menuItemId: 'someOtherAction',
        linkUrl: 'https://example.com'
      };
      const tab = { id: 456 };
      
      app.handleContextMenuClick(info, tab);
      
      expect(chrome.tabs.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  // Add a new test block for the openSidePanel method
  describe('sidepanel management', () => {
    it('should open sidepanel for a specific tab', () => {
      const tabId = 789;
      
      app.openSidePanel(tabId);
      
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        enabled: true,
        path: "src/sidepanel/index.html?tabId=789",
        tabId: tabId,
      });
      expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: tabId });
    });
  });
}); 