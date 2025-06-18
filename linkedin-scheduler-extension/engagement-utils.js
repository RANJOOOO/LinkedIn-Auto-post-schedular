// Engagement Utilities for LinkedIn Scheduler Extension

// Non-Connected Users Counter Class
class NonConnectedCounter {
  constructor() {
    this.MAX_LIMIT = 30;
    this._count = 0;
  }

  async initialize() {
    const storage = await chrome.storage.local.get('nonConnectedUsers');
    this._count = (storage.nonConnectedUsers || []).length;
    return this._count;
  }

  async getCount() {
    const storage = await chrome.storage.local.get('nonConnectedUsers');
    this._count = (storage.nonConnectedUsers || []).length;
    return this._count;
  }

  async increment() {
    const newCount = await this.getCount() + 1;
    if (newCount > this.MAX_LIMIT) {
      return false;
    }
    this._count = newCount;
    return true;
  }

  async isLimitReached() {
    const count = await this.getCount();
    return count >= this.MAX_LIMIT;
  }

  get maxLimit() {
    return this.MAX_LIMIT;
  }
}

window.EngagementUtils = {
  // Constants
  MAX_POST_AGE_DAYS: 3,
  WS_URL: 'ws://localhost:5000',
  ws: null,
  isInitialized: false,
  WS_TIMEOUT: 30000, // 30 second timeout
  pendingMessages: new Map(), // Track pending messages
  nonConnectedCounter: new NonConnectedCounter(), // Add counter instance
  
  // Navigation URLs
  PROFILE_URL: 'https://www.linkedin.com/in/',
  
  // Helper function for waiting
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Initialize WebSocket connection
  initWebSocket() {
    if (this.ws) return;
    
    console.log('Initializing WebSocket connection...');
    try {
      this.ws = new WebSocket(this.WS_URL);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isInitialized = true;
        // Send client_ready message to get pending posts
        this.sendWebSocketMessage('client_ready', {}).catch(error => {
          console.warn('⚠️ Failed to send client_ready message:', error);
          // Continue anyway since we don't need the server for basic functionality
        });
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        // Don't set isInitialized to false here
      };
      
      this.ws.onerror = (error) => {
        console.warn('⚠️ WebSocket error:', error);
        // Don't set isInitialized to false here
      };

      // Handle incoming messages
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);

          switch (message.type) {
            case 'connection_status':
              console.log('Connection status update:', message.message);
              break;

            case 'posts_list':
              console.log('Received posts list:', message.posts);
              break;

            case 'error':
              console.warn('Received error:', message.error);
              break;

            case 'post_due':
              console.log('Received due post:', message);
              break;

            case 'profile_status':
              console.log('Received profile status:', message);
              break;

            case 'profile_saved':
              console.log('Profile saved successfully:', message.profile);
              break;

            case 'message_generated':
              console.log('Message generated successfully:', message.message);
              // Resolve the pending message if it exists
              this.resolvePendingMessage(message.messageId, message);
              break;

            default:
              console.log('Received message:', message);
          }
        } catch (error) {
          console.warn('⚠️ Error handling WebSocket message:', error);
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to initialize WebSocket:', error);
      // Don't set isInitialized to false here
    }
  },

  // Helper to resolve pending messages
  resolvePendingMessage(messageId, response) {
    const pending = this.pendingMessages.get(messageId);
    if (pending) {
      pending.resolve(response);
      this.pendingMessages.delete(messageId);
    }
  },

  // Helper to reject pending messages
  rejectPendingMessage(messageId, error) {
    const pending = this.pendingMessages.get(messageId);
    if (pending) {
      pending.reject(error);
      this.pendingMessages.delete(messageId);
    }
  },

  // Initialize the utility
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing EngagementUtils...');
    
    // Try to initialize WebSocket but don't block on it
    try {
    this.initWebSocket();
      // Don't wait for connection
      console.log('✅ WebSocket initialization started');
    } catch (error) {
      console.warn('⚠️ WebSocket initialization failed, continuing without WebSocket:', error);
    }
    
    // Mark as initialized immediately
    this.isInitialized = true;
    console.log('✅ EngagementUtils initialized');
  },

  // Helper function to send WebSocket message with timeout
  async sendWebSocketMessage(type, data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, attempting to connect...');
      this.initWebSocket();
      // Don't wait for connection
      return null;
    }
    
    return new Promise((resolve) => {
      let timeoutId;
      
      const handler = (event) => {
        try {
          const response = JSON.parse(event.data);
            clearTimeout(timeoutId);
            this.ws.removeEventListener('message', handler);
            resolve(response);
        } catch (error) {
          console.warn('⚠️ Error parsing WebSocket response:', error);
          clearTimeout(timeoutId);
          this.ws.removeEventListener('message', handler);
          resolve(null);
        }
      };
      
      // Set timeout for the operation
timeoutId = setTimeout(() => {
    this.ws.removeEventListener('message', handler);
        console.log(`ℹ️ WebSocket message timeout for ${type}, continuing without response`);
        resolve(null);
}, this.WS_TIMEOUT);
      
      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify({ type, ...data }));
    });
  },

  // Check if profile exists
  async checkProfileExists(profileUrl) {
    try {
      const response = await this.sendWebSocketMessage('check_profile', { profileUrl });
      console.log('Profile check response:', response);
      return response.type === 'profile_status' ? response.exists : false;
    } catch (error) {
      console.error('Error checking profile existence:', error);
      return false;
    }
  },

  // Clear Chrome storage before starting new session
  async clearChromeStorage() {
    try {
      await chrome.storage.local.remove('nonConnectedUsers');
      console.log('Cleared non-connected users from Chrome storage');
    } catch (error) {
      console.error('Error clearing Chrome storage:', error);
    }
  },

  // Save to Chrome storage (only for current session)
  async saveToChromeStorage(profileUrl, data) {
    try {
      // Get existing non-connected users from storage
      const result = await chrome.storage.local.get('nonConnectedUsers');
      const nonConnectedUsers = result.nonConnectedUsers || [];
      
      // Check if user already exists in storage
      const exists = nonConnectedUsers.some(user => user.profileUrl === profileUrl);
      if (!exists) {
        // Add new user to array
        nonConnectedUsers.push({
          profileUrl: profileUrl,
          name: data.name,
          connectionStatus: 'not_connected',
          connectionDegree: '3rd',
          savedAt: new Date().toISOString()
        });
        
        // Save back to storage
        await chrome.storage.local.set({ nonConnectedUsers });
        console.log('Saved non-connected user to Chrome storage:', data.name);
      }
    } catch (error) {
      console.error('Error saving to Chrome storage:', error);
    }
  },

  // Save profile with proper response handling
  async saveProfile(profileUrl, data) {
    try {
      // Ensure WebSocket connection
      await this.ensureWebSocketConnection();

      // Check if profile exists first
      const exists = await this.checkProfileExists(profileUrl);
      if (exists) {
        console.log('Profile already exists, skipping save');
        return { type: 'profile_saved', profile: { profileUrl, name: data.name } };
      }

      // Send save_profile message with only basic info
      const profileResponse = await this.sendWebSocketMessage('save_profile', {
        profileUrl: profileUrl,
        name: data.name
      });

      if (!this.validateResponse(profileResponse, 'profile_saved')) {
        return null;
      }

      // Save to Chrome storage with only basic info
      await this.saveToChromeStorage(profileUrl, {
        name: data.name,
        url: profileUrl
      });

      return profileResponse;
    } catch (error) {
      console.error('Error saving profile:', error);
      return null;
    }
  },

  // Update connection status
  async updateConnectionStatus(profileUrl) {
    try {
      const response = await this.sendWebSocketMessage('update_connection_status', { profileUrl });
      return response.profile;
    } catch (error) {
      console.error('Error updating connection status:', error);
      return null;
    }
  },

  // Update follow-up status
  async updateFollowUpStatus(profileUrl) {
    try {
      const response = await this.sendWebSocketMessage('update_followup_status', { profileUrl });
      return response.profile;
    } catch (error) {
      console.error('Error updating follow-up status:', error);
      return null;
    }
  },

  // Helper function to check if a date is within last 3 days
  isWithinLastThreeDays: function(timestamp) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - this.MAX_POST_AGE_DAYS);
    return new Date(timestamp) >= threeDaysAgo;
  },

  // Helper function to parse LinkedIn timestamp
  parseLinkedInTimestamp: function(timestampText) {
    const now = new Date();
    if (!timestampText) return now.getTime();
    
    // Extract the time part (e.g., "1 year ago", "2 years ago", "3 months ago", etc.)
    const timeMatch = timestampText.match(/(\d+)\s*(year|month|week|day|hour)s?\s*ago/i);
    if (!timeMatch) return now.getTime();
    
    const [, amount, unit] = timeMatch;
    const value = parseInt(amount);
    
    switch(unit.toLowerCase()) {
      case 'year':
        now.setFullYear(now.getFullYear() - value);
        break;
      case 'month':
        now.setMonth(now.getMonth() - value);
        break;
      case 'week':
        now.setDate(now.getDate() - (value * 7));
        break;
      case 'day':
        now.setDate(now.getDate() - value);
        break;
      case 'hour':
        now.setHours(now.getHours() - value);
        break;
    }
    
    return now.getTime();
  },

  // Navigate to user's recent activity
  async navigateToRecentActivity(profileId) {
    try {
      console.log(`Navigating to recent activity for: ${profileId}`);
      
      // Check if we're already on the correct page
      const currentUrl = window.location.href;
      const targetUrl = `${this.PROFILE_URL}${profileId}/recent-activity/all/`;
      
      if (currentUrl === targetUrl) {
        console.log('Already on the correct page');
        return true;
      }
      
      // Only navigate if we're not already on the page
      if (!currentUrl.includes(`/in/${profileId}/recent-activity`)) {
        console.log('Navigating to:', targetUrl);
        window.location.href = targetUrl;
        
        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Wait for activity container to load
      const activityContainer = await this.waitForElement('.profile-creator-shared-feed-update__container', 10000);
      if (!activityContainer) {
        console.log('Activity container not found, but continuing anyway');
      }
      
      console.log('Successfully navigated to recent activity');
      return true;
    } catch (error) {
      console.error('Error navigating to recent activity:', error);
      return false;
    }
  },

  // Find posts and extract reactions
  async findRecentPosts() {
    console.log('🔍 Starting to find recent posts...');
    
    if (!this.isInitialized) {
      console.log('⏳ EngagementUtils not initialized, initializing now...');
      await this.initialize();
    }

    // Ensure WebSocket connection before proceeding
    try {
      await this.ensureWebSocketConnection();
      console.log('✅ WebSocket connection verified');
    } catch (error) {
      console.warn('⚠️ WebSocket connection not available, continuing without it:', error);
    }
    
    const posts = [];
    let processedPosts = 0;
    let uniqueReactors = new Set();

    try {
      // Helper function to check if we've reached the end of the feed
    const isEndOfFeed = () => {
        const endOfFeed = document.querySelector('.feed-shared-end-of-feed');
        return !!endOfFeed;
    };

      // Helper function to load more posts
    const loadMorePosts = async () => {
        const loadMoreButton = document.querySelector('.feed-shared-load-more-button');
        if (loadMoreButton) {
          console.log('⏳ Found load more button, clicking...');
          loadMoreButton.click();
          await this.wait(2000); // Wait for new posts to load
          return true;
        }
        return false;
      };
      
      // Process posts until we find enough or reach the end
      while (processedPosts < 50 && !isEndOfFeed()) {
        const postElements = document.querySelectorAll('.feed-shared-update-v2');
        console.log(`📊 Found ${postElements.length} posts, processing...`);
        
        for (const postElement of postElements) {
          if (processedPosts >= 50) break;
          
          try {
            // Create a post object with necessary properties
            const post = {
            element: postElement,
              postId: postElement.getAttribute('data-urn') || `post-${processedPosts}`,
            type: this.getPostType(postElement),
            content: postElement.querySelector('.feed-shared-update-v2__description')?.textContent || '',
              url: postElement.querySelector('a[data-control-name="post_timestamp"]')?.href || ''
            };
            
            const postData = await this.processPost(post);
            if (postData) {
              posts.push(postData);
              processedPosts++;
              
              // Track unique reactors
              if (postData.reactors) {
                postData.reactors.forEach(reactor => uniqueReactors.add(reactor.profileUrl));
              }
            }
        } catch (error) {
            console.error('❌ Error processing post:', error);
        }
      }

        // Try to load more posts if we haven't found enough
        if (processedPosts < 50 && !isEndOfFeed()) {
          const loadedMore = await loadMorePosts();
          if (!loadedMore) break;
        }
      }
      
      console.log(`✅ Processed ${processedPosts} posts, found ${uniqueReactors.size} unique reactors`);
      return {
        success: true,
        posts,
        stats: {
          totalPosts: processedPosts,
          uniqueReactors: uniqueReactors.size
        }
      };
      
    } catch (error) {
      console.error('❌ Error finding recent posts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Save posts data to storage
  async savePostsData(postsData) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: postsData });
      console.log('Saved posts data to storage');
      return true;
    } catch (error) {
      console.error('Error saving posts data:', error);
      return false;
    }
  },

  // Helper function to extract number from text
  extractNumber(element, selector) {
    const targetElement = element.querySelector(selector);
    if (targetElement) {
      const text = targetElement.textContent.trim();
      const match = text.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }
    return 0;
  },

  // Helper function to determine post type
  getPostType(post) {
    if (post.querySelector('.feed-shared-article__container')) {
      return 'article';
    } else if (post.querySelector('.feed-shared-external-video__container')) {
      return 'video';
    } else if (post.querySelector('.feed-shared-image__container')) {
      return 'image';
    } else if (post.querySelector('.feed-shared-document__container')) {
      return 'document';
    } else if (post.querySelector('.feed-shared-update-v2__description')) {
      return 'text';
    }
    return 'unknown';
  },

  // Get reaction counts for a post
  async getReactionCounts(postElement) {
    try {
      const reactionButton = postElement.querySelector('.social-details-social-counts__reactions-count');
      if (!reactionButton) {
        console.log('No reaction button found');
        return { count: 0, type: 'unknown' };
      }

      const count = parseInt(reactionButton.textContent.trim()) || 0;
      const type = reactionButton.getAttribute('aria-label') || 'unknown';
      console.log(`Found ${count} reactions of type: ${type}`);

      return { count, type };
    } catch (error) {
      console.error('Error getting reaction counts:', error);
      return { count: 0, type: 'error' };
    }
  },

  // Open reaction list for a post
  async openReactionList(postElement) {
    try {
      console.log('Attempting to open reaction list...');
      const reactionButton = postElement.querySelector('.social-details-social-counts__reactions-count');
      if (!reactionButton) {
        throw new Error('Reaction button not found');
      }

      // Click the reaction button
      reactionButton.click();
      console.log('Clicked reaction button');
      
      // Wait for the reaction list to appear
      const reactionList = await this.waitForElement('.artdeco-modal__content', 5000);
      if (!reactionList) {
        throw new Error('Reaction list did not appear');
      }

      console.log('Successfully opened reaction list');
      return true;
    } catch (error) {
      console.error('Error opening reaction list:', error);
      return false;
    }
  },

  // Extract profile URLs from reaction list
  async extractProfileUrls() {
    try {
      console.log('Extracting profile URLs from reaction list...');
      const profileLinks = Array.from(document.querySelectorAll('.artdeco-entity-lockup__title a'));
      const profiles = profileLinks.map(link => ({
        url: link.href,
        name: link.textContent.trim()
      }));

      console.log(`Found ${profiles.length} profiles in reaction list`);
      return profiles;
    } catch (error) {
      console.error('Error extracting profile URLs:', error);
      return [];
    }
  },

  // Helper function to wait for an element
  async waitForElement(selector, timeout = 5000) {
    console.log(`Waiting for element: ${selector}`);
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Found element: ${selector}`);
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Element not found after ${timeout}ms: ${selector}`);
    return null;
  },

  // Add new methods for reaction extraction and profile viewing
  async extractReactorInfo(element, postContent = '') {
    try {
      const link = element.querySelector('a.link-without-hover-state');
      if (!link || !link.href) {
        console.log('⚠️ No valid link found for reactor');
        return null;
      }

      // Get the name from the title - improved extraction
      const titleElement = link.querySelector('.artdeco-entity-lockup__title');
      let name = '';
      if (titleElement) {
        // Get all text content and clean it up
        name = titleElement.textContent
          .replace(/View.*profile/g, '') // Remove "View X's profile" text
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
      }

      // Get the profile URL - clean version without query parameters
      const url = link.href.split('?')[0];

      // Get the reaction type
      const reactionIcon = element.querySelector('.reactions-icon');
      const reactionType = reactionIcon ? reactionIcon.getAttribute('data-test-reactions-icon-type') : '';

      // Get connection status
      let connectionStatus = 'unknown';
      let connectionDegree = '';
      
      // Try to get connection status from the badge element
      const badgeElement = element.querySelector('.artdeco-entity-lockup__badge');
      if (badgeElement) {
        // Get the degree text (1st, 2nd, 3rd+)
        const degreeElement = badgeElement.querySelector('.artdeco-entity-lockup__degree');
        if (degreeElement) {
          connectionDegree = degreeElement.textContent.trim().replace('·', '').trim();
          
          // Map the degree to connection status
          if (connectionDegree.includes('1st')) {
            connectionStatus = 'connected';
                    // Skip 1st degree connections immediately
                    console.log('⏭️ Skipping 1st degree connection:', name);
                    return null;
          } else if (connectionDegree.includes('2nd')) {
            connectionStatus = 'mutual_connection';
          } else if (connectionDegree.includes('3rd')) {
            connectionStatus = 'not_connected';
          }
        }
        
        // Get the full connection text from a11y-text
        const a11yText = badgeElement.querySelector('.a11y-text');
        if (a11yText) {
          const fullConnectionText = a11yText.textContent.trim();
          // If we couldn't determine status from degree, try the full text
          if (connectionStatus === 'unknown') {
            if (fullConnectionText.includes('1st degree')) {
              connectionStatus = 'connected';
                        // Skip 1st degree connections immediately
                        console.log('⏭️ Skipping 1st degree connection:', name);
                        return null;
            } else if (fullConnectionText.includes('2nd degree')) {
              connectionStatus = 'mutual_connection';
            } else if (fullConnectionText.includes('3rd degree')) {
              connectionStatus = 'not_connected';
            }
          }
        }
      }

      // Get the caption/headline
      const captionElement = link.querySelector('.artdeco-entity-lockup__caption');
      let caption = '';
      if (captionElement) {
        caption = captionElement.textContent
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      // Validate required fields
      if (!name || !url) {
        console.log('⚠️ Missing name or URL for reactor');
        return null;
      }

        // Only return if it's a non-connected user (2nd or 3rd degree)
        if (connectionStatus === 'connected') {
            console.log('⏭️ Skipping connected user:', name);
            return null;
        }
      
      return { 
        name, 
        url,
        reactionType,
        caption,
        connectionStatus,
        connectionDegree,
        connectionText: badgeElement ? badgeElement.textContent.trim() : '',
        postContent // Use the passed post content
      };
    } catch (error) {
      console.log('⚠️ Error extracting reactor info:', error);
      return null;
    }
  },

  async scrollAndLoadAllReactions(dialog, postContent = '') {
    const scrollContainer = dialog.querySelector('.scaffold-finite-scroll__content');
    if (!scrollContainer) return [];

    let previousHeight = 0;
    let currentHeight = scrollContainer.scrollHeight;
    let scrollAttempts = 0;
    let noNewReactionsCount = 0;
    const maxNoNewReactions = 3;
    const processedUrls = new Set();
    const reactors = [];
    let nonConnectedCount = 0;

    console.log('\n📜 REACTOR EXTRACTION STARTED:');
    console.log('=============================');
    console.log('   - Initial scroll height:', currentHeight);
    console.log('   - Max no-new-reactions:', maxNoNewReactions);
    console.log('   - Current non-connected count:', await this.nonConnectedCounter.getCount());
    console.log('   - Limit:', this.nonConnectedCounter.maxLimit);
    console.log('=============================\n');

    const cleanupAndReturn = async () => {
      console.log('\n🧹 CLEANING UP:');
      console.log('================');
      console.log('   - Closing reactions dialog...');
      await this.closeReactionsDialog();
      console.log('   - Cleanup complete');
      console.log('================\n');
      return reactors;
    };

    while (noNewReactionsCount < maxNoNewReactions) {
      // Check non-connected limit before processing more reactors
      if (await this.nonConnectedCounter.isLimitReached()) {
        console.log('\n❌ LIMIT CHECK - EXTRACTION STOPPED:');
        console.log(`   - Current count: ${await this.nonConnectedCounter.getCount()}/${this.nonConnectedCounter.maxLimit}`);
        console.log(`   - Non-connected reactors found in this batch: ${nonConnectedCount}`);
        return await cleanupAndReturn();
      }

      // Extract reactors from current view
      const reactorElements = dialog.querySelectorAll('.social-details-reactors-tab-body-list-item');
      
      console.log('\n📊 CURRENT VIEW STATS:');
      console.log('=====================');
      console.log(`   - Reactors in view: ${reactorElements.length}`);
      console.log(`   - Already processed: ${processedUrls.size}`);
      console.log(`   - Scroll attempt: ${scrollAttempts + 1}`);
      console.log(`   - No new reactions count: ${noNewReactionsCount}/${maxNoNewReactions}`);
      console.log(`   - Non-connected count: ${nonConnectedCount}`);
      console.log('=====================\n');

      let foundNewReactor = false;

      // Process each reactor
      for (const element of reactorElements) {
        // Check limit before processing each reactor
        if (await this.nonConnectedCounter.isLimitReached()) {
          console.log('\n❌ LIMIT CHECK - BATCH STOPPED:');
          console.log(`   - Current count: ${await this.nonConnectedCounter.getCount()}/${this.nonConnectedCounter.maxLimit}`);
          console.log(`   - Non-connected reactors found in this batch: ${nonConnectedCount}`);
          return await cleanupAndReturn();
        }

        const reactorInfo = await this.extractReactorInfo(element, postContent);
        if (reactorInfo && !processedUrls.has(reactorInfo.url)) {
          processedUrls.add(reactorInfo.url);
          reactors.push(reactorInfo);
          foundNewReactor = true;

          // Check if this is a non-connected reactor
          const isNonConnected = reactorInfo.connectionStatus === 'not_connected' || 
                               reactorInfo.connectionStatus === 'mutual_connection' ||
                               reactorInfo.connectionDegree.includes('3rd');

          if (isNonConnected) {
            nonConnectedCount++;
            
            // Try to save immediately
            const exists = await this.checkProfileExists(reactorInfo.url);
            if (!exists) {
              console.log('\n💾 Attempting to save non-connected reactor...');
              const saved = await this.saveNonConnectedToStorage(reactorInfo.url, {
                name: reactorInfo.name,
                postContent: reactorInfo.postContent,
                reactionType: reactorInfo.reactionType,
                caption: reactorInfo.caption || '',
                connectionStatus: reactorInfo.connectionStatus,
                connectionDegree: reactorInfo.connectionDegree,
                connectionText: reactorInfo.connectionText,
                postId: reactorInfo.postId,
                postType: reactorInfo.postType,
                postUrl: reactorInfo.url,
                savedAt: new Date().toISOString()
              });

              if (saved) {
                console.log('\n✅ NEW USER SAVED:');
                console.log('==================');
                console.log(`   - User: ${reactorInfo.name}`);
                console.log(`   - Storage Count: ${await this.nonConnectedCounter.getCount()}/${this.nonConnectedCounter.maxLimit}`);
                console.log(`   - Non-connected count: ${nonConnectedCount}`);
                console.log('==================\n');
              }
            }
          }
          
          console.log('\n👤 NEW REACTOR FOUND:');
          console.log('=====================');
          console.log(`   - Name: ${reactorInfo.name}`);
          console.log(`   - URL: ${reactorInfo.url}`);
          console.log(`   - Connection: ${reactorInfo.connectionStatus}`);
          console.log(`   - Degree: ${reactorInfo.connectionDegree}`);
          console.log(`   - Reaction: ${reactorInfo.reactionType}`);
          console.log(`   - Total unique reactors: ${processedUrls.size}`);
          console.log(`   - Non-connected count: ${nonConnectedCount}`);
          console.log('=====================\n');
        }
      }

      // If no new reactors found, increment counter
      if (!foundNewReactor) {
        noNewReactionsCount++;
        console.log('\n⚠️ NO NEW REACTORS:');
        console.log('==================');
        console.log(`   - Attempt ${noNewReactionsCount}/${maxNoNewReactions}`);
        console.log(`   - Total unique reactors so far: ${reactors.length}`);
        console.log(`   - Non-connected count: ${nonConnectedCount}`);
        console.log('==================\n');
      } else {
        noNewReactionsCount = 0;
      }

      // Scroll to next batch
      previousHeight = currentHeight;
      scrollContainer.scrollTop = currentHeight;
      await this.wait(1000);
      currentHeight = scrollContainer.scrollHeight;
      scrollAttempts++;

      // Check if "Show more results" button exists and click it
      const showMoreButton = dialog.querySelector('.scaffold-finite-scroll__load-button');
      if (showMoreButton) {
        console.log('\n📜 LOADING MORE RESULTS:');
        console.log('=======================');
        console.log('   - Found "Show more" button');
        console.log('   - Clicking to load more...');
        console.log(`   - Current non-connected count: ${nonConnectedCount}`);
        console.log('=======================\n');
        
        showMoreButton.click();
        await this.wait(2000);
        noNewReactionsCount = 0;
      }

      console.log('\n📊 SCROLL PROGRESS:');
      console.log('==================');
      console.log(`   - Scroll attempt: ${scrollAttempts}`);
      console.log(`   - Previous height: ${previousHeight}`);
      console.log(`   - Current height: ${currentHeight}`);
      console.log(`   - Height difference: ${currentHeight - previousHeight}`);
      console.log(`   - Total unique reactors: ${reactors.length}`);
      console.log(`   - Non-connected count: ${nonConnectedCount}`);
      console.log('==================\n');
    }

    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    console.log('=====================');
    console.log('   - Performing final scroll...');
    console.log('   - Checking for any missed reactors...');
    console.log(`   - Total non-connected count: ${nonConnectedCount}`);
    console.log('=====================\n');

    await this.wait(2000);
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    await this.wait(2000);

    // Final check for any missed reactors
    const finalReactorElements = dialog.querySelectorAll('.social-details-reactors-tab-body-list-item');
    let finalNewReactors = 0;
    
    for (const element of finalReactorElements) {
      // Check limit before processing final reactors
      if (await this.nonConnectedCounter.isLimitReached()) {
        console.log('\n❌ LIMIT CHECK - FINAL VERIFICATION STOPPED:');
        console.log(`   - Current count: ${await this.nonConnectedCounter.getCount()}/${this.nonConnectedCounter.maxLimit}`);
        console.log(`   - Non-connected reactors found in this batch: ${nonConnectedCount}`);
        return await cleanupAndReturn();
      }

      const reactorInfo = await this.extractReactorInfo(element, postContent);
      if (reactorInfo && !processedUrls.has(reactorInfo.url)) {
        processedUrls.add(reactorInfo.url);
        reactors.push(reactorInfo);
        finalNewReactors++;
        
        // Check if this is a non-connected reactor
        const isNonConnected = reactorInfo.connectionStatus === 'not_connected' || 
                             reactorInfo.connectionStatus === 'mutual_connection' ||
                             reactorInfo.connectionDegree.includes('3rd');

        if (isNonConnected) {
          nonConnectedCount++;
          
          // Try to save immediately
          const exists = await this.checkProfileExists(reactorInfo.url);
          if (!exists) {
            console.log('\n💾 Attempting to save non-connected reactor...');
            const saved = await this.saveNonConnectedToStorage(reactorInfo.url, {
              name: reactorInfo.name,
              postContent: reactorInfo.postContent,
              reactionType: reactorInfo.reactionType,
              caption: reactorInfo.caption || '',
              connectionStatus: reactorInfo.connectionStatus,
              connectionDegree: reactorInfo.connectionDegree,
              connectionText: reactorInfo.connectionText,
              postId: reactorInfo.postId,
              postType: reactorInfo.postType,
              postUrl: reactorInfo.url,
              savedAt: new Date().toISOString()
            });

            if (saved) {
              console.log('\n✅ NEW USER SAVED:');
              console.log('==================');
              console.log(`   - User: ${reactorInfo.name}`);
              console.log(`   - Storage Count: ${await this.nonConnectedCounter.getCount()}/${this.nonConnectedCounter.maxLimit}`);
              console.log(`   - Non-connected count: ${nonConnectedCount}`);
              console.log('==================\n');
            }
          }
        }
        
        console.log('\n👤 MISSED REACTOR FOUND:');
        console.log('=======================');
        console.log(`   - Name: ${reactorInfo.name}`);
        console.log(`   - URL: ${reactorInfo.url}`);
        console.log(`   - Connection: ${reactorInfo.connectionStatus}`);
        console.log(`   - Non-connected count: ${nonConnectedCount}`);
        console.log('=======================\n');
      }
    }

    console.log('\n✅ EXTRACTION COMPLETE:');
    console.log('=====================');
    console.log(`   - Total unique reactors: ${reactors.length}`);
    console.log(`   - Scroll attempts: ${scrollAttempts}`);
    console.log(`   - Final new reactors found: ${finalNewReactors}`);
    console.log(`   - No new reactions count: ${noNewReactionsCount}/${maxNoNewReactions}`);
    console.log(`   - Total non-connected count: ${nonConnectedCount}`);
    console.log('=====================\n');

    // Clean up before returning
    await cleanupAndReturn();
    return reactors;
  },

  async viewProfilesInSingleTab(reactors) {
    console.log('\n🌐 Opening profiles in a single tab...');
    
    // Open the first profile in a new tab
    const profileTab = window.open(reactors[0].url, '_blank');
    if (!profileTab) {
      console.log('❌ Failed to open profile tab. Please allow popups.');
      return;
    }

    // Wait for the first profile to load
    console.log(`⏳ Waiting for ${reactors[0].name}'s profile to load...`);
    await this.waitForProfileLoad(profileTab);
    console.log('✅ First profile loaded');

    // Process remaining profiles
    for (let i = 1; i < reactors.length; i++) {
      console.log(`\n🔄 Viewing profile for: ${reactors[i].name}`);
      
      // Update the URL of the existing tab
      profileTab.location.href = reactors[i].url;
      
      // Wait for the profile to load completely
      console.log('⏳ Waiting for profile to load...');
      await this.waitForProfileLoad(profileTab);
      console.log('✅ Profile loaded successfully');
      
      // Additional wait to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  },

  async waitForProfileLoad(tab) {
    try {
      // Wait for the basic profile elements to load
      await new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          try {
            // Check if the main profile elements are loaded
            const mainContent = tab.document.querySelector('.scaffold-layout__main');
            const profileHeader = tab.document.querySelector('.pv-top-card');
            const experienceSection = tab.document.querySelector('#experience-section');
            
            if (mainContent && profileHeader && experienceSection) {
              clearInterval(checkInterval);
              resolve();
            }
          } catch (e) {
            // Ignore cross-origin errors
          }
        }, 500);

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Profile load timeout'));
        }, 30000);
      });

      // Additional wait to ensure dynamic content is loaded
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log('⚠️ Profile load check failed, continuing anyway...');
    }
  },

  async findAndClickConnectButton(tab) {
    console.log('\n🔍 Looking for connect button...');
    
    // Helper function to evaluate XPath
    function getElementByXPath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    try {
        // Get the profile action area using the exact XPath
        const profileActionAreaXPath = '/html/body/div[6]/div[3]/div/div/div[2]/div/div/main/section[1]/div[2]';
        const profileActionArea = getElementByXPath(profileActionAreaXPath);

        if (!profileActionArea) {
            console.log('❌ Profile action area not found');
            return false;
        }
        console.log('✅ Found profile action area');

        // First try to find the direct connect button
        const directConnectButton = profileActionArea.querySelector('button[aria-label*="Invite"][aria-label*="to connect"]');
        if (directConnectButton) {
            console.log('✅ Found direct connect button');
            
            // Try to click the direct connect button
            try {
                directConnectButton.click();
                console.log('✅ Direct connect button clicked');
                await this.wait(2000);
                return true;
            } catch (clickError) {
                console.error('❌ Error clicking direct connect button:', clickError);
                return false;
            }
        } else {
            console.log('ℹ️ No direct connect button found, checking More button...');

            // Look for More button
            const moreButton = profileActionArea.querySelector('button[aria-label="More actions"]');
            if (!moreButton) {
                console.log('❌ More button not found');
                return false;
            }
            console.log('✅ Found More button');

            // Click More button
            console.log('Clicking More button...');
            moreButton.click();
            await this.wait(2000);

            // Find dropdown with retry mechanism
            let dropdown = null;
            let retryCount = 0;
            const maxRetries = 5;

            while (!dropdown && retryCount < maxRetries) {
                dropdown = profileActionArea.querySelector('.artdeco-dropdown__content:not([aria-hidden="true"])');
                if (!dropdown) {
                    console.log(`⏳ Waiting for dropdown to become visible (attempt ${retryCount + 1}/${maxRetries})...`);
                    await this.wait(1000);
                    retryCount++;
                }
            }

            if (!dropdown) {
                console.log('❌ Dropdown did not become visible');
                return false;
            }
            console.log('✅ Found visible dropdown');

            // Get dropdown content
            const dropdownContent = dropdown.querySelector('.artdeco-dropdown__content-inner');
            if (!dropdownContent) {
                console.log('❌ Dropdown content not found');
                return false;
            }
            console.log('✅ Found dropdown content');

            // Look for connect button in dropdown
            const connectButton = dropdownContent.querySelector('div[aria-label*="Invite"][aria-label*="to connect"]');
            if (!connectButton) {
                console.log('❌ Connect button not found in dropdown');
                return false;
            }

            // Verify the button is clickable
            if (connectButton.offsetParent === null || 
                window.getComputedStyle(connectButton).display === 'none' ||
                window.getComputedStyle(connectButton).visibility === 'hidden') {
                console.log('❌ Connect button is not visible or clickable');
                return false;
            }

            console.log('✅ Found clickable connect button in dropdown');

            // Try multiple click methods
            try {
                // Method 1: Direct click
                connectButton.click();
                console.log('✅ Connect button clicked directly');
                return true;
            } catch (clickError) {
                console.log('⚠️ Direct click failed, trying alternative click methods...');
                
                try {
                    // Method 2: Event dispatch
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    connectButton.dispatchEvent(clickEvent);
                    console.log('✅ Connect button clicked via event dispatch');
                    return true;
                } catch (eventError) {
                    console.log('⚠️ Event dispatch failed, trying mousedown/mouseup...');
                    
                    try {
                        // Method 3: Mousedown/mouseup sequence
                        connectButton.dispatchEvent(new MouseEvent('mousedown', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                        connectButton.dispatchEvent(new MouseEvent('mouseup', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                        console.log('✅ Connect button clicked via mousedown/mouseup');
                        return true;
                    } catch (mouseError) {
                        console.log('❌ All click attempts failed');
                        console.error('Click errors:', {
                            directClick: clickError,
                            eventDispatch: eventError,
                            mouseEvents: mouseError
                        });
                        return false;
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error in findAndClickConnectButton:', error);
        return false;
    }
  },

  async waitForElementToBeVisible(tab, selector, timeout = 5000) {
    try {
      return await new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkElement = () => {
          try {
            const element = tab.document.querySelector(selector);
            if (element && 
                element.offsetParent !== null && 
                !element.disabled && 
                window.getComputedStyle(element).display !== 'none' &&
                window.getComputedStyle(element).visibility !== 'hidden') {
              resolve(element);
              return;
            }
          } catch (e) {
            // Ignore cross-origin errors
          }

          if (Date.now() - startTime >= timeout) {
            reject(new Error(`Timeout waiting for element: ${selector}`));
            return;
          }

          setTimeout(checkElement, 500);
        };

        checkElement();
      });
    } catch (error) {
      console.error(`Error waiting for element ${selector}:`, error);
      return null;
    }
  },

  // Process a single post
  async processPost(post) {
    try {
      console.log(`\n🔄 Processing post: ${post.postId}`);
      
      // Check limit before processing
      const result = await chrome.storage.local.get('nonConnectedUsers');
      const nonConnectedUsers = result.nonConnectedUsers || [];
      if (nonConnectedUsers.length >= this.nonConnectedCounter.maxLimit) {
        console.log('❌ Maximum limit of 30 non-connected users reached, stopping post processing');
        return null;
      }
      
      if (!post.element) {
        console.log('❌ Post element not found, skipping post');
        return null;
      }

      // Extract post content with better logging
      const postContent = post.element.querySelector('.feed-shared-update-v2__description')?.textContent || '';
      console.log('\n📝 Post Content Found:');
      console.log('=====================');
      console.log(postContent);
      console.log('=====================\n');

      // Scroll the post into view and wait for it to be fully visible
      post.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.wait(2000);
      
      // Find the reaction button
      const socialCounts = post.element.querySelector('.social-details-social-counts__reactions');
      if (!socialCounts) {
        console.log('❌ No social counts section found in this post');
        return null;
      }

      const reactionButton = socialCounts.querySelector('button[data-reaction-details]');
      if (!reactionButton) {
        console.log('❌ No reaction button found in this post');
        return null;
      }

      console.log('✅ Found reaction button');

      // Click the reaction button and wait for dialog
      reactionButton.click();
      console.log('✅ Clicked reaction button');
      
      // Wait longer for the dialog to load completely
      console.log('⏳ Waiting for reactions to load...');
      await this.wait(4000);

      // Wait for the reactions dialog with retry mechanism
      let dialog = null;
      let retryCount = 0;
      while (!dialog && retryCount < 3) {
        dialog = await this.waitForElement('.social-details-reactors-modal__content', 5000);
        if (!dialog) {
          console.log(`Retry ${retryCount + 1}/3: Waiting for reactions dialog...`);
          await this.wait(2000);
          retryCount++;
        }
      }

      if (!dialog) {
        console.log('❌ No reactions dialog found after retries');
        return null;
      }

      // Extract all reactors with improved error handling
      console.log('📜 Starting to scroll and extract all reactions...');
      const reactors = await this.scrollAndLoadAllReactions(dialog, postContent);
      console.log(`✅ Found ${reactors.length} reactors`);

      if (reactors.length === 0) {
        console.log('❌ No reactors found for this post');
        await this.closeReactionsDialog();
        return null;
      }

      // Process each profile with limit check
      const processedProfiles = [];
      for (const reactor of reactors) {
        try {
          // Check limit before processing each profile
          const currentCount = (await chrome.storage.local.get('nonConnectedUsers')).nonConnectedUsers?.length || 0;
          if (currentCount >= this.nonConnectedCounter.maxLimit) {
            console.log('❌ Maximum limit reached, stopping profile processing');
            break;
          }

          console.log(`\n🔍 Processing profile: ${reactor.name}`);
          const exists = await this.checkProfileExists(reactor.url);
          
          if (!exists) {
            console.log(`✅ Found new non-connected user: ${reactor.name}`);
            console.log('📝 Saving with post content:', postContent);
            console.log('🎯 Reaction type:', reactor.reactionType);
            
            const saved = await this.saveNonConnectedToStorage(reactor.url, {
              name: reactor.name,
              postId: post.postId,
              postType: post.type,
              postContent: postContent,
              postUrl: post.url,
              reactionType: reactor.reactionType,
              connectionSent: false,
              messageSent: false,
              processedAt: new Date().toISOString()
            });
            
            if (saved) {
              processedProfiles.push(reactor);
              // Verify the save
              const verifyStorage = await chrome.storage.local.get('nonConnectedUsers');
              const savedUser = verifyStorage.nonConnectedUsers.find(u => u.profileUrl === reactor.url);
              console.log('\n✅ Verification of saved data:');
              console.log('==========================');
              console.log('User:', savedUser?.name);
              console.log('Post Content:', savedUser?.postContent);
              console.log('Reaction Type:', savedUser?.reactionType);
              console.log('==========================\n');
            }
          } else {
            console.log(`ℹ️ Profile already exists: ${reactor.name}`);
          }
        } catch (error) {
          console.error(`Error processing profile ${reactor.name}:`, error);
        }
      }

      console.log(`✅ Successfully processed ${processedProfiles.length} new profiles`);

      // Close the reaction list
      await this.closeReactionsDialog();

      return processedProfiles;

    } catch (error) {
      console.error('Error processing post:', error);
      return null;
    }
  },

  // Add method to close reactions dialog
  async closeReactionsDialog() {
    console.log('🔒 Closing reactions dialog...');
    try {
      // First check if dialog exists
      const dialog = document.querySelector('.artdeco-modal__content');
      if (!dialog) {
        console.log('✅ No dialog found, already closed');
        return true;
      }

      // Try multiple methods to close the dialog
      const closeMethods = [
        // Method 1: Close button
        async () => {
          const closeButtonSelectors = [
            'button[data-test-modal-close-btn]',
            'button.artdeco-modal__dismiss',
            'button[aria-label="Dismiss"]',
            'button[aria-label="Close"]',
            '.artdeco-modal__dismiss'
          ];

          for (const selector of closeButtonSelectors) {
            const button = document.querySelector(selector);
            if (button) {
              console.log(`Found close button with selector: ${selector}`);
              button.click();
              return true;
            }
          }
          return false;
        },

        // Method 2: Click overlay
        async () => {
          const overlay = document.querySelector('.artdeco-modal-overlay');
          if (overlay) {
            console.log('Clicking overlay to close dialog');
            overlay.click();
            return true;
          }
          return false;
        },

        // Method 3: Press Escape key
        async () => {
          console.log('Sending Escape key to close dialog');
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true
          }));
          return true;
        }
      ];

      // Try each method
      for (const method of closeMethods) {
        await method();
        await this.wait(500); // Wait between attempts

        // Verify if dialog is closed
        if (!document.querySelector('.artdeco-modal__content')) {
          console.log('✅ Dialog successfully closed');
          return true;
        }
      }

      // If we get here, dialog is still open
      console.log('⚠️ Dialog still visible after all close attempts');
      
      // Final attempt: Force remove the modal
      const modal = document.querySelector('.artdeco-modal');
      if (modal) {
        console.log('Attempting to force remove modal');
        modal.remove();
        await this.wait(500);
      }

      // Final verification
      const finalCheck = document.querySelector('.artdeco-modal__content');
      if (!finalCheck) {
        console.log('✅ Dialog finally closed');
        return true;
      } else {
        console.log('❌ Failed to close dialog');
        return false;
      }
    } catch (error) {
      console.error('❌ Error closing dialog:', error);
      return false;
    }
  },

  // Helper function to get non-connected count
  async getNonConnectedCount() {
    const storage = await chrome.storage.local.get('nonConnectedUsers');
    return (storage.nonConnectedUsers || []).length;
  },

  // Process all posts
  async processAllPosts() {
    try {
        console.log('Starting to process all posts...');
        const result = await this.findRecentPosts();
        
        if (!result.success || !result.posts || result.posts.length === 0) {
            console.log('No posts found to process');
            return false;
        }

        console.log(`Found ${result.posts.length} posts, processing...`);
        
        // Process posts until we hit the limit
        for (const post of result.posts) {
            // Check if we've hit the limit before processing each post
            const currentCount = await this.getNonConnectedCount();
            if (currentCount >= this.nonConnectedCounter.maxLimit) {
                console.log('Maximum limit reached, stopping post processing');
              break;
            }
            await this.processPost(post);
        }

        // Get the non-connected users from storage
        const storage = await chrome.storage.local.get('nonConnectedUsers');
        const nonConnectedUsers = storage.nonConnectedUsers || [];
        
        if (nonConnectedUsers.length > 0) {
            console.log('Sending users to popup:', nonConnectedUsers);
            
            // Send message to background script
            console.log('Sending users_found message to background script...');
            try {
                await chrome.runtime.sendMessage({
                    type: 'users_found',
                    users: nonConnectedUsers.map(user => ({
                        id: user.profileUrl,
                        name: user.name,
                        details: user.caption || 'No title available',  // Use caption instead of title
                        postContent: user.postContent || '',
                        reactionType: user.reactionType || ''
                    }))
                });
                console.log('Users_found message sent successfully to background script');
            } catch (error) {
                console.warn('Warning: Issue sending users_found message:', error);
              }
            } else {
            console.log('No non-connected users found to send');
        }

        return true;
        } catch (error) {
        console.error('Error processing posts:', error);
        return false;
    }
  },

  // Ensure WebSocket connection is established
  async ensureWebSocketConnection(timeout = 10000) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error('WebSocket connection timeout'));
          return;
        }
        
        setTimeout(checkConnection, 100);
      };
      
      this.initWebSocket();
      checkConnection();
    });
  },

  validateResponse(response, expectedType) {
    if (!response || response.type !== expectedType) {
      console.error(`Invalid response type: ${response?.type}, expected: ${expectedType}`);
      return false;
    }
    return true;
  },

  // Save non-connected user to MongoDB and Chrome storage
  async saveNonConnectedToStorage(profileUrl, data) {
    try {
      console.log('\n🔍 Checking if user exists in MongoDB...');
      const exists = await this.checkProfileExists(profileUrl);
      if (exists) {
        console.log('⏭️ User already exists in MongoDB, skipping save');
        return false;
      }
      console.log('✅ User not found in MongoDB, proceeding with save');

      // Get current count from storage first
      const result = await chrome.storage.local.get('nonConnectedUsers');
      const nonConnectedUsers = result.nonConnectedUsers || [];
      
      // Check if user already exists in local storage
      const existsInLocal = nonConnectedUsers.some(user => user.profileUrl === profileUrl);
      if (existsInLocal) {
        console.log('⏭️ User already exists in local storage');
        return false;
      }

      // Check if adding this user would exceed the limit
      if (nonConnectedUsers.length >= this.nonConnectedCounter.maxLimit) {
        console.log('❌ Maximum limit of 30 non-connected users reached');
        // Send message to popup even when we hit the limit
        await this.sendUsersToPopup(nonConnectedUsers);
        return false;
      }

      // Ensure WebSocket connection
      await this.ensureWebSocketConnection();

      // Send save_profile message to save in MongoDB
      const response = await this.sendWebSocketMessage('save_profile', {
        profileUrl: profileUrl,
        name: data.name,
        connectionStatus: 'not_connected',
        connectionDegree: '3rd',
        postContent: data.postContent || '',
        postId: data.postId,
        postType: data.postType,
        postUrl: data.postUrl,
        reactionType: data.reactionType,
        caption: data.caption || '',
        savedAt: new Date().toISOString()
      });

      if (this.validateResponse(response, 'profile_saved')) {
        console.log('\n💾 Saving user data to local storage:');
        console.log('==================================');
        console.log('Name:', data.name);
        console.log('Post Content:', data.postContent);
        console.log('Reaction Type:', data.reactionType);
        console.log('==================================\n');

        // Add new user to array with post content
        nonConnectedUsers.push({
          profileUrl: profileUrl,
          name: data.name,
          connectionStatus: 'not_connected',
          connectionDegree: '3rd',
          postContent: data.postContent || '',
          postId: data.postId,
          postType: data.postType,
          postUrl: data.postUrl,
          reactionType: data.reactionType,
          caption: data.caption || '',
          savedAt: new Date().toISOString()
        });

        // Save updated array back to storage
        await chrome.storage.local.set({ nonConnectedUsers });
        
        // Verify the save
        const verifyStorage = await chrome.storage.local.get('nonConnectedUsers');
        const savedUser = verifyStorage.nonConnectedUsers.find(u => u.profileUrl === profileUrl);
        console.log('\n✅ Verification of saved data in local storage:');
        console.log('==========================================');
        console.log('User:', savedUser?.name);
        console.log('Post Content:', savedUser?.postContent);
        console.log('Reaction Type:', savedUser?.reactionType);
        console.log('==========================================\n');
        
        // Update counter after successful save
        await this.nonConnectedCounter.initialize();
        
        console.log('\n✅ Save Successful:');
        console.log(`   - Saved to MongoDB: ${data.name}`);
        console.log(`   - Saved to Local Storage: ${data.name}`);
        console.log(`   - Updated Local Storage Count: ${nonConnectedUsers.length}/${this.nonConnectedCounter.maxLimit}`);

        // If we've hit the limit after saving, send message to popup
        if (nonConnectedUsers.length >= this.nonConnectedCounter.maxLimit) {
          await this.sendUsersToPopup(nonConnectedUsers);
        }

        return true;
      } else {
        console.error('❌ Failed to save user to MongoDB');
        return false;
      }
    } catch (error) {
      console.error('Error saving user:', error);
      return false;
    }
  },

  // Helper method to send users to popup
  async sendUsersToPopup(nonConnectedUsers) {
    try {
      console.log('Sending users to popup:', nonConnectedUsers);
      console.log('Sending users_found message to background script...');
      
      await chrome.runtime.sendMessage({
        type: 'users_found',
        users: nonConnectedUsers.map(user => ({
          id: user.profileUrl,
          name: user.name,
          details: user.caption || 'No title available',  // Use caption instead of title
          postContent: user.postContent || '',
          reactionType: user.reactionType || ''
        }))
      });
      
      console.log('Users_found message sent successfully to background script');
    } catch (error) {
      console.log('Warning: Issue sending users_found message:', error);
    }
  },

  // Add method to clear non-connected storage
  async clearNonConnectedStorage() {
    try {
      await chrome.storage.local.remove('nonConnectedUsers');
      console.log('Cleared non-connected users from Chrome storage');
    } catch (error) {
      console.error('Error clearing non-connected users from Chrome storage:', error);
    }
  },

  // Helper method to check if dropdown is loaded
  async waitForDropdown(profileTab, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // First check if dropdown container exists
      const dropdown = profileTab.document.querySelector('div.artdeco-dropdown__content-inner');
      if (dropdown) {
        // Try to find the connect button in dropdown
        const connectButton = dropdown.querySelector('div[aria-label*="Invite"][aria-label*="to connect"]');
        if (connectButton) {
          console.log('✅ Found connect button in dropdown');
          return true;
        }
      }
      console.log(`⏳ Waiting for dropdown to load (attempt ${attempt}/${maxAttempts})...`);
      await this.wait(2000);
    }
    return false;
  },

  // Add new method to send connection requests
  async sendConnectionRequests(users) {
    console.log('\n🤝 STARTING CONNECTION REQUESTS:');
    console.log('=============================');
    
    try {
        console.log(`📊 Processing ${users.length} users to connect`);
        
        if (users.length === 0) {
            console.log('❌ No users provided to process');
            return;
        }

        // Track connection request stats
        const stats = {
            total: users.length,
            sent: 0,
            failed: 0,
            skipped: 0
        };

        // Process each user
        for (const user of users) {
            console.log(`\n👤 Processing user: ${user.name}`);
            console.log(`   URL: ${user.profileUrl}`);
            let profileTab = null;
            try {
                // Open profile in new tab
                profileTab = window.open(user.profileUrl, '_blank');
                if (!profileTab) {
                    console.log('❌ Failed to open profile tab. Please allow popups.');
                    stats.failed++;
                    continue;
                }

                // Wait for profile to load
                console.log('⏳ Waiting for profile to load...');
                await this.waitForProfileLoad(profileTab);
                console.log('✅ Profile loaded');

                // Wait longer for dynamic content
                console.log('⏳ Waiting for dynamic content to load...');
                await this.wait(5000);

                // Update: Use multiple selectors for action area, including '.ph5' as fallback
                const actionAreaSelectors = [
                  '.ph5.pb5',
                  '.ph5', // Added fallback for cases where pb5 is missing
                  '.pv-top-card__actions',
                  'section.pv-top-card',
                  '[data-test-top-card-actions]',
                  'main [class*="actions"]'
                ];

                let actionArea = null;
                let usedSelector = null;
                for (const selector of actionAreaSelectors) {
                  const candidate = profileTab.document.querySelector(selector);
                  if (
                    candidate &&
                    candidate.querySelector('button[aria-label="More actions"]')
                  ) {
                    actionArea = candidate;
                    usedSelector = selector;
                    break;
                  }
                }

                if (actionArea) {
                  console.log(`✅ Found action area with selector: ${usedSelector}`);
                } else {
                  console.log('❌ Could not find a valid action area with any known selector.');
                  stats.failed++;
                  profileTab.close();
                  continue;
                }

                // First try to find the direct connect button
                let connectButton = actionArea.querySelector('button.artdeco-button--primary[aria-label*="Invite"][aria-label*="to connect"]');
                
                if (!connectButton) {
                    console.log('Connect button not found directly, trying More button...');
                    
                    // Try to find and click the More button
                    const moreButton = actionArea.querySelector('button.artdeco-dropdown__trigger[aria-label="More actions"]');
                    if (moreButton) {
                        console.log('Found More button, clicking...');
                        moreButton.click();
                        
                        // Wait for dropdown with retry mechanism
                        let dropdown = null;
                        let retryCount = 0;
                        const maxRetries = 3;

                        while (!dropdown && retryCount < maxRetries) {
                            console.log(`⏳ Waiting for dropdown (attempt ${retryCount + 1}/${maxRetries})...`);
                            await this.wait(2000);
                            
                            dropdown = profileTab.document.querySelector('.artdeco-dropdown__content:not([aria-hidden="true"])');
                            if (!dropdown) {
                                retryCount++;
                                if (retryCount < maxRetries) {
                                    console.log('Dropdown not found, retrying...');
                                    moreButton.click(); // Try clicking again
                                }
                            }
                        }

                        if (!dropdown) {
                            console.log('❌ Dropdown did not appear after multiple attempts');
                            stats.failed++;
                            profileTab.close();
                            continue;
                        }

                        console.log('✅ Dropdown found, looking for connect button...');
                        
                        // Get dropdown content
                        const dropdownContent = dropdown.querySelector('.artdeco-dropdown__content-inner');
                        if (!dropdownContent) {
                            console.log('❌ Dropdown content not found');
                            stats.failed++;
                            profileTab.close();
                            continue;
                        }

                        // Look for connect button in dropdown
                        let connectButtonFound = false;
                        retryCount = 0;

                        while (!connectButtonFound && retryCount < maxRetries) {
                            connectButton = dropdownContent.querySelector('div.artdeco-dropdown__item[aria-label*="Invite"][aria-label*="to connect"]');
                            
                            if (!connectButton) {
                                connectButton = dropdownContent.querySelector('div.artdeco-dropdown__item[role="button"]:has(span:contains("Connect"))');
                            }

                            if (connectButton) {
                                connectButtonFound = true;
                            } else {
                                console.log(`⏳ Waiting for connect button (attempt ${retryCount + 1}/${maxRetries})...`);
                                await this.wait(2000);
                                retryCount++;
                            }
                        }

                        if (!connectButton) {
                            console.log('❌ Connect button not found in dropdown');
                            stats.failed++;
                            profileTab.close();
                            continue;
                        }
                    }
                }

                if (connectButton) {
                    console.log('Found connect button, verifying clickability...');
                    
                    // Verify button is clickable
                    if (connectButton.offsetParent !== null && 
                        !connectButton.disabled && 
                        window.getComputedStyle(connectButton).display !== 'none' &&
                        window.getComputedStyle(connectButton).visibility !== 'hidden') {
                        
                        // Try multiple click methods
                        try {
                            // Method 1: Direct click
                            connectButton.click();
                            console.log('✅ Connect button clicked directly');
                        } catch (clickError) {
                            console.log('⚠️ Direct click failed, trying alternative methods...');
                            
                            try {
                                // Method 2: Event dispatch
                                const clickEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                connectButton.dispatchEvent(clickEvent);
                                console.log('✅ Connect button clicked via event dispatch');
                            } catch (eventError) {
                                console.log('⚠️ Event dispatch failed, trying mousedown/mouseup...');
                                
                                try {
                                    // Method 3: Mousedown/mouseup sequence
                                    connectButton.dispatchEvent(new MouseEvent('mousedown', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window
                                    }));
                                    connectButton.dispatchEvent(new MouseEvent('mouseup', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window
                                    }));
                                    console.log('✅ Connect button clicked via mousedown/mouseup');
                                } catch (mouseError) {
                                    console.log('❌ All click attempts failed');
                                    console.error('Click errors:', {
                                        directClick: clickError,
                                        eventDispatch: eventError,
                                        mouseEvents: mouseError
                                    });
                                    return false;
                                }
                            }
                        }

                        // Wait to see if the connect modal appears
                        await this.wait(3000);
                        const connectModal = profileTab.document.querySelector('.artdeco-modal');
                        if (connectModal) {
                            console.log('✅ Connect modal appeared after click');
                            stats.sent++;
                        } else {
                            console.log('⚠️ No connect modal appeared after click');
                            stats.failed++;
                        }
                    } else {
                        console.log('❌ Connect button found but not clickable');
                        stats.failed++;
                    }
                } else {
                    console.log('❌ Could not find connect button');
                    stats.failed++;
                }
                
                // Close the tab after all operations are complete
                console.log('⏳ Waiting before closing tab...');
                await this.wait(2000);
                profileTab.close();
                
                // Wait between requests
                console.log('⏳ Waiting between requests...');
                await this.wait(5000);

            } catch (error) {
                console.log('⚠️ Issue processing user:', error);
                stats.failed++;
            } finally {
                // Always close the tab and wait before next user
                if (profileTab) {
                    try {
                        console.log('⏳ Waiting before closing tab...');
                        await this.wait(2000);
                        profileTab.close();
                    } catch (closeError) {
                        console.error('⚠️ Error closing tab:', closeError);
                    }
                }
                // Wait between requests
                console.log('⏳ Waiting between requests...');
                await this.wait(8000);
            }
        }

        // Final statistics
        console.log('\n📊 CONNECTION REQUEST STATISTICS:');
        console.log('===============================');
        console.log(`   - Total Users: ${stats.total}`);
        console.log(`   - Requests Sent: ${stats.sent}`);
        console.log(`   - Failed: ${stats.failed}`);
        console.log(`   - Skipped: ${stats.skipped}`);
        console.log('===============================\n');

    } catch (error) {
        console.error('❌ Error in sendConnectionRequests:', error);
    }
  },

  async generateMessage(postContent, reactorInfo) {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected, attempting to connect...');
        this.initWebSocket();
        return null;
      }

      const response = await this.sendWebSocketMessage('generate_message', {
        postContent,
        reactorInfo
      });

      if (response && response.type === 'message_generated') {
        return response.message;
      }
      return null;
    } catch (error) {
      console.error('Error generating message:', error);
      return null;
    }
  },

  // New function to start the connection flow
  async startConnectionFlow(users) {
    console.log('\n🚀 STARTING CONNECTION FLOW:');
    console.log('=============================');
    await this.sendConnectionRequests(users);
  }
};

// Make EngagementUtils available globally
window.EngagementUtils = EngagementUtils;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EngagementUtils;
}