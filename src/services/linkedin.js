// linkedin.js
const linkedinService = {
  async postToLinkedIn(postData) {
    try {
      // Open LinkedIn in a new tab
      const tab = await chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
      
      // Wait for the page to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Inject the content script to create the post
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: createLinkedInPost,
        args: [postData]
      });

      if (result[0].result.success) {
        // Close the tab after a delay
        setTimeout(() => chrome.tabs.remove(tab.id), 5000);
        return { success: true, postUrl: result[0].result.postUrl };
      } else {
        throw new Error(result[0].result.error);
      }
    } catch (error) {
      console.error('Error posting to LinkedIn:', error);
      return { success: false, error: error.message };
    }
  },

  async sendConnectionRequest(userId) {
    try {
      // Open LinkedIn profile in a new tab
      const tab = await chrome.tabs.create({ url: `https://www.linkedin.com/in/${userId}` });
      
      // Wait for the page to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Inject the content script to send connection request
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: sendConnectionRequest
      });

      // Close the tab after a delay
      setTimeout(() => chrome.tabs.remove(tab.id), 5000);

      return result[0].result;
    } catch (error) {
      console.error('Error sending connection request:', error);
      return { success: false, error: error.message };
    }
  },

  async sendFollowUpMessage(userId, message) {
    try {
      // Open LinkedIn messaging in a new tab
      const tab = await chrome.tabs.create({ url: `https://www.linkedin.com/messaging/thread/${userId}` });
      
      // Wait for the page to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Inject the content script to send message
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: sendMessage,
        args: [message]
      });

      // Close the tab after a delay
      setTimeout(() => chrome.tabs.remove(tab.id), 5000);

      return result[0].result;
    } catch (error) {
      console.error('Error sending follow-up message:', error);
      return { success: false, error: error.message };
    }
  }
};

// Function that will be injected into the LinkedIn page
function createLinkedInPost(postData) {
  return new Promise((resolve) => {
    // Find the post creation button and click it
    const createPostButton = document.querySelector('[data-control-name="create_post"]');
    if (createPostButton) {
      createPostButton.click();
      
      // Wait for the post creation modal
      setTimeout(() => {
        // Find the post content area
        const postContentArea = document.querySelector('[data-placeholder="What do you want to talk about?"]');
        if (postContentArea) {
          // Fill in the content
          postContentArea.textContent = postData.content;
          
          // If there are hashtags, add them
          if (postData.hashtags && postData.hashtags.length > 0) {
            const hashtagsText = postData.hashtags.map(tag => `#${tag}`).join(' ');
            postContentArea.textContent += `\n\n${hashtagsText}`;
          }
          
          // Find and click the post button
          const postButton = document.querySelector('[data-control-name="share.post"]');
          if (postButton) {
            postButton.click();
            
            // Wait for post to be created and get the URL
            setTimeout(() => {
              const postUrl = window.location.href;
              resolve({ success: true, postUrl });
            }, 3000);
          } else {
            resolve({ success: false, error: 'Post button not found' });
          }
        } else {
          resolve({ success: false, error: 'Post content area not found' });
        }
      }, 2000);
    } else {
      resolve({ success: false, error: 'Create post button not found' });
    }
  });
}

function sendConnectionRequest() {
  return new Promise((resolve) => {
    const connectButton = document.querySelector('[data-control-name="connect"]');
    if (connectButton) {
      connectButton.click();
      setTimeout(() => {
        const sendButton = document.querySelector('[data-control-name="send_now"]');
        if (sendButton) {
          sendButton.click();
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'Send button not found' });
        }
      }, 1000);
    } else {
      resolve({ success: false, error: 'Connect button not found' });
    }
  });
}

function sendMessage(message) {
  return new Promise((resolve) => {
    const messageInput = document.querySelector('[data-placeholder="Write a message..."]');
    if (messageInput) {
      messageInput.textContent = message;
      const sendButton = document.querySelector('[data-control-name="send_message"]');
      if (sendButton) {
        sendButton.click();
        resolve({ success: true });
      } else {
        resolve({ success: false, error: 'Send button not found' });
      }
    } else {
      resolve({ success: false, error: 'Message input not found' });
    }
  });
}

export default linkedinService;