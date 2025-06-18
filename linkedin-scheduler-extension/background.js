// WebSocket connection configuration
const WS_URL = 'ws://localhost:5000';
let ws = null;
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;
const BATCH_SIZE = 10; // Number of posts to process at once
const CHECK_INTERVAL = 60000; // Check every minute
const ENGAGEMENT_CHECK_INTERVAL = 300000; // 5 minutes in milliseconds

// Service Worker initialization
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      initializeExtension()
    ]).catch(error => {
      console.error('Error during service worker installation:', error);
      return Promise.resolve();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      clients.claim()
    ]).catch(error => {
      console.log('Error during service worker activation:', error);
      return Promise.resolve();
    })
  );
});

// Handle service worker errors
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
  event.preventDefault();
  return true;
});

self.addEventListener('unhandledrejection', (event) => {
  console.log('Unhandled promise rejection:', {
    reason: event.reason,
    stack: event.reason?.stack || 'No stack trace available'
  });
  
  // If it's a WebSocket error, try to reconnect
  if (event.reason instanceof DOMException && event.reason.name === 'NetworkError') {
    console.log('Attempting to reconnect WebSocket...');
    initializeWebSocket().catch(error => {
      console.log('Failed to reconnect WebSocket:', error);
    });
  }
  
  event.preventDefault();
  return true;
});

// Initialize extension state
async function initializeExtension() {
  try {
    // Initialize storage
    await chrome.storage.local.set({
      hasPermission: false,
      connectionStatus: {
        connected: false,
        message: 'Initializing...'
      }
    });
    
    console.log('Extension initialized successfully');
    return Promise.resolve();
  } catch (error) {
    console.log('Error initializing extension:', error);
    return Promise.resolve();
  }
}

// Initialize WebSocket connection
async function initializeWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    try {
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        isReconnecting = false;
        reconnectAttempts = 0;
        resolve();
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        resolve(); // Resolve instead of reject to prevent unhandled rejections
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
        if (!isReconnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          isReconnecting = true;
          setTimeout(() => {
            reconnectAttempts++;
            initializeWebSocket().catch(() => {
              // Ignore errors during reconnection
              return Promise.resolve();
            });
          }, RECONNECT_DELAY);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);
          
          switch (message.type) {
            case 'users_selected':
              handleUserSelection(message.selectedUsers);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      resolve(); // Resolve instead of reject to prevent unhandled rejections
    }
  });
}

// Handle user selection
async function handleUserSelection(selectedUsers) {
  try {
    if (!selectedUsers || selectedUsers.length === 0) {
      console.log('No users selected');
      return;
    }
    
    console.log('Handling selected users:', selectedUsers);
    
    await chrome.storage.local.set({
      selectedUsers: selectedUsers,
      lastSelectionUpdate: new Date().toISOString()
    });
    
    console.log('Selected users stored successfully');
  } catch (error) {
    console.error('Error handling user selection:', error);
  }

}

// MongoDB ObjectId implementation
class ObjectId {
  constructor(id) {
    if (id) {
      if (typeof id === 'string') {
        if (id.length === 24) {
          this.id = id;
        } else {
          throw new Error('Invalid ObjectId string');
        }
      } else {
        throw new Error('Invalid ObjectId type');
      }
    } else {
      // Generate a new ObjectId
      const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
      const random = Math.random().toString(16).substr(2, 16).padStart(16, '0');
      this.id = timestamp + random;
    }
  }

  toString() {
    return this.id;
  }
}

// Store pending posts that need user permission
let pendingPosts = new Map();
let postQueue = []; // Queue for posts to be processed

// Add date validation function at the top level
function isDateWithinAllowedRange(targetDate) {
  const now = new Date();
  const maxDate = new Date(now.getFullYear(), now.getMonth() + 3, 31);
  return targetDate >= now && targetDate <= maxDate;
}

// Helper function to safely send messages to popup
function sendMessageToPopup(message) {
  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        // Only log if it's not the "popup not open" error
        if (!chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
          console.log('Error sending message to popup:', chrome.runtime.lastError.message);
        }
      } else if (response) {
        console.log('Popup response:', response);
      }
    });
  } catch (error) {
    console.log('Error sending message to popup:', error);
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize WebSocket connection immediately
    connectWebSocket();

    // Check if there's a saved URL in sync storage
    const data = await chrome.storage.sync.get('linkedinProfileUrl');
    if (data.linkedinProfileUrl) {
      console.log('Found saved profile URL:', data.linkedinProfileUrl);
    }

    // Show permission request notification
    chrome.notifications.create('permission_request', {
      type: 'basic',
      title: 'LinkedIn Scheduler Permission',
      message: 'Please allow the extension to schedule posts on LinkedIn. Click to grant permission.',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      priority: 2,
      requireInteraction: true,
      silent: false
    });

    // Store initial permission state
    await chrome.storage.local.set({ 
      hasPermission: false,
      connectionStatus: {
        connected: true,
        message: 'Connected to server, waiting for LinkedIn permission'
      }
    });
  }
});

// Helper function to safely execute scripts
async function safeExecuteScript(tabId, func, args = []) {
  try {
    // First check if we have the necessary permissions
    const permissions = await chrome.permissions.getAll();
    if (!permissions.permissions.includes('scripting')) {
      throw new Error('Missing scripting permission');
    }

    // Check if tab exists and is accessible
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    // Execute the script
    const results = await chrome.scripting.executeScript({
            target: { tabId },
      func,
      args
    });

    return results[0]?.result;
  } catch (error) {
    console.error('Error executing script:', error);
    throw error;
  }
}

// Enhanced helper function to wait for element with better error handling
async function waitForElement(tabId, selectors, maxAttempts = 30, interval = 2000) {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    let attempts = 0;

  while (attempts < maxAttempts) {
      try {
      const result = await safeExecuteScript(tabId, (sels) => {
            for (const sel of sels) {
              const element = document.querySelector(sel);
              if (element) {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                if (style.display !== 'none' && 
                    style.visibility !== 'hidden' && 
                    style.opacity !== '0' &&
                    element.offsetParent !== null &&
                    rect.width > 0 &&
                    rect.height > 0 &&
                    !element.disabled &&
                    !element.readOnly) {
                  return true;
                }
              }
            }
            return false;
      }, [selectorArray]);

      if (result) {
        return true;
      }

          attempts++;
          console.log(`Elements not found or not interactive, attempt ${attempts}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`Error checking elements:`, error);
          attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw new Error(`Elements not found or not interactive after ${maxAttempts} attempts`);
}

// Enhanced page load check
async function waitForPageLoad(tabId, maxRetries = 5) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const result = await safeExecuteScript(tabId, () => {
        return document.readyState === 'complete' && 
               document.querySelector('body') !== null &&
               (document.querySelector('button[aria-label="Start a post"]') ||
                document.querySelector('button[aria-label="Create a post"]') ||
                document.querySelector('.share-box-feed-entry__wrapper') ||
                document.querySelector('.feed-shared-update-v2'));
      });

      if (result) {
        return true;
      }

      retries++;
      console.log(`Page not fully loaded, retry ${retries}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (error) {
      console.error('Error checking page load:', error);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  throw new Error('Page load timeout after ' + (maxRetries * 10) + ' seconds');
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === 'permission_request') {
    try {
      await handlePostScheduling();
    } catch (error) {
      console.error('Error handling permission request:', error);
    }
  }
});

// Connect to WebSocket server
function connectWebSocket() {
  if (isReconnecting) {
    console.log('Reconnection already in progress');
    return;
  }

  isReconnecting = true;
  console.log('Connecting to WebSocket server...');

  ws = new WebSocket(WS_URL);

  ws.onopen = async () => {
    console.log('WebSocket connected');
    isReconnecting = false;
    reconnectAttempts = 0;
    
    // Send any pending user selection
    const data = await chrome.storage.local.get(['pendingUserSelection']);
    if (data.pendingUserSelection) {
      ws.send(JSON.stringify({
        type: 'user_selection',
        selectedUsers: data.pendingUserSelection
      }));
      // Clear pending selection after sending
      await chrome.storage.local.remove(['pendingUserSelection']);
    }

    // Update connection status in storage
    chrome.storage.local.get(['hasPermission'], (result) => {
      const hasPermission = result?.hasPermission || false;
    chrome.storage.local.set({ 
      connectionStatus: {
        connected: true,
          message: hasPermission ? 
            'Connected to server, LinkedIn permission granted' : 
            'Connected to server, waiting for LinkedIn permission'
      }
      });
    });

    // Request posts after connection
    ws.send(JSON.stringify({ type: 'get_posts' }));
  };

  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);

      // Validate message structure
      if (!message.type) {
        throw new Error('Invalid message format: missing type');
      }

      switch (message.type) {
        case 'posts_list':
          if (!Array.isArray(message.posts)) {
            throw new Error('Invalid posts list format');
          }
          
          console.log('Received posts:', message.posts);
          // Validate and process posts
          const validPosts = message.posts.map(post => {
            try {
              // Keep the original MongoDB _id if it exists
              const postId = post._id || new ObjectId().toString();
              return {
            ...post,
                _id: postId,
            title: post.title || 'Untitled Post',
            status: post.status || 'scheduled'
              };
            } catch (error) {
              console.error('Error processing post:', error);
              return null;
            }
          }).filter(Boolean); // Remove any null entries from failed processing
          
          // Store posts in queue
          postQueue = validPosts;
          // Store in Chrome storage
          await chrome.storage.local.set({ 
            scheduledPosts: validPosts,
            queueLength: validPosts.length
          });
          
          // Notify popup if it's open
          sendMessageToPopup({
            type: 'posts_updated',
            posts: validPosts
          });
          
          // Check for due posts immediately
          checkForDuePosts();
          break;

        case 'error':
          console.error('Server error:', message.error);
          // Handle specific error types
          if (message.error.includes('Post not found')) {
            // Get the post ID from the error message
            const postId = message.error.match(/Post not found: (.+)/)?.[1];
            if (postId) {
              console.log('Removing non-existent post:', postId);
              // Remove the post from the queue if it doesn't exist on the server
              postQueue = postQueue.filter(post => post._id !== postId);
              // Update storage
          await chrome.storage.local.set({ 
                scheduledPosts: postQueue,
                queueLength: postQueue.length
          });
              // Notify popup
          sendMessageToPopup({
                type: 'posts_updated',
                posts: postQueue
          });
            }
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      // Store error in storage
      await chrome.storage.local.set({ 
        lastError: {
          message: 'Error processing server message',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    isReconnecting = false;
    
    // Update connection status in storage
    chrome.storage.local.set({ 
      connectionStatus: {
        connected: false,
        message: 'Disconnected from server'
      }
    });

    // Attempt to reconnect
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(connectWebSocket, RECONNECT_DELAY);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    isReconnecting = false;
  };
}

// Initialize WebSocket connection
connectWebSocket();

// Check for due posts
async function checkForDuePosts() {
  try {
    console.log('Checking for due posts...');
    const now = Date.now();
    
    // Get posts from storage
    const storage = await chrome.storage.local.get(['scheduledPosts']);
    const posts = storage.scheduledPosts || [];
    
    // Filter due posts
    const duePosts = posts.filter(post => {
      if (!post || !post.scheduledTime) {
        console.log('Invalid post data:', post);
        return false;
      }
      
      const scheduledTime = new Date(post.scheduledTime).getTime();
      const isDue = scheduledTime <= now;
      const isScheduled = post.status === 'scheduled';
      console.log(`Post ${post._id}: Scheduled time: ${scheduledTime}, Now: ${now}, Is due: ${isDue}, Status: ${post.status}`);
      return isDue && isScheduled;
    });

    if (duePosts.length > 0) {
      console.log('Found due posts:', duePosts.length);
      
      // Process each due post
      for (const post of duePosts) {
        try {
          // Calculate new time (1 hour from current time)
          const now = new Date();
          const nextAvailableTime = new Date(now.getTime() + (60 * 60 * 1000));
          
          // If next day, set to 9 AM
          if (nextAvailableTime.getDate() !== now.getDate()) {
            nextAvailableTime.setHours(9, 0, 0, 0);
          }

          // Update post with new time
          const index = postQueue.findIndex(p => p._id === post._id);
          if (index !== -1) {
            postQueue[index].scheduledTime = nextAvailableTime.toISOString();
            postQueue[index].originalScheduledTime = post.scheduledTime;
            postQueue[index].status = 'rescheduled';
            postQueue[index].rescheduled = true;
          }

          // Update server about rescheduling
          ws.send(JSON.stringify({
            type: 'post_rescheduled',
            postId: post._id,
            originalTime: post.scheduledTime,
            newTime: nextAvailableTime.toISOString(),
            reason: 'Post automatically rescheduled to 1 hour from current time'
          }));

          // Show notification about automatic rescheduling
          chrome.notifications.create(`rescheduled_${post._id}`, {
        type: 'basic',
            title: 'Post Automatically Rescheduled',
            message: `Post "${post.title || 'Untitled Post'}" has been automatically rescheduled to ${nextAvailableTime.toLocaleString()} (1 hour from now).`,
            iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            silent: false
          });

          // Wait for server confirmation
          await new Promise((resolve) => {
            const messageHandler = (event) => {
              const response = JSON.parse(event.data);
              if (response.type === 'post_rescheduled_confirmed' && response.postId === post._id) {
                ws.removeEventListener('message', messageHandler);
                resolve();
              }
            };
            ws.addEventListener('message', messageHandler);
          });

          // Open LinkedIn and schedule the post
        const tab = await chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
        await new Promise(resolve => setTimeout(resolve, 5000));

          // Create the post with new time
            const result = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: createLinkedInPost,
            args: [{
              ...post,
              scheduledTime: nextAvailableTime.toISOString()
            }]
            });

            if (result[0].result.success) {
              // Update post status
              const index = postQueue.findIndex(p => p._id === post._id);
              if (index !== -1) {
                postQueue[index].status = 'completed';
                postQueue[index].postUrl = result[0].result.postUrl;
              }

              // Update server
              ws.send(JSON.stringify({
                type: 'post_status',
                postId: post._id,
                status: 'completed',
              postUrl: result[0].result.postUrl,
              rescheduled: true,
              originalTime: post.scheduledTime
              }));

              // Show success notification
            chrome.notifications.create(`success_${post._id}`, {
                type: 'basic',
              title: 'Post Scheduled Successfully',
              message: `Post "${post.title || 'Untitled Post'}" has been automatically rescheduled and posted.`,
              iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
              silent: false
              });
          }

          // Close the tab after a delay
          setTimeout(() => chrome.tabs.remove(tab.id), 10000);

          } catch (error) {
          console.error('Error processing due post:', error);
          chrome.notifications.create(`error_${post._id}`, {
              type: 'basic',
            title: 'Error Processing Post',
            message: `Failed to process post "${post.title || 'Untitled Post'}": ${error.message}`,
              iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            silent: false
            });
          }
        }

      // Update storage with new post times
      await chrome.storage.local.set({ 
        scheduledPosts: postQueue,
        queueLength: postQueue.length
      });
    }
  } catch (error) {
    console.error('Error checking due posts:', error);
  }
}

// Check for due posts more frequently (every minute)
setInterval(checkForDuePosts, 60000); // Check every minute

// Helper function to calculate next available scheduling time
function calculateNextAvailableTime() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour from now
  
  // If the calculated time is in the next day, adjust to start of next day
  if (oneHourFromNow.getDate() !== now.getDate()) {
    oneHourFromNow.setHours(9, 0, 0, 0); // Set to 9 AM next day
  }
  
  return oneHourFromNow;
}

// Enhanced notification click handler
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId.startsWith('posts_')) {
    if (buttonIndex === 0) { // Schedule Now
      try {
        // Get all pending posts
        const postsToProcess = Array.from(pendingPosts.values());
        if (postsToProcess.length === 0) return;

      // Open LinkedIn in a new tab
      const tab = await chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
      
      // Wait for the page to load
      await new Promise(resolve => setTimeout(resolve, 5000));

        // Process posts one by one
        for (const post of postsToProcess) {
          try {
            // Check if the original scheduled time has passed
            const originalTime = new Date(post.scheduledTime);
            const now = new Date();
            
            if (originalTime <= now) {
              // Calculate next available time (1 hour from now)
              const nextAvailableTime = calculateNextAvailableTime();
              
              // Update post with new time
              post.scheduledTime = nextAvailableTime.toISOString();
              
              // Update in queue
              const index = postQueue.findIndex(p => p._id === post._id);
              if (index !== -1) {
                postQueue[index].scheduledTime = nextAvailableTime.toISOString();
                postQueue[index].originalScheduledTime = originalTime.toISOString(); // Store original time
                postQueue[index].rescheduled = true;
              }

              // Update server about rescheduling
              ws.send(JSON.stringify({
                type: 'post_rescheduled',
                postId: post._id,
                originalTime: originalTime.toISOString(),
                newTime: nextAvailableTime.toISOString(),
                reason: 'Post rescheduled to 1 hour from current time'
              }));

              // Show rescheduling notification
              chrome.notifications.create(`rescheduled_${post._id}`, {
                type: 'basic',
                title: 'Post Rescheduled',
                message: `Post "${post.title || 'Untitled Post'}" has been rescheduled to ${nextAvailableTime.toLocaleString()} (1 hour from now).`,
                iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                silent: false
              });

              // Wait for server confirmation before proceeding
              await new Promise((resolve) => {
                const messageHandler = (event) => {
                  const response = JSON.parse(event.data);
                  if (response.type === 'post_rescheduled_confirmed' && response.postId === post._id) {
                    ws.removeEventListener('message', messageHandler);
                    resolve();
                  }
                };
                ws.addEventListener('message', messageHandler);
              });
            }

      // Inject the content script to create the post
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: createLinkedInPost,
              args: [post]
      });

      if (result[0].result.success) {
        // Update post status
              const index = postQueue.findIndex(p => p._id === post._id);
        if (index !== -1) {
          postQueue[index].status = 'completed';
          postQueue[index].postUrl = result[0].result.postUrl;
        }

        // Remove from pending
              pendingPosts.delete(post._id);

        // Update server
        ws.send(JSON.stringify({
          type: 'post_status',
                postId: post._id,
          status: 'completed',
                postUrl: result[0].result.postUrl,
                rescheduled: post.rescheduled || false,
                originalTime: post.originalScheduledTime || post.scheduledTime
        }));

        // Show success notification
              chrome.notifications.create(`success_${post._id}`, {
          type: 'basic',
                title: 'Post Scheduled Successfully',
                message: `Post "${post.title || 'Untitled Post'}" has been scheduled${post.rescheduled ? ' (rescheduled)' : ''}.`,
                iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                silent: false
              });
            }
    } catch (error) {
            console.error('Error processing post:', error);
      // Show error notification
            chrome.notifications.create(`error_${post._id}`, {
        type: 'basic',
              title: 'Error Scheduling Post',
              message: `Failed to schedule post "${post.title || 'Untitled Post'}": ${error.message}`,
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
              silent: false
      });
    }
  }
      } catch (error) {
        console.error('Error handling posts:', error);
      }
    } else if (buttonIndex === 1) { // Schedule Later
      // Update post status to rescheduled
      const postsToProcess = Array.from(pendingPosts.values());
      postsToProcess.forEach(post => {
        const index = postQueue.findIndex(p => p._id === post._id);
    if (index !== -1) {
          postQueue[index].status = 'rescheduled';
          postQueue[index].notificationSent = false; // Reset notification flag
          
          // Calculate next available time (1 hour from now)
          const nextAvailableTime = calculateNextAvailableTime();
          postQueue[index].scheduledTime = nextAvailableTime.toISOString();
          postQueue[index].originalScheduledTime = post.scheduledTime; // Store original time
          postQueue[index].rescheduled = true;
        }
      });

    // Update storage
    await chrome.storage.local.set({ 
      scheduledPosts: postQueue,
      queueLength: postQueue.length
    });

      // Clear pending posts
      pendingPosts.clear();

      // Show rescheduled notification
      chrome.notifications.create('rescheduled', {
        type: 'basic',
        title: 'Posts Rescheduled',
        message: `All pending posts have been rescheduled to 1 hour from now.`,
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        silent: false
      });
    }
  }
});

// Handle notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  const postId = notificationId.replace('post_', '');
  const postData = pendingPosts.get(postId);

  if (postData) {
    // Open the extension popup to review the post
    chrome.windows.create({
      url: `popup.html?postId=${postId}`,
      type: 'popup',
      width: 400,
      height: 600
    });
  }
});

// Handle due post
async function handleDuePost(data) {
  try {
    // Open LinkedIn in a new tab
    const tab = await chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
    if (!tab || !tab.id) {
      throw new Error('Failed to create LinkedIn tab');
    }
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
    // Inject the content script to create the post
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: createLinkedInPost,
      args: [data]
    });

      if (!result || !result[0] || !result[0].result) {
        throw new Error('Failed to execute script');
      }

    if (result[0].result.success) {
        // First update local storage
        const storage = await chrome.storage.local.get(['scheduledPosts']);
        const posts = storage.scheduledPosts || [];
        const updatedPosts = posts.map(post => {
          if (post._id === data.postId) {
            return {
              ...post,
              status: 'completed',
              postUrl: result[0].result.postUrl
            };
          }
          return post;
        });

        // Update storage
        await chrome.storage.local.set({ scheduledPosts: updatedPosts });

        // Update queue
        const index = postQueue.findIndex(p => p._id === data.postId);
        if (index !== -1) {
          postQueue[index].status = 'completed';
          postQueue[index].postUrl = result[0].result.postUrl;
        }

        // Then update server via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'post_status',
        postId: data.postId,
        status: 'completed',
        postUrl: result[0].result.postUrl
      }));
        }

        // Notify popup if it's open
        sendMessageToPopup({
          type: 'posts_updated',
          posts: updatedPosts
        });

      // Schedule engagement check after 5 minutes
      setTimeout(() => {
        checkPostEngagement(data.postId, result[0].result.postUrl);
      }, ENGAGEMENT_CHECK_INTERVAL);

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        title: 'Post Published',
        message: 'Your LinkedIn post has been published successfully!',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      });

        // Close the LinkedIn tab after successful posting
        await chrome.tabs.remove(tab.id);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error handling due post:', error);
    // Update status to error in local storage
    const storage = await chrome.storage.local.get(['scheduledPosts']);
    const posts = storage.scheduledPosts || [];
    const updatedPosts = posts.map(post => {
      if (post._id === data.postId) {
        return {
          ...post,
          status: 'error',
      error: error.message
        };
      }
      return post;
    });
    await chrome.storage.local.set({ scheduledPosts: updatedPosts });
    
    // Notify popup of the error
    sendMessageToPopup({
      type: 'posts_updated',
      posts: updatedPosts
    });
  }
}

// Check post engagement after 5 minutes
async function checkPostEngagement(postId, postUrl) {
  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: postUrl });
    if (!tab || !tab.id) {
      throw new Error('Failed to create tab for engagement check');
    }
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
    // Get engagement metrics
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getPostEngagement
    });

      if (!result || !result[0] || !result[0].result) {
        throw new Error('Failed to get engagement metrics');
      }

      // Update engagement in database
      ws.send(JSON.stringify({
        type: 'engagement_update',
        postId,
        engagement: result[0].result
      }));

      // Process engagers
      for (const engager of result[0].result.engagers) {
        await processEngager(postId, engager);
      }
    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      ws.send(JSON.stringify({
        type: 'engagement_error',
        postId,
        error: error.message
      }));
    }
  } catch (error) {
    console.error('Error checking engagement:', error);
    ws.send(JSON.stringify({
      type: 'engagement_error',
      postId,
      error: error.message
    }));
  } finally {
    // Close the tab
    if (tab && tab.id) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (error) {
        console.error('Error closing engagement check tab:', error);
      }
    }
  }
}

// Helper function to round time to next 15 minutes
function roundToNearest15Minutes(date) {
  const minutes = date.getMinutes();
  // Calculate minutes to add to reach next 15-minute mark
  const minutesToAdd = 15 - (minutes % 15);
  const newDate = new Date(date);
  newDate.setMinutes(minutes + minutesToAdd);
  return newDate;
}

// Add improved month navigation function
const navigateToTargetMonth = async (targetMonth, targetYear) => {
  const currentMonthElement = document.querySelector('.artdeco-calendar__month');
  if (!currentMonthElement) {
    throw new Error('Calendar month element not found');
  }

  const [currentMonth, currentYear] = currentMonthElement.textContent.split(' ');
  console.log(`Current calendar month: ${currentMonth} ${currentYear}`);
  
  const currentMonthIndex = new Date(`${currentMonth} 1, ${currentYear}`).getMonth();
  const targetMonthIndex = targetMonth;

  // If we're in the same month and year, no need to navigate
  if (currentMonthIndex === targetMonthIndex && parseInt(currentYear) === targetYear) {
    console.log('Already in target month, no navigation needed');
    return;
  }

  const monthsDiff = (targetYear - parseInt(currentYear)) * 12 + (targetMonthIndex - currentMonthIndex);
  console.log(`Need to navigate ${Math.abs(monthsDiff)} months ${monthsDiff > 0 ? 'forward' : 'backward'}`);

  const nextButton = document.querySelector('button.artdeco-button.artdeco-button--1.artdeco-button--tertiary.artdeco-button--circle.artdeco-calendar__next-month[data-calendar-next-month]');
  const prevButton = document.querySelector('button.artdeco-button.artdeco-button--1.artdeco-button--tertiary.artdeco-button--circle.artdeco-calendar__prev-month[data-calendar-prev-month]');

  for (let i = 0; i < Math.abs(monthsDiff); i++) {
    const button = monthsDiff > 0 ? nextButton : prevButton;
    if (!button || button.getAttribute('aria-disabled') === 'true') {
      throw new Error('Cannot navigate to target month - button disabled or not found');
    }
    console.log(`Clicking ${monthsDiff > 0 ? 'next' : 'previous'} month button...`);
    
    // Use multiple click methods to ensure the click is registered
    button.click();
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 100));
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.focus();
    await new Promise(resolve => setTimeout(resolve, 100));
    button.click();
    
    // Wait for calendar to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify navigation
    const newMonthElement = document.querySelector('.artdeco-calendar__month');
    if (newMonthElement) {
      const [newMonth, newYear] = newMonthElement.textContent.split(' ');
      console.log(`Navigated to: ${newMonth} ${newYear}`);
    }
  }
};

// Function to select target date
const selectTargetDate = async (targetDay) => {
  console.log(`Looking for day ${targetDay} in calendar...`);
  
  // Wait for calendar to be fully loaded
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // First, ensure we're in the calendar view
  const calendarContainer = document.querySelector('.artdeco-calendar') || 
                          document.querySelector('[role="dialog"]');
  
  if (!calendarContainer) {
    throw new Error('Calendar container not found');
  }
  
  // Get the current month and year from the header
  const monthHeader = document.querySelector('.artdeco-calendar__month');
  if (!monthHeader) {
    throw new Error('Calendar month header not found');
  }
  
  console.log('Current calendar month:', monthHeader.textContent);
  
  // Get all day cells in the calendar grid
  const dayCells = Array.from(document.querySelectorAll('.artdeco-calendar__day'));
  console.log(`Found ${dayCells.length} day cells in calendar`);
  
  // Find the target day cell
  const targetCell = dayCells.find(cell => {
    const dayText = cell.textContent.trim();
    const dayNum = parseInt(dayText, 10);
    
    if (dayNum !== targetDay) {
      return false;
    }
    
    const isDisabled = cell.hasAttribute('disabled') ||
                      cell.getAttribute('aria-disabled') === 'true' ||
                      cell.classList.contains('artdeco-calendar__day--disabled') ||
                      cell.classList.contains('artdeco-calendar__day--outside-month');
    
    return !isDisabled;
  });
  
  if (!targetCell) {
    throw new Error(`Could not find selectable date for day ${targetDay}`);
  }
  
  console.log(`Found selectable date for day ${targetDay}, attempting to click...`);
  
  // Click the target cell
  targetCell.click();
  targetCell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 500));
  targetCell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  targetCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  
  // Wait for selection to register
  await new Promise(resolve => setTimeout(resolve, 2000));
};

// Helper function to click date button with multiple methods
const clickDateButton = async (element) => {
  try {
    // Ensure the element is in view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to find a clickable element within the cell if the cell itself isn't clickable
    const clickableElement = element.tagName === 'BUTTON' ? element : 
                           element.querySelector('button') || element;
    
    // Method 1: Direct click
    clickableElement.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Method 2: Mouse events
    const mouseEvents = ['mousedown', 'mouseup', 'click'];
    for (const eventType of mouseEvents) {
      clickableElement.dispatchEvent(new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true
      }));
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Method 3: Focus and click
    clickableElement.focus();
    await new Promise(resolve => setTimeout(resolve, 500));
    clickableElement.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Method 4: Programmatic click with all possible event types
    const eventTypes = ['click', 'mousedown', 'mouseup', 'mouseover', 'mouseenter'];
    for (const eventType of eventTypes) {
      clickableElement.dispatchEvent(new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true
      }));
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('Multiple click attempts completed, waiting for selection to register...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify selection
    const selectedDate = document.querySelector('.artdeco-calendar__day--selected') ||
                        document.querySelector('[aria-selected="true"]');
    if (!selectedDate) {
      throw new Error('Date selection not verified');
    }
    
    return true;
  } catch (error) {
    console.error('Error during date selection:', error);
    throw error;
  }
};

// Update the createLinkedInPost function
function createLinkedInPost(data) {
  return new Promise((resolve) => {
    // Check if permission is granted
    chrome.storage.local.get(['hasPermission'], async (result) => {
      if (!result.hasPermission) {
        resolve({ 
          success: false, 
          error: 'LinkedIn permission not granted. Please grant permission to schedule posts.' 
        });
        return;
      }
          
      console.log('Starting post creation process...');
      
      try {
        // First, find and click the "Start a post" button using multiple methods
        const startPostButton = Array.from(document.querySelectorAll('button')).find(button => 
          button.textContent.includes('Start a post') ||
          button.textContent.includes('Create a post')
        ) || document.querySelector('button[aria-label="Start a post"]') ||
           document.querySelector('button[aria-label="Create a post"]');
        
        if (!startPostButton) {
          throw new Error('Could not find "Start a post" button');
        }
        
        console.log('Found "Start a post" button, clicking...');
        startPostButton.click();
        
        // Wait for modal to appear and enter content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Find the text editor element with multiple selectors and retries
        let editor = null;
        let editorAttempts = 0;
        const maxEditorAttempts = 5;
        
        while (!editor && editorAttempts < maxEditorAttempts) {
          editor = document.querySelector('.ql-editor') || 
                  document.querySelector('[data-placeholder="What do you want to talk about?"]') ||
                  document.querySelector('.share-box__input') ||
                  document.querySelector('.share-box__input--textarea') ||
                  document.querySelector('[role="textbox"]') ||
                  document.querySelector('.share-box__input--textarea');
          
          if (!editor) {
            console.log(`Attempt ${editorAttempts + 1}: Text editor not found, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            editorAttempts++;
          }
        }
        
        if (!editor) {
          throw new Error('Text editor not found after multiple attempts');
        }
        
        console.log('Found text editor, setting content...');
        editor.textContent = data.content;
        
        // If there are hashtags, add them
        if (data.hashtags && data.hashtags.length > 0) {
          const hashtagsText = data.hashtags.map(tag => `#${tag}`).join(' ');
          editor.textContent += `\n\n${hashtagsText}`;
        }
        
        // Wait for content to be set
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find and click the schedule button with multiple selectors
        const scheduleBtn = document.querySelector('button[aria-label="Schedule post"]') ||
                             document.querySelector('button[aria-label="Schedule"]') ||
                             Array.from(document.querySelectorAll('button')).find(button => 
                               button.textContent.includes('Schedule')
                             );
        
        if (!scheduleBtn) {
          throw new Error('Schedule button not found');
        }
        
        console.log('Found schedule button, clicking...');
        scheduleBtn.click();

        // Wait for scheduling modal to appear
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Find and click the date input field with multiple selectors
        const dateInputField = document.querySelector('input[aria-label="Date"]') || 
                         document.querySelector('#share-post__scheduled-date') ||
                         Array.from(document.querySelectorAll('input')).find(input => 
                           input.getAttribute('aria-label')?.includes('Date')
                         );
        
        if (!dateInputField) {
          throw new Error('Date input field not found');
        }

        console.log('Found date input field, focusing...');
        dateInputField.focus();
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Clicking date input field...');
        dateInputField.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Validate date is within allowed range
        const targetDate = new Date(data.scheduledTime);
        const currentDate = new Date();
        const maxAllowedDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 31);
        
        if (targetDate < currentDate || targetDate > maxAllowedDate) {
          throw new Error('Selected date is outside LinkedIn\'s allowed scheduling range (current month + 3 months)');
          }

        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        const targetDay = targetDate.getDate();

        console.log(`Target date: ${targetMonth + 1}/${targetDay}/${targetYear}`);
        console.log('Starting calendar navigation...');
          
        // Check if CalendarUtils is available
        if (typeof window.CalendarUtils === 'undefined') {
          throw new Error('Calendar navigation utilities not found. Please ensure the extension is properly loaded.');
        }

        // Use the injected calendar utilities
        try {
          await window.CalendarUtils.navigateToTargetMonth(targetMonth, targetYear);
        console.log('Calendar navigation complete, selecting date...');
          await window.CalendarUtils.selectTargetDate(targetDay);
        console.log('Date selection complete');
        
          // Add extra wait time after date selection
          await new Promise(resolve => setTimeout(resolve, 5000));
        
          // Use CalendarUtils for time operations
          console.log('Starting time selection...');
          await window.CalendarUtils.selectTime(targetDate);
          console.log('Time selection complete');
          
        } catch (error) {
          console.error('Calendar navigation error:', error);
          throw new Error(`Calendar navigation failed: ${error.message}`);
        }
        
        // Wait 1 second after time selection
        console.log('Waiting 1 second after time selection...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find and click the Next button
        const nextBtn = document.querySelector('button[aria-label="Next"]');
        if (!nextBtn) {
            throw new Error('Next button not found');
        }
        
        console.log('Found Next button, clicking...');
        nextBtn.click();
        
        // Wait for the transition back to post content screen
        console.log('Waiting for transition back to post content screen...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Wait for and find the final schedule button
        console.log('Looking for final Schedule button...');
        let finalScheduleBtn = null;
        let scheduleAttempts = 0;
        const maxScheduleAttempts = 10;

        while (!finalScheduleBtn && scheduleAttempts < maxScheduleAttempts) {
            finalScheduleBtn = document.querySelector('button.share-actions__primary-action') || 
                                document.querySelector('button[aria-label="Schedule"]') || 
                                document.querySelector('button[aria-label="Schedule post"]') ||
                                Array.from(document.querySelectorAll('button')).find(button => 
                                    button.textContent.trim() === 'Schedule'
                                );
            
            if (!finalScheduleBtn) {
                console.log(`Attempt ${scheduleAttempts + 1}: Final Schedule button not found, waiting...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                scheduleAttempts++;
            }
        }

        if (!finalScheduleBtn) {
            throw new Error('Final Schedule button not found after multiple attempts');
        }
        
        console.log('Found final Schedule button, clicking...');
        
        // Try multiple click methods for the final button
        try {
            // Method 1: Direct click
            finalScheduleBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Method 2: Mouse events
            finalScheduleBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
            finalScheduleBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
            finalScheduleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));

            // Method 3: Focus and click
            finalScheduleBtn.focus();
            await new Promise(resolve => setTimeout(resolve, 500));
            finalScheduleBtn.click();
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('Multiple click attempts completed for final Schedule button');
        } catch (error) {
            console.error('Error clicking final Schedule button:', error);
            throw error;
        }

        // Wait for scheduling to complete
        console.log('Waiting for scheduling to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('Post scheduled successfully!');
        resolve({ success: true, message: 'Post scheduled successfully' });
        
      } catch (error) {
        console.error('Error scheduling post:', error);
        resolve({ success: false, error: error.message });
      }
    });
  });
}

// Get post engagement metrics
function getPostEngagement() {
  return new Promise((resolve) => {
    const engagement = {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      engagers: []
    };

    // Get likes count
    const likesElement = document.querySelector('[data-control-name="like"]');
    if (likesElement) {
      engagement.likes = parseInt(likesElement.textContent) || 0;
    }

    // Get comments count
    const commentsElement = document.querySelector('[data-control-name="comment"]');
    if (commentsElement) {
      engagement.comments = parseInt(commentsElement.textContent) || 0;
    }

    // Get shares count
    const sharesElement = document.querySelector('[data-control-name="share"]');
    if (sharesElement) {
      engagement.shares = parseInt(sharesElement.textContent) || 0;
    }

    // Get views count
    const viewsElement = document.querySelector('[data-control-name="view"]');
    if (viewsElement) {
      engagement.views = parseInt(viewsElement.textContent) || 0;
    }

    // Get engagers
    const engagerElements = document.querySelectorAll('[data-control-name="actor"]');
    engagerElements.forEach(element => {
      const profileUrl = element.href;
      const type = element.closest('[data-control-name="like"], [data-control-name="comment"], [data-control-name="share"]')
        ?.getAttribute('data-control-name') || 'like';
      
      engagement.engagers.push({ profileUrl, type });
    });

    resolve(engagement);
  });
}

// Process new engager
async function processEngager(postId, engager) {
  try {
    // Notify database about new engager
    ws.send(JSON.stringify({
      type: 'new_engager',
      postId,
      profileUrl: engager.profileUrl,
      engagementType: engager.type
    }));

    // Send connection request
    const tab = await chrome.tabs.create({ url: engager.profileUrl });
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Send connection request
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: sendConnectionRequest
    });

    if (result[0].result.success) {
      // Wait for connection acceptance
      await new Promise(resolve => setTimeout(resolve, 300000)); // Wait 5 minutes

      // Send follow-up message
      const messageResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: sendFollowUpMessage,
        args: [engager.type]
      });

      if (messageResult[0].result.success) {
        ws.send(JSON.stringify({
          type: 'engager_update',
          postId,
          profileUrl: engager.profileUrl,
          connectionStatus: 'accepted',
          followUpStatus: 'sent'
        }));
      }
    }

    // Close the tab
    chrome.tabs.remove(tab.id);
  } catch (error) {
    console.error('Error processing engager:', error);
  }
}

// Send connection request
function sendConnectionRequest() {
  return new Promise((resolve) => {
    const connectButton = document.querySelector('[data-control-name="connect"]');
    if (connectButton) {
      connectButton.click();
      
      // Wait for modal and click "Add a note"
      setTimeout(() => {
        const addNoteButton = document.querySelector('[data-control-name="add_connection_note"]');
        if (addNoteButton) {
          addNoteButton.click();
          
          // Add personalized message
          setTimeout(() => {
            const messageInput = document.querySelector('[data-control-name="message"]');
            if (messageInput) {
              messageInput.value = generateConnectionMessage();
              messageInput.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Send request
              const sendButton = document.querySelector('[data-control-name="send"]');
              if (sendButton) {
                sendButton.click();
                resolve({ success: true });
              } else {
                resolve({ success: false, error: 'Send button not found' });
              }
            } else {
              resolve({ success: false, error: 'Message input not found' });
            }
          }, 1000);
        } else {
          resolve({ success: false, error: 'Add note button not found' });
        }
      }, 1000);
    } else {
      resolve({ success: false, error: 'Connect button not found' });
    }
  });
}

// Send follow-up message
function sendFollowUpMessage(engagementType) {
  return new Promise((resolve) => {
    const messageButton = document.querySelector('[data-control-name="message"]');
    if (messageButton) {
      messageButton.click();
      
      // Wait for message input
      setTimeout(() => {
        const messageInput = document.querySelector('[data-control-name="message"]');
        if (messageInput) {
          messageInput.value = generateFollowUpMessage(engagementType);
          messageInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Send message
          const sendButton = document.querySelector('[data-control-name="send"]');
          if (sendButton) {
            sendButton.click();
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Send button not found' });
          }
        } else {
          resolve({ success: false, error: 'Message input not found' });
        }
      }, 1000);
    } else {
      resolve({ success: false, error: 'Message button not found' });
    }
  });
}

// Generate connection message
function generateConnectionMessage() {
  const messages = [
    "I noticed we share an interest in [topic]. Would love to connect and discuss more!",
    "Your recent post about [topic] was insightful. Would be great to connect!",
    "I'm also passionate about [topic]. Let's connect and share ideas!",
    "Your experience in [field] is impressive. Would love to connect!",
    "I enjoyed reading your article about [topic]. Let's connect!"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Generate follow-up message
function generateFollowUpMessage(engagementType) {
  const messages = {
    like: [
      "Thanks for liking my post! I'd love to hear your thoughts on the topic.",
      "I appreciate your like on my recent post. Would you like to discuss this further?",
      "Thanks for the like! I'm curious about your perspective on this topic."
    ],
    comment: [
      "Thanks for your comment! I'd love to continue this discussion.",
      "I appreciate your thoughtful comment. Would you like to explore this topic more?",
      "Thanks for engaging with my post! Let's connect and discuss further."
    ],
    share: [
      "Thanks for sharing my post! I'm glad you found it valuable.",
      "I appreciate you sharing my content. Would you like to collaborate on similar topics?",
      "Thanks for the share! I'd love to hear what resonated with you."
    ]
  };
  
  const typeMessages = messages[engagementType] || messages.like;
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}

// Schedule a post
async function schedulePost(postData) {
  const alarmName = `post_${postData.id}`;
  
  // Create alarm for the post
  await chrome.alarms.create(alarmName, {
    when: postData.scheduledTime
  });

  // Store the post data with the alarm
  await chrome.storage.local.set({
    [alarmName]: postData
  });
}

// Cancel a scheduled post
async function cancelPost(postId) {
  const alarmName = `post_${postId}`;
  
  // Clear the alarm
  await chrome.alarms.clear(alarmName);
  
  // Remove the stored post data
  await chrome.storage.local.remove(alarmName);
}

// Track post engagement
async function trackPostEngagement(postUrl) {
  try {
    // Open LinkedIn in a new tab
    const tab = await chrome.tabs.create({ url: postUrl });
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Inject the content script
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: 'trackPostEngagement', postUrl },
            (response) => resolve(response)
          );
        });
      }
    });

    // Close the tab after a delay
    setTimeout(() => chrome.tabs.remove(tab.id), 5000);

    return result[0].result;
  } catch (error) {
    console.error('Error in trackPostEngagement:', error);
    throw error;
  }
} 

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // Always send a response to prevent message channel from hanging
  const sendErrorResponse = (error) => {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  };

  try {
    // Handle different message types
    switch (message.type) {
      case 'users_selected':
        console.log('Users selected:', message.users);
        
        // Forward the message to the active tab's content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'start_connection_flow',
              users: message.users
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log('Error sending message to content script:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                console.log('Content script response:', response);
                sendResponse(response);
              }
            });
          } else {
            console.error('No active tab found');
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true; // Keep the message channel open for async response

      case 'save_profile_url':
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'save_profile_url',
            profileUrl: message.profileUrl
          }));
          
          // Set up one-time message handler for the response
          const messageHandler = (event) => {
            const response = JSON.parse(event.data);
            if (response.type === 'profile_url_saved') {
              ws.removeEventListener('message', messageHandler);
              sendResponse({ success: true });
            } else if (response.type === 'error') {
              ws.removeEventListener('message', messageHandler);
              sendResponse({ success: false, error: response.message });
            }
          };
          
          ws.addEventListener('message', messageHandler);
          return true; // Keep the message channel open for async response
        } else {
          sendResponse({ success: false, error: 'WebSocket not connected' });
        }
        break;

      case 'get_profile_url':
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'get_profile_url'
          }));
          
          // Set up one-time message handler for the response
          const messageHandler = (event) => {
            const response = JSON.parse(event.data);
            if (response.type === 'profile_url_retrieved') {
              ws.removeEventListener('message', messageHandler);
              sendResponse({ 
                success: true, 
                profileUrl: response.profileUrl,
                savedAt: response.savedAt
              });
            } else if (response.type === 'error') {
              ws.removeEventListener('message', messageHandler);
              sendResponse({ success: false, error: response.message });
            }
          };
          
          ws.addEventListener('message', messageHandler);
          return true; // Keep the message channel open for async response
        } else {
          sendResponse({ success: false, error: 'WebSocket not connected' });
        }
        break;

      case 'start_post_scheduling':
        handlePostScheduling()
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response

      case 'users_found':
        console.log('Background script received users_found message with users:', message.users);
        try {
          // Store the users in chrome.storage.local with the same key as content script
          chrome.storage.local.set({ 
            nonConnectedUsers: message.users,
            lastUserUpdate: new Date().toISOString()
          }, () => {
            console.log('Users stored in background storage');
            // Try to send to popup if it's open
            chrome.runtime.sendMessage(message).catch(error => {
              // Ignore the error if popup is not open
              console.log('Popup not open, users stored for later retrieval');
            });
          });
          return true;
        } catch (error) {
          console.error('Error handling users_found message:', error);
          return false;
        }

      default:
        console.log('Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
        return false;
    }
  } catch (error) {
    sendErrorResponse(error);
  }
  return true; // Keep the message channel open
}); 

// Extract the post scheduling logic into a reusable function
async function handlePostScheduling() {
  try {
    // Get all posts that need scheduling
    const storage = await chrome.storage.local.get(['scheduledPosts']);
    const posts = storage.scheduledPosts || [];
    const postsToSchedule = posts.filter(post => post.status === 'scheduled');

    if (postsToSchedule.length === 0) {
      chrome.notifications.create('no_posts', {
        type: 'basic',
        title: 'No Posts to Schedule',
        message: 'There are no posts that need scheduling at this time.',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        silent: false
      });
      return;
    }

    // Open LinkedIn to get permission and schedule posts
    const tab = await chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
    
    // Wait for page to load and LinkedIn elements
    await waitForPageLoad(tab.id);
    await waitForElement(tab.id, [
      'button[aria-label="Start a post"]',
      'button[aria-label="Create a post"]',
      '.share-box-feed-entry__wrapper',
      '.feed-shared-update-v2'
    ]);

    // Update permission state
    await chrome.storage.local.set({ 
      hasPermission: true,
      connectionStatus: {
        connected: true,
        message: 'Connected to server, LinkedIn permission granted'
      }
    });

    // Show permission granted notification
    chrome.notifications.create('permission_granted', {
      type: 'basic',
      title: 'Permission Granted',
      message: 'Starting to schedule posts...',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      silent: false
    });

    // Schedule posts one by one
    let successCount = 0;
    let errorCount = 0;

    for (const post of postsToSchedule) {
      try {
        // Wait for post creation button
        await waitForElement(tab.id, '#ember36');
        
        // Create the post
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: createLinkedInPost,
          args: [post]
        });

        if (result[0].result.success) {
          // Update post status
          const index = postQueue.findIndex(p => p._id === post._id);
          if (index !== -1) {
            postQueue[index].status = 'completed';
            postQueue[index].postUrl = result[0].result.postUrl;
          }

          // Update server
          ws.send(JSON.stringify({
            type: 'post_status',
            postId: post._id,
            status: 'completed',
            postUrl: result[0].result.postUrl
          }));

          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error('Error scheduling post:', post._id, error);
      }
    }

    // Show completion notification
    chrome.notifications.create('scheduling_complete', {
      type: 'basic',
      title: 'Post Scheduling Complete',
      message: `Successfully scheduled ${successCount} posts. ${errorCount > 0 ? `${errorCount} posts failed.` : ''}`,
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      silent: false
    });

    // Close the tab after delay
    setTimeout(() => chrome.tabs.remove(tab.id), 5000);

  } catch (error) {
    console.error('Error handling post scheduling:', error);
    chrome.notifications.create('permission_error', {
      type: 'basic',
      title: 'Error',
      message: error.message || 'An error occurred while scheduling posts. Please try again.',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      silent: false
    });
    throw error;
  }
} 