// LinkedIn Automation Content Script

// Check if script is already injected
if (window.linkedinSchedulerInjected) {
  console.log('LinkedIn Scheduler already injected, skipping...');
} else {
  window.linkedinSchedulerInjected = true;
  console.log('🚀 LinkedIn Scheduler initializing...');

  // Function to ensure EngagementUtils is initialized
  async function ensureEngagementUtils() {
    if (window.EngagementUtils) {
      return window.EngagementUtils;
    }

    // Wait for EngagementUtils to be available
    const startTime = Date.now();
    const timeout = 10000; // 10 seconds timeout
    
    while (Date.now() - startTime < timeout) {
      if (window.EngagementUtils) {
        console.log('✅ EngagementUtils is available');
        return window.EngagementUtils;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('EngagementUtils not available after timeout');
  }

  // Add message listener for engagement utils messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.type === 'start_connection_flow') {
      console.log('Starting connection flow with users:', message.users);
      
      // Use async IIFE to handle the async wait
      (async () => {
        try {
          const engagementUtils = await ensureEngagementUtils();
          // Now that EngagementUtils is available, start the connection flow
          await engagementUtils.startConnectionFlow(message.users);
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error in connection flow:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      
      return true; // Keep the message channel open for async response
    }
    
    if (message.type === 'users_found') {
      console.log('Content script forwarding users to background:', message.users);
      // Forward the message to the background script
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to background:', chrome.runtime.lastError);
        } else {
          console.log('Message forwarded to background successfully');
        }
      });
    }
  });

  // Wait for CalendarUtils to be available
  async function waitForCalendarUtils(timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (window.CalendarUtils) {
        console.log('✅ CalendarUtils is available');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('CalendarUtils not available after timeout');
  }

  // Scheduling Module
  class SchedulingModule {
    constructor() {
      this.isInitialized = false;
    }

    async initialize() {
      if (this.isInitialized) return;
      
      try {
        await waitForCalendarUtils();
        this.isInitialized = true;
        console.log('✅ Scheduling Module initialized');
      } catch (error) {
        console.error('❌ Scheduling Module initialization failed:', error);
        throw error;
      }
    }

    async schedulePosts(posts) {
      try {
        for (const post of posts) {
          await this.schedulePost(post);
        }
      } catch (error) {
        console.error('Error scheduling posts:', error);
        throw error;
      }
    }

    async schedulePost(post) {
      try {
        const startPostButton = await this.waitForElement([
          'button[aria-label="Start a post"]',
          'button[aria-label="Create a post"]'
        ]);
        startPostButton.click();
        console.log("clicked on start post button");
        await this.wait(2000);

        const editor = await this.waitForElement([
          '.ql-editor',
          '[data-placeholder="What do you want to talk about?"]',
          '.share-box__input',
          '.share-box__input--textarea',
          '[role="textbox"]'
        ]);
        editor.textContent = post.content;
        await this.wait(1000);

        const scheduleBtn = await this.waitForElement([
          'button[aria-label="Schedule post"]',
          'button[aria-label="Schedule"]'
        ]);
        scheduleBtn.click();
        await this.wait(2000);

        await this.selectDate(post.scheduledTime);
        
        const finalScheduleBtn = await this.waitForElement([
          'button.share-actions__primary-action',
          'button[aria-label="Schedule"]',
          'button[aria-label="Schedule post"]'
        ]);
        finalScheduleBtn.click();
        await this.wait(2000);

        return true;
      } catch (error) {
        console.error('Error scheduling post:', error);
        throw error;
      }
    }

    async selectDate(scheduledTime) {
      try {
        const targetDate = new Date(scheduledTime);
        
        const dateInput = await this.waitForElement([
          'input[aria-label="Date"]',
          '#share-post__scheduled-date'
        ]);
        dateInput.click();
        await this.wait(2000);

        await this.navigateToMonth(targetDate);
        
        const dayCell = await this.waitForElement(
          `.artdeco-calendar__day:not(.artdeco-calendar__day--disabled):not(.artdeco-calendar__day--outside-month)[data-day="${targetDate.getDate()}"]`
        );
        dayCell.click();
        await this.wait(2000);

        const timeInput = await this.waitForElement([
          'input[aria-label="Time"]',
          '#share-post__scheduled-time'
        ]);
        timeInput.click();
        await this.wait(1000);

        const timeOption = await this.waitForElement(
          `[data-time="${targetDate.getHours()}:${targetDate.getMinutes()}"]`
        );
        timeOption.click();
        await this.wait(1000);

        return true;
      } catch (error) {
        console.error('Error selecting date:', error);
        throw error;
      }
    }

    async navigateToMonth(targetDate) {
      const currentMonth = document.querySelector('.artdeco-calendar__month');
      if (!currentMonth) throw new Error('Calendar month element not found');

      const [currentMonthText, currentYear] = currentMonth.textContent.split(' ');
      const currentMonthIndex = new Date(`${currentMonthText} 1, ${currentYear}`).getMonth();
      const targetMonthIndex = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      const monthsDiff = (targetYear - parseInt(currentYear)) * 12 + (targetMonthIndex - currentMonthIndex);
      
      for (let i = 0; i < Math.abs(monthsDiff); i++) {
        const button = monthsDiff > 0 ? 
          document.querySelector('[data-calendar-next-month]') :
          document.querySelector('[data-calendar-prev-month]');
        
        if (!button) throw new Error('Month navigation button not found');
        
        button.click();
        await this.wait(1000);
      }
    }

    async waitForElement(selectors, timeout = 10000) {
      const startTime = Date.now();
      const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

      while (Date.now() - startTime < timeout) {
        for (const selector of selectorArray) {
          const element = document.querySelector(selector);
          if (element) {
            return element;
          }
        }
        await this.wait(500);
      }
      throw new Error(`Element not found: ${selectorArray.join(', ')}`);
    }

    async wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Engagement Module
  class EngagementModule {
    constructor() {
      this.isInitialized = false;
    }

    async initialize() {
      if (this.isInitialized) return;
      
      try {
        await this.waitForEngagementUtils();
        await window.EngagementUtils.initialize();
        this.isInitialized = true;
        console.log('✅ Engagement Module initialized with EngagementUtils');
      } catch (error) {
        console.error('❌ Engagement Module initialization failed:', error);
        throw error;
      }
    }

    async waitForEngagementUtils(timeout = 10000) {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (window.EngagementUtils) {
          console.log('✅ EngagementUtils is available');
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('EngagementUtils not available after timeout');
    }
  }

  // LinkedIn Scheduler
  class LinkedInScheduler {
    constructor() {
      this.schedulingModule = null;
      this.engagementModule = null;
      this.isInitialized = false;
    }

    async initialize() {
      console.log('🚀 Initializing LinkedIn Scheduler...');
      
      this.schedulingModule = new SchedulingModule();
      this.engagementModule = new EngagementModule();
      
      await Promise.all([
        this.schedulingModule.initialize(),
        this.engagementModule.initialize()
      ]);
      
      console.log('✅ LinkedIn Scheduler initialized successfully');
      
      if (window.location.pathname.includes('/recent-activity/')) {
        console.log('📱 On recent activity page, waiting for page load...');
        await this.waitForPageLoad();
        console.log('✅ Page fully loaded, starting engagement process...');
        await this.startEngagementProcess();
      } else {
        console.log('ℹ️ Not on recent activity page, engagement process will not start automatically');
      }
    }

    async waitForPageLoad() {
      console.log('⏳ Waiting for page to be fully loaded...');
      
      await this.waitForElement([
        '.scaffold-finite-scroll',
        '.scaffold-layout__main',
        '.scaffold-layout__content'
      ]);
      console.log('✅ Main content container found');
      
      await this.waitForPosts();
      console.log('✅ Initial content loaded');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    async waitForPosts(timeout = 30000) {
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const posts = document.querySelectorAll([
          '.feed-shared-update-v2',
          '.update-components-actor',
          '.activity-item'
        ].join(','));
        
        if (posts.length > 0) {
          console.log(`✅ Found ${posts.length} items`);
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      throw new Error('Timeout waiting for content to load');
    }

    async waitForElement(selectors, timeout = 10000) {
      const startTime = Date.now();
      const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
      
      while (Date.now() - startTime < timeout) {
        for (const selector of selectorArray) {
          const element = document.querySelector(selector);
          if (element) {
            return element;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      throw new Error(`Element not found: ${selectorArray.join(', ')}`);
    }

    async startEngagementProcess() {
      console.log('🎯 Starting engagement process...');
      
      try {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
          if (window.EngagementUtils) {
            console.log('✅ EngagementUtils found, initializing...');
            await window.EngagementUtils.initialize();
            break;
          }
          
          console.log(`⏳ Waiting for EngagementUtils (attempt ${attempts + 1}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        if (!window.EngagementUtils) {
          throw new Error('EngagementUtils not found after maximum attempts');
        }
        
        console.log('🔍 Starting to find recent posts...');
        const result = await window.EngagementUtils.findRecentPosts();
        
        if (result.success) {
          console.log(`✅ Found ${result.stats.totalPosts} posts with ${result.stats.uniqueReactors} unique reactors`);
          
          if (result.stats.totalPosts > 0) {
            console.log('🔄 Starting to process all posts...');
            await window.EngagementUtils.processAllPosts();
          }
        } else {
          console.error('❌ Failed to find recent posts:', result.error);
        }

      } catch (error) {
        console.error('❌ Error in engagement process:', error);
      }
    }
  }

  // Initialize the scheduler when the page loads
  const scheduler = new LinkedInScheduler();
  scheduler.initialize().catch(error => {
    console.error('Failed to initialize LinkedIn Scheduler:', error);
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request);
    
    if (request.action === 'ping') {
      console.log('✅ Content script responding to ping');
      sendResponse({ success: true, status: 'ready' });
      return true;
    }
    
    (async () => {
      try {
        switch (request.action) {
          case 'createPost':
            console.log('📝 Creating post...');
            const result = await PostCreator.createPost(request.postData);
            console.log('✅ Post creation result:', result);
            sendResponse(result);
            break;
            
          case 'findRecentPosts':
            console.log('🔍 Starting to find recent posts...');
            console.log('Checking EngagementUtils availability:', !!window.EngagementUtils);
            console.log('EngagementUtils state:', window.EngagementUtils ? {
              isInitialized: window.EngagementUtils.isInitialized,
              hasFindRecentPosts: typeof window.EngagementUtils.findRecentPosts === 'function'
            } : 'not available');
            
            if (!window.EngagementUtils) {
              console.error('❌ EngagementUtils not available');
              sendResponse({ success: false, error: 'EngagementUtils not initialized' });
              return;
            }
            
            if (!window.EngagementUtils.isInitialized) {
              console.log('⏳ Initializing EngagementUtils...');
              try {
                await window.EngagementUtils.initialize();
                console.log('✅ EngagementUtils initialized successfully');
              } catch (error) {
                console.error('❌ Failed to initialize EngagementUtils:', error);
                sendResponse({ success: false, error: 'Failed to initialize EngagementUtils' });
                return;
              }
            }
            
            console.log('🔍 Starting to find recent posts...');
            try {
              const posts = await window.EngagementUtils.findRecentPosts();
              console.log('✅ Found posts:', posts);
              sendResponse({ success: true, posts });
            } catch (error) {
              console.error('❌ Error finding posts:', error);
              sendResponse({ success: false, error: error.message });
            }
            break;
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  });
} 