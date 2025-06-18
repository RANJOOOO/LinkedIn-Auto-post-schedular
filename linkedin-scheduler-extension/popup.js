// Helper function to validate LinkedIn URL
function isValidLinkedInUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.linkedin.com' && 
           urlObj.pathname.includes('/in/');
  } catch {
    return false;
  }
}

// User Selection State
let selectedUsers = new Set();
let allUsers = [];

// Add message listener for users found
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in popup:', message);
    
    if (message.type === 'users_found') {
        console.log('Users found:', message.users);
        // Map the data to use profileUrl instead of id and keep all information
        allUsers = message.users.map(user => ({
            ...user, // Preserve all original fields
            name: user.name || '',
            details: user.details || '',
            profileUrl: user.id || user.profileUrl || '',
            postContent: user.postContent || '',
            reactionType: user.reactionType || '',
            savedAt: new Date().toISOString()
        }));
        console.log('Mapped users with full data:', allUsers);
        
        // Display the users in the selection list
        displayUsers(allUsers);
        // Show the user selection section
        const container = document.getElementById('selectedUsersContainer');
        if (container) {
            container.style.display = 'block';
        }
        // Update status
        const statusElement = document.getElementById('engagementStatus');
        if (statusElement) {
            statusElement.textContent = 'Users found and ready for selection';
            statusElement.className = 'status success';
        }
        // Send response back
        sendResponse({ success: true });
    }
    // Return true to indicate we will send a response asynchronously
    return true;
});

// Delegate all checkbox events to document (FIXED)
function initCheckboxDelegation() {
    console.log('=== INITIALIZING CHECKBOX DELEGATION ===');
    // Use document-level delegation to survive DOM changes
    document.addEventListener('change', function(e) {
        console.log('=== CHECKBOX CHANGE EVENT TRIGGERED ===');
        console.log('Event target:', e.target);
        console.log('Event target matches selector:', e.target.matches('#selectedUsersContainer .user-item input[type="checkbox"]'));
        console.log('Event target classList:', e.target.classList);
        console.log('Event target parent elements:', e.target.parentElement);
        
        if (e.target.matches('#selectedUsersContainer .user-item input[type="checkbox"]')) {
            console.log('=== HANDLING CHECKBOX CHANGE ===');
            handleCheckboxChange(e);
        } else {
            console.log('=== CHECKBOX CHANGE IGNORED - SELECTOR MISMATCH ===');
        }
    });
    console.log('=== CHECKBOX DELEGATION INITIALIZED ===');
}

// Unified checkbox change handler (FIXED)
function handleCheckboxChange(e) {
    console.log('=== HANDLING CHECKBOX CHANGE ===');
    const checkbox = e.target;
    const profileUrl = checkbox.dataset.profileUrl;
    
    console.log('Checkbox element:', checkbox);
    console.log('Profile URL from dataset:', profileUrl);
    console.log('Checkbox checked state:', checkbox.checked);
    console.log('Current selectedUsers Set:', Array.from(selectedUsers));
    
    if (!profileUrl) {
        console.error('=== ERROR: Missing profile URL in checkbox dataset ===');
        console.error('Checkbox dataset:', checkbox.dataset);
        console.error('Checkbox attributes:', Array.from(checkbox.attributes).map(attr => `${attr.name}=${attr.value}`));
        return;
    }
    
    if (checkbox.checked) {
        console.log('Adding user to selection:', profileUrl);
        selectedUsers.add(profileUrl);
    } else {
        console.log('Removing user from selection:', profileUrl);
        selectedUsers.delete(profileUrl);
    }
    
    console.log('Updated selectedUsers Set:', Array.from(selectedUsers));
    updateSelectedUsersDisplay();
}

// Display users in the selection list (FIXED)
function displayUsers(users) {
    console.log('=== DISPLAYING USERS ===');
    console.log('Number of users to display:', users.length);
    
    const container = document.getElementById('selectedUsersContainer');
    if (!container) {
        console.error('=== ERROR: Container not found ===');
        return;
    }

    // Save current scroll position
    const scrollTop = container.scrollTop;
    
    // Preserve count element
    const countElement = document.getElementById('selectedUsersCount');
    const countHTML = countElement ? countElement.outerHTML : '';
    
    // Rebuild container content
    container.innerHTML = countHTML;
    
    const userList = document.createElement('div');
    userList.className = 'user-list';
    container.appendChild(userList);

    users.forEach((user, index) => {
        const profileUrl = user.profileUrl || user.id;
        const itemId = `user-${profileUrl}`;
        
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = itemId;
        checkbox.dataset.profileUrl = profileUrl;
        checkbox.checked = selectedUsers.has(profileUrl);
        
        // Add event listener directly to checkbox
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedUsers.add(profileUrl);
            } else {
                selectedUsers.delete(profileUrl);
            }
            updateSelectedUsersDisplay();
        });
        
        const label = document.createElement('label');
        label.htmlFor = itemId;
        
        // Create a container for user details
        const userDetails = document.createElement('div');
        userDetails.className = 'user-details';
        
        // Add name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = user.name || 'Unknown User';
        userDetails.appendChild(nameSpan);
        
        // Add caption/title if available
        if (user.details) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'user-caption';
            detailsDiv.textContent = user.details;
            userDetails.appendChild(detailsDiv);
        }

        userItem.appendChild(checkbox);
        userItem.appendChild(userDetails);
        userList.appendChild(userItem);
    });

    // Restore scroll position
    container.scrollTop = scrollTop;
    updateSelectedUsersDisplay();
}

// Update the display of selected users count
function updateSelectedUsersDisplay() {
    const countElement = document.getElementById('selectedUsersCount');
    if (countElement) {
        countElement.textContent = `${selectedUsers.size} users selected`;
    }
}

// Initialize User Selection Interface
function initializeUserSelection() {
    console.log('Initializing user selection interface...');
    
  const selectAllButton = document.getElementById('selectAllUsers');
  const deselectAllButton = document.getElementById('deselectAllUsers');
  const saveSelectedButton = document.getElementById('saveSelectedUsers');

    if (!selectAllButton || !deselectAllButton || !saveSelectedButton) {
        console.error('Required buttons not found in the DOM');
        return;
    }

    // Initialize event delegation
    initCheckboxDelegation();

  // Select All functionality
  selectAllButton.addEventListener('click', () => {
        console.log('Select all clicked');
        allUsers.forEach(user => {
            selectedUsers.add(user.profileUrl);
        });
        
        // Update UI directly
        document.querySelectorAll('#selectedUsersContainer .user-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
    updateSelectedUsersDisplay();
  });

  // Deselect All functionality
  deselectAllButton.addEventListener('click', () => {
        console.log('Deselect all clicked');
        selectedUsers.clear();
        
        // Update UI directly
        document.querySelectorAll('#selectedUsersContainer .user-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
    updateSelectedUsersDisplay();
  });

    // Save Selection functionality (FIXED)
  saveSelectedButton.addEventListener('click', async () => {
        console.log('=== SAVE SELECTION CLICKED ===');
        console.log('Current selectedUsers Set:', Array.from(selectedUsers));
        console.log('All users count:', allUsers.length);
        
        // Get current selected users directly from state
        const selectedUserData = allUsers.filter(user => {
            const profileUrl = user.profileUrl || user.id;
            const isSelected = selectedUsers.has(profileUrl);
            console.log(`User ${profileUrl} selected:`, isSelected);
            return isSelected;
        });

        console.log('Selected user data to save:', selectedUserData);
        console.log('Number of users to save:', selectedUserData.length);

        if (selectedUserData.length === 0) {
            console.log('=== ERROR: No users selected ===');
            updateStatus('Please first select the user and then click the button', 'error');
            return;
        }

        // Call saveSelectedUsers function with the selected data
        await saveSelectedUsers();
  });
}

// Load saved selected users
async function loadSavedSelectedUsers() {
    console.log('Loading saved selected users');
    try {
        const data = await chrome.storage.local.get(['selectedUsers']);
        if (data.selectedUsers) {
            console.log('Found saved users:', data.selectedUsers);
            
            // Clear existing selections
            selectedUsers.clear();
            
            // Process each saved user
            data.selectedUsers.forEach(user => {
                const profileUrl = user.id || user.profileUrl;
                if (profileUrl) {
                    // Preserve all user data
                    const userData = {
                        name: user.name,
                        details: user.details,
                        profileUrl: profileUrl,
                        postContent: user.postContent || '',
                        reactionType: user.reactionType || '',
                        savedAt: user.savedAt || new Date().toISOString()
                    };
                    
                    console.log('Adding saved user with full data:', userData);
                    selectedUsers.add(profileUrl);
                    
                    // Update allUsers array to include full data
                    const existingUserIndex = allUsers.findIndex(u => u.profileUrl === profileUrl);
                    if (existingUserIndex !== -1) {
                        allUsers[existingUserIndex] = userData;
                    } else {
                        allUsers.push(userData);
                    }
                } else {
                    console.warn('Skipping user with no profile URL:', user);
                }
            });
            
            console.log('Loaded saved users with full data:', allUsers);
            
            // Update the display if users are already loaded
            if (allUsers.length > 0) {
                displayUsers(allUsers);
            }
        }
    } catch (error) {
        console.error('Error loading saved selected users:', error);
        updateStatus('Error loading saved selections', 'error');
    }
}

// Consolidated initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Starting initialization');
    
    // Initialize UI components first
    initializeUserSelection();
    
    // Initialize checkbox delegation
    initCheckboxDelegation();
    
    // Tab Management
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabId = `${tab.dataset.tab}-tab`;
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Initialize save profile URL button
    const saveProfileUrlButton = document.getElementById('saveProfileUrl');
    if (saveProfileUrlButton) {
        console.log('Setting up save profile URL button');
        saveProfileUrlButton.addEventListener('click', async () => {
            try {
                console.log('Save profile URL button clicked');
                await saveProfileUrl();
            } catch (error) {
                console.error('Error saving profile URL:', error);
                const statusElement = document.getElementById('profileStatus');
                statusElement.textContent = 'Error: ' + error.message;
                statusElement.className = 'status error';
            }
        });
    }

    // Load saved profile URL
    console.log('Loading saved profile URL');
    try {
        await loadProfileUrl();
    } catch (error) {
        console.error('Error loading profile URL:', error);
        const statusElement = document.getElementById('profileStatus');
        statusElement.textContent = 'Error loading profile URL';
        statusElement.className = 'status error';
    }

    // Now load users and selections in PROPER ORDER:
    // 1. Load saved selections FIRST
    await loadSavedSelectedUsers();
    
    // 2. Then load user list with enhanced mapping
    const result = await new Promise(resolve => 
        chrome.storage.local.get(['nonConnectedUsers', 'lastUserUpdate'], resolve)
    );
    
    if (result.nonConnectedUsers?.length > 0) {
        console.log('Found stored users:', result.nonConnectedUsers);
        // Enhanced mapping to include all fields while maintaining backward compatibility
        allUsers = result.nonConnectedUsers.map(user => ({
            name: user.name || '',
            details: user.details || '',
            profileUrl: user.id || user.profileUrl || '',
            postContent: user.postContent || '',
            reactionType: user.reactionType || '',
            savedAt: user.savedAt || new Date().toISOString(),
            // Preserve any additional fields that might exist
            ...user
        }));
        
        displayUsers(allUsers);
        
        const container = document.getElementById('selectedUsersContainer');
        if (container) {
            container.style.display = 'block';
        }
        
        const statusElement = document.getElementById('engagementStatus');
        if (statusElement) {
            statusElement.textContent = 'Users found and ready for selection';
            statusElement.className = 'status success';
        }
    }

    // Add engagement tab handling
    const findEngagementsButton = document.getElementById('findEngagements');
    if (findEngagementsButton) {
        console.log('Setting up find engagements button');
        findEngagementsButton.addEventListener('click', async () => {
            try {
                console.log('Find engagements button clicked');
                
                const profileUrl = document.getElementById('profileUrl').value.trim();
                console.log('Profile URL from input:', profileUrl);

                if (!profileUrl) {
                    console.log('No profile URL found in input');
                    const statusElement = document.getElementById('engagementStatus');
                    statusElement.textContent = 'Please save a profile URL first';
                    statusElement.className = 'status error';
                    return;
                }

                console.log('Found profile URL:', profileUrl);
                
                const statusElement = document.getElementById('engagementStatus');
                statusElement.textContent = 'Opening LinkedIn profile...';
                statusElement.className = 'status loading';

                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                if (!tab.url || !tab.url.toLowerCase().includes('linkedin.com')) {
                    console.log('Opening LinkedIn in new tab...');
                    const linkedinTab = await chrome.tabs.create({ 
                        url: profileUrl,
                        active: true 
                    });
                    
                    console.log('New tab created with ID:', linkedinTab.id);
                    
                    let attempts = 0;
                    const maxAttempts = 30;
                    
                    console.log('Starting to wait for content script...');
                    while (attempts < maxAttempts) {
                        try {
                            console.log(`Attempt ${attempts + 1}/${maxAttempts}: Sending ping to content script...`);
                            const response = await chrome.tabs.sendMessage(linkedinTab.id, { action: 'ping' });
                            console.log('Ping response:', response);
                            if (response && response.success) {
                                console.log('Content script is ready');
                                break;
                            }
                        } catch (error) {
                            console.log(`Attempt ${attempts + 1}/${maxAttempts}: Error waiting for content script:`, error);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            attempts++;
                        }
                    }
                    
                    if (attempts >= maxAttempts) {
                        console.error('Failed to initialize content script after', maxAttempts, 'attempts');
                        throw new Error('Content script failed to initialize');
                    }
                    
                    console.log('Sending findRecentPosts message to content script...');
                    chrome.tabs.sendMessage(linkedinTab.id, { action: 'findRecentPosts' }, (response) => {
                        console.log('findRecentPosts response:', response);
                        if (chrome.runtime.lastError) {
                            console.error('Error sending message:', chrome.runtime.lastError);
                            statusElement.textContent = 'Error: ' + chrome.runtime.lastError.message;
                            statusElement.className = 'status error';
                            return;
                        }
                        
                        if (response && response.success) {
                            console.log('Successfully started processing posts');
                            statusElement.textContent = 'Processing posts...';
                            statusElement.className = 'status loading';
                        } else {
                            console.error('Failed to start processing posts:', response);
                            statusElement.textContent = 'Failed to start processing posts';
                            statusElement.className = 'status error';
                        }
                    });
                } else {
                    console.log('Already on LinkedIn, sending findRecentPosts message...');
                    chrome.tabs.sendMessage(tab.id, { action: 'findRecentPosts' }, (response) => {
                        console.log('findRecentPosts response:', response);
                        if (chrome.runtime.lastError) {
                            console.error('Error sending message:', chrome.runtime.lastError);
                            statusElement.textContent = 'Error: ' + chrome.runtime.lastError.message;
                            statusElement.className = 'status error';
                            return;
                        }
                        
                        if (response && response.success) {
                            console.log('Successfully started processing posts');
                            statusElement.textContent = 'Processing posts...';
                            statusElement.className = 'status loading';
                        } else {
                            console.error('Failed to start processing posts:', response);
                            statusElement.textContent = 'Failed to start processing posts';
                            statusElement.className = 'status error';
                        }
                    });
                }
            } catch (error) {
                console.error('Error in find engagements:', error);
                const statusElement = document.getElementById('engagementStatus');
                statusElement.textContent = 'Error: ' + error.message;
                statusElement.className = 'status error';
            }
        });
    }

    // Set up message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Received message in popup:', message);
        
        if (message.type === 'posts_updated') {
            displayScheduledPosts(message.posts);
            sendResponse({ success: true });
        }
        else if (message.type === 'error') {
            showStatus(message.message, true);
            sendResponse({ success: true });
        }
        
        return true;
    });

    // Load scheduled posts when popup opens
    loadScheduledPosts();

    // Add schedule all posts button handler
    const scheduleAllPostsButton = document.getElementById('scheduleAllPosts');
    if (scheduleAllPostsButton) {
        console.log('Setting up schedule all posts button');
        scheduleAllPostsButton.addEventListener('click', async () => {
            try {
                console.log('Schedule all posts button clicked');
                
                const statusElement = document.getElementById('status');
                statusElement.textContent = 'Starting post scheduling...';
                statusElement.className = 'status loading';

                const response = await chrome.runtime.sendMessage({
                    type: 'start_post_scheduling'
                });

                if (response && response.success) {
                    statusElement.textContent = 'Post scheduling started successfully!';
                    statusElement.className = 'status success';
                } else {
                    throw new Error(response?.error || 'Failed to start post scheduling');
                }
            } catch (error) {
                console.error('Error starting post scheduling:', error);
                const statusElement = document.getElementById('status');
                statusElement.textContent = 'Error: ' + error.message;
                statusElement.className = 'status error';
            }
        });
    }
});

// Load Scheduled Posts
async function loadScheduledPosts() {
    try {
        console.log('Popup: Starting to load scheduled posts...');
        const storage = await chrome.storage.local.get(['scheduledPosts', 'queueLength']);
        console.log('Popup: Retrieved from storage:', storage);
        
        const scheduledPosts = storage.scheduledPosts || [];
        console.log('Popup: Number of posts found:', scheduledPosts.length);
        
        if (scheduledPosts.length === 0) {
            console.log('Popup: No posts found in storage, requesting from server...');
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'get_posts' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success) {
                scheduledPostsList.innerHTML = '<p>Loading posts...</p>';
            } else {
                showStatus('Error loading posts: ' + (response?.error || 'Unknown error'), false);
            }
            return;
        }

        console.log('Popup: Displaying posts:', scheduledPosts);
        displayScheduledPosts(scheduledPosts);
    } catch (error) {
        console.error('Popup: Error loading scheduled posts:', error);
        showStatus('Error loading scheduled posts: ' + error.message, false);
    }
}

// Display Scheduled Posts
function displayScheduledPosts(posts) {
    console.log('Popup: Starting to display posts:', posts);
    scheduledPostsList.innerHTML = '';
    
    if (posts.length === 0) {
        console.log('Popup: No posts to display');
        scheduledPostsList.innerHTML = '<p>No scheduled posts</p>';
        return;
    }

    posts.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

    posts.forEach((post, index) => {
        console.log(`Popup: Processing post ${index + 1}:`, post);
        const postElement = document.createElement('div');
        postElement.className = 'post-item';
        
        const scheduledDate = new Date(post.scheduledTime);
        const pakistanTime = new Date(scheduledDate);
        pakistanTime.setHours(pakistanTime.getHours() + 5);
        
        const formattedDate = pakistanTime.toLocaleString('en-US', {
            timeZone: 'Asia/Karachi',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const cleanContent = post.content.replace(/<[^>]*>/g, '').trim();
        
        postElement.innerHTML = `
            <div class="post-content">${cleanContent}</div>
            <div class="post-meta">
                <div class="post-time">${formattedDate}</div>
                <div class="post-status" data-status="${post.status}">${post.status}</div>
            </div>
            ${post.hashtags && post.hashtags.length > 0 ? `
                <div class="post-hashtags">
                    ${post.hashtags.map(tag => `<span class="hashtag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
            ${post.status === 'pending' ? `
                <div class="post-actions">
                    <button class="approve-btn" data-id="${post.postId}">Approve</button>
                    <button class="reject-btn" data-id="${post.postId}">Reject</button>
                </div>
            ` : ''}
        `;
        
        scheduledPostsList.appendChild(postElement);
        console.log(`Popup: Added post ${index + 1} to display`);
    });

    // Add event listeners for approve/reject buttons
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const postId = e.target.dataset.id;
            console.log('Popup: Approve button clicked for post:', postId);
            try {
                await chrome.runtime.sendMessage({
                    action: 'approvePost',
                    postId
                });
                loadScheduledPosts();
                showStatus('Post approved successfully!', true);
            } catch (error) {
                console.error('Popup: Error approving post:', error);
                showStatus('Error approving post: ' + error.message, false);
            }
        });
    });

    document.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const postId = e.target.dataset.id;
            console.log('Popup: Reject button clicked for post:', postId);
            try {
                await chrome.runtime.sendMessage({
                    action: 'rejectPost',
                    postId
                });
                loadScheduledPosts();
                showStatus('Post rejected successfully!', true);
            } catch (error) {
                console.error('Popup: Error rejecting post:', error);
                showStatus('Error rejecting post: ' + error.message, false);
            }
        });
    });
}

// Show Status Message
function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
    }, 3000);
}

// Save profile URL
async function saveProfileUrl() {
    const profileUrl = document.getElementById('profileUrl').value.trim();
    
    if (!profileUrl) {
        updateProfileStatus('Please enter a profile URL', 'error');
        return;
    }

    if (!isValidLinkedInUrl(profileUrl)) {
        updateProfileStatus('Please enter a valid LinkedIn recent activity URL', 'error');
        return;
    }

    try {
        const statusElement = document.getElementById('profileStatus');
        statusElement.textContent = 'Saving profile URL...';
        statusElement.className = 'status loading';

        const response = await chrome.runtime.sendMessage({
            type: 'save_profile_url',
            profileUrl: profileUrl
        });

        if (response && response.success) {
            statusElement.textContent = 'Profile URL saved permanently';
            statusElement.className = 'status success';
            
            const findEngagementsButton = document.getElementById('findEngagements');
            if (findEngagementsButton) {
                findEngagementsButton.disabled = false;
            }
        } else {
            throw new Error(response?.error || 'Failed to save profile URL');
        }
    } catch (error) {
        console.error('Error saving profile URL:', error);
        const statusElement = document.getElementById('profileStatus');
        statusElement.textContent = 'Error: ' + error.message;
        statusElement.className = 'status error';
    }
}

// Load saved profile URL
async function loadProfileUrl() {
    try {
        const statusElement = document.getElementById('profileStatus');
        statusElement.textContent = 'Loading profile URL...';
        statusElement.className = 'status loading';

        const response = await chrome.runtime.sendMessage({
            type: 'get_profile_url'
        });

        if (response && response.success && response.profileUrl) {
            document.getElementById('profileUrl').value = response.profileUrl;
            statusElement.textContent = 'Recent activity URL loaded';
            statusElement.className = 'status success';
            
            const findEngagementsButton = document.getElementById('findEngagements');
            if (findEngagementsButton) {
                findEngagementsButton.disabled = false;
            }
        } else {
            statusElement.textContent = '';
            statusElement.className = 'status';
        }
    } catch (error) {
        console.error('Error loading profile URL:', error);
        const statusElement = document.getElementById('profileStatus');
        statusElement.textContent = 'Error loading profile URL';
        statusElement.className = 'status error';
    }
}

// Update profile status
function updateProfileStatus(message, type) {
    const statusElement = document.getElementById('profileStatus');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
}

// Function to update status
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('engagementStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    } else {
        console.log('engagementStatus element not found');
    }
}

async function saveSelectedUsers() {
    try {
        // Get all data for selected users
        const selectedUsersData = allUsers.filter(user => selectedUsers.has(user.profileUrl))
            .map(user => ({
                ...user, // Preserve all original fields
                name: user.name || '',
                details: user.details || '',
                profileUrl: user.profileUrl || '',
                postContent: user.postContent || '',
                reactionType: user.reactionType || '',
                savedAt: new Date().toISOString()
            }));
        
        // Save to chrome storage
        await chrome.storage.local.set({ selectedUsers: selectedUsersData });
        
        console.log('Saved selected users with full data:', selectedUsersData);
        showStatus('Selected users saved successfully!', false);

        // Send message to background script with selected users data
        chrome.runtime.sendMessage({ type: 'users_selected', users: selectedUsersData });
    } catch (error) {
        console.error('Error saving selected users:', error);
        showStatus('Error saving selected users', true);
    }
} 