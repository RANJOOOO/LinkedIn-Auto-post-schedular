// Helper function to validate LinkedIn URL
function isValidLinkedInUrl(url) 
{
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('linkedin.com') && 
           urlObj.pathname.includes('/in/');
  } catch {
    return false;
  }
}

// User Selection State - only for UI selection, not storage
let selectedUsers = new Set();

// Load users from background script
async function loadUsersFromBackground() {
  try {
    console.log('Popup: Requesting users from background script...');
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'get_all_users' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    if (response && response.success) {
      console.log('Popup: Received users from background:', response.users);
      displayUsers(response.users);
      
        const container = document.getElementById('selectedUsersContainer');
        if (container) {
            container.style.display = 'block';
        }
      
        const statusElement = document.getElementById('engagementStatus');
        if (statusElement) {
        statusElement.textContent = `${response.users.length} users available for selection`;
            statusElement.className = 'status success';
        }
    } else {
      console.error('Popup: Failed to get users from background:', response?.error);
      updateStatus('Error loading users: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Popup: Error loading users from background:', error);
    updateStatus('Error loading users: ' + error.message, 'error');
  }
}

// Add message listener for user updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'users_updated') {
    console.log('[MANUAL-USER-POPUP] Received users_updated from background:', message);
    displayUsers(message.users);
    
    const statusElement = document.getElementById('engagementStatus');
    if (statusElement) {
      const sourceText = message.source === 'linkedin' ? 'LinkedIn' : 
                        message.source === 'excel' ? 'Excel' : 
                        message.source === 'manual' ? 'Manual' : 'Unknown';
      statusElement.textContent = `Added ${message.addedCount} new users from ${sourceText} (${message.totalCount} total users available)`;
      statusElement.className = 'status success';
    }
    
        sendResponse({ success: true });
    }
  
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

// Display users in the selection list (UPDATED for centralized approach)
function displayUsers(users) {
    console.log('[MANUAL-USER-POPUP] displayUsers called. Users:', users);
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

    // Show manual add user form if users are present
    const manualAddUserForm = document.getElementById('manualAddUserForm');
    if (manualAddUserForm) {
        manualAddUserForm.style.display = users.length > 0 ? 'flex' : 'none';
    }
}

// Update the display of selected users count
function updateSelectedUsersDisplay() {
    const countElement = document.getElementById('selectedUsersCount');
    if (countElement) {
        countElement.textContent = `${selectedUsers.size} users selected`;
    }
}

// Initialize User Selection Interface (UPDATED for centralized approach)
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

    // Select All functionality (UPDATED)
    selectAllButton.addEventListener('click', async () => {
        console.log('Select all clicked');
        try {
            // Get all users from background script
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'get_all_users' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success) {
                // Select all users
                response.users.forEach(user => {
                    const profileUrl = user.profileUrl || user.id;
                    if (profileUrl) {
                        selectedUsers.add(profileUrl);
                    }
        });
        
        // Update UI directly
        document.querySelectorAll('#selectedUsersContainer .user-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
    updateSelectedUsersDisplay();
            }
        } catch (error) {
            console.error('Error selecting all users:', error);
        }
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

    // Save Selection functionality (UPDATED)
  saveSelectedButton.addEventListener('click', async () => {
        console.log('=== SAVE SELECTION CLICKED ===');
        console.log('Current selectedUsers Set:', Array.from(selectedUsers));
        
        if (selectedUsers.size === 0) {
            console.log('=== ERROR: No users selected ===');
            updateStatus('Please first select the user and then click the button', 'error');
            return;
        }

        try {
            // Get all users from background script to get full user data
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'get_all_users' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success) {
                // Get selected user data
                const selectedUserData = response.users.filter(user => {
                    const profileUrl = user.profileUrl || user.id;
                    return selectedUsers.has(profileUrl);
                }).map(user => ({
                    name: user.name || '',
                    details: user.details || '',
                    profileUrl: user.profileUrl || user.id || '',
                        postContent: user.postContent || '',
                        reactionType: user.reactionType || '',
                        savedAt: user.savedAt || new Date().toISOString()
                }));

                console.log('Selected user data to save:', selectedUserData);
                console.log('Number of users to save:', selectedUserData.length);

                // Call saveSelectedUsers function with the selected data
                await saveSelectedUsers(selectedUserData);
                    } else {
                throw new Error(response?.error || 'Failed to get users from background');
            }
        } catch (error) {
            console.error('Error saving selected users:', error);
            updateStatus('Error saving selected users: ' + error.message, 'error');
        }
    });
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
    // This part is now handled by loadUsersFromBackground
    // await loadSavedSelectedUsers(); 
    
    // 2. Then load user list with enhanced mapping
    // This part is now handled by loadUsersFromBackground
    // const result = await new Promise(resolve => 
    //     chrome.storage.local.get(['nonConnectedUsers', 'lastUserUpdate'], resolve)
    // );
    
    // if (result.nonConnectedUsers?.length > 0) {
    //     console.log('Found stored users:', result.nonConnectedUsers);
    //     console.log('Current allUsers before loading stored users:', allUsers);
        
    //     // Enhanced mapping to include all fields while maintaining backward compatibility
    //     const storedUsers = result.nonConnectedUsers.map(user => ({
    //         name: user.name || '',
    //         details: user.details || user.caption || '',
    //         profileUrl: user.id || user.profileUrl || '',
    //         postContent: user.postContent || '',
    //         reactionType: user.reactionType || '',
    //         savedAt: user.savedAt || new Date().toISOString(),
    //         // Preserve any additional fields that might exist
    //         ...user
    //     }));
        
    //     console.log('Mapped stored users:', storedUsers);
        
    //     // MERGE stored users with existing users instead of replacing
    //     // Create a map of existing users by profileUrl for quick lookup
    //     const existingUsersMap = new Map();
    //     allUsers.forEach(user => {
    //         const profileUrl = user.profileUrl || user.id;
    //         if (profileUrl) {
    //             existingUsersMap.set(profileUrl, user);
    //         }
    //     });
        
    //     console.log(`Existing users count before loading stored: ${existingUsersMap.size}`);
    //     console.log(`Stored users count: ${storedUsers.length}`);
        
    //     // Add stored users, but don't overwrite existing ones
    //     let addedCount = 0;
    //     storedUsers.forEach(storedUser => {
    //         const profileUrl = storedUser.profileUrl || storedUser.id;
    //         if (profileUrl && !existingUsersMap.has(profileUrl)) {
    //             existingUsersMap.set(profileUrl, storedUser);
    //             addedCount++;
    //             console.log(`Added stored user: ${storedUser.name} (${profileUrl})`);
    //         } else if (profileUrl) {
    //             console.log(`Skipped duplicate stored user: ${storedUser.name} (${profileUrl})`);
    //         }
    //     });
        
    //     console.log(`Total stored users added: ${addedCount}`);
        
    //     // Convert map back to array
    //     allUsers = Array.from(existingUsersMap.values());
        
    //     console.log(`Final allUsers count after loading stored: ${allUsers.length}`);
        
    //     // Save the merged user list back to storage for persistence
    //     try {
    //         await chrome.storage.local.set({ 
    //             nonConnectedUsers: allUsers,
    //             lastUserUpdate: new Date().toISOString()
    //         });
    //         console.log('Merged user list saved to storage');
    //     } catch (error) {
    //         console.error('Error saving merged user list:', error);
    //     }
        
    //     displayUsers(allUsers);
        
    //     const container = document.getElementById('selectedUsersContainer');
    //     if (container) {
    //         container.style.display = 'block';
    //     }
        
    //     const statusElement = document.getElementById('engagementStatus');
    //     if (statusElement) {
    //         const totalUsers = allUsers.length;
    //         statusElement.textContent = `Loaded ${addedCount} stored users (${totalUsers} total users available)`;
    //         statusElement.className = 'status success';
    //     }
    // }

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

    // Manual Add User Form Logic
    const manualAddUserForm = document.getElementById('manualAddUserForm');
    if (manualAddUserForm) {
        manualAddUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('manualUserName').value.trim();
            const title = document.getElementById('manualUserTitle').value.trim();
            const rawProfileUrl = document.getElementById('manualUserProfileUrl').value;
            const profileUrl = rawProfileUrl.trim();
            const postContent = document.getElementById('manualUserPostContent').value.trim();
            const statusDiv = document.getElementById('manualAddUserStatus');
            statusDiv.textContent = '';
            statusDiv.className = 'status';
            
            // Debug logs for validation
            console.log('[MANUAL-USER-POPUP] Raw profile URL:', rawProfileUrl);
            console.log('[MANUAL-USER-POPUP] Trimmed profile URL:', profileUrl);
            console.log('[MANUAL-USER-POPUP] Name:', name, 'Title:', title, 'PostContent:', postContent);
            
            // Validate fields
            if (!name || !title || !profileUrl) {
                statusDiv.textContent = 'Please fill in all required fields.';
                statusDiv.className = 'status error';
                console.log('[MANUAL-USER-POPUP] Validation failed: missing fields');
                return;
            }
            
            const isValid = isValidLinkedInUrl(profileUrl);
            console.log('[MANUAL-USER-POPUP] isValidLinkedInUrl result:', isValid);
            if (!isValid) {
                statusDiv.textContent = 'Please enter a valid LinkedIn profile URL.';
                statusDiv.className = 'status error';
                console.log('[MANUAL-USER-POPUP] Validation failed: invalid LinkedIn URL');
                return;
            }
            
            // Send user to background script for addition
            try {
                console.log('[MANUAL-USER-POPUP] Sending add_manual_user message to background:', {
                  name, details: title, profileUrl, postContent
                });
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'add_manual_user',
                        user: {
                            name,
                            details: title,
                            profileUrl,
                            postContent,
                            reactionType: '',
                            savedAt: new Date().toISOString(),
                            source: 'manual' // Tag manual users
                        }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('[MANUAL-USER-POPUP] Received response from background:', response);
                            resolve(response);
                        }
                    });
                });
                
                if (response && response.success) {
                    statusDiv.textContent = `User added successfully! (${response.addedCount} new, ${response.totalCount} total)`;
                    statusDiv.className = 'status success';
                    manualAddUserForm.reset();
                    console.log('[MANUAL-USER-POPUP] User added successfully, UI updated.');
                } else {
                    statusDiv.textContent = 'Error: ' + (response?.error || 'Failed to add user');
                    statusDiv.className = 'status error';
                    console.log('[MANUAL-USER-POPUP] Error in response:', response);
                }
            } catch (error) {
                console.error('[MANUAL-USER-POPUP] Error adding manual user:', error);
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.className = 'status error';
            }
        });
    }

    // Excel Bulk Upload Logic
    const uploadExcelBtn = document.getElementById('uploadExcelBtn');
    const excelFileInput = document.getElementById('excelFileInput');
    const excelUploadStatus = document.getElementById('excelUploadStatus');

    if (uploadExcelBtn && excelFileInput) {
        uploadExcelBtn.addEventListener('click', () => {
            excelFileInput.value = '';
            excelFileInput.click();
        });

        excelFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            excelUploadStatus.textContent = 'Processing file...';
            excelUploadStatus.className = 'status loading';
            
            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                if (!json.length) throw new Error('No data found in the Excel file.');

                const usersToAdd = [];
                json.forEach(row => {
                    // Map columns: Link, First name, Last name, Position
                    const profileUrl = (row['Link'] || '').trim();
                    const firstName = (row['First name'] || '').trim();
                    const lastName = (row['Last name'] || '').trim();
                    const name = (firstName + ' ' + lastName).trim();
                    const details = (row['Position'] || '').trim();
                    
                    // Only add if profileUrl and name are present
                    if (profileUrl && name) {
                        usersToAdd.push({
                                name,
                                details,
                                profileUrl,
                                postContent: '',
                                reactionType: '',
                                savedAt: new Date().toISOString(),
                                source: 'excel' // Tag Excel users
                            });
                    }
                });
                
                if (usersToAdd.length === 0) {
                    excelUploadStatus.textContent = 'No valid users found in Excel file.';
                    excelUploadStatus.className = 'status error';
                    return;
                }
                
                // Send users to background script for addition
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'add_excel_users',
                        users: usersToAdd
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    });
                });
                
                if (response && response.success) {
                    excelUploadStatus.textContent = `Successfully imported ${response.addedCount} user(s) from Excel (${response.totalCount} total users)`;
                excelUploadStatus.className = 'status success';
                } else {
                    excelUploadStatus.textContent = 'Error: ' + (response?.error || 'Failed to import users');
                    excelUploadStatus.className = 'status error';
                }
            } catch (error) {
                console.error('Error processing Excel file:', error);
                excelUploadStatus.textContent = 'Error: ' + error.message;
                excelUploadStatus.className = 'status error';
            }
        });
    }

    // Load users from background script when popup opens
    loadUsersFromBackground();
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

async function saveSelectedUsers(selectedUserData) {
    try {
        // Save to chrome storage
        await chrome.storage.local.set({ selectedUsers: selectedUserData });
        
        console.log('Saved selected users with full data:', selectedUserData);
        showStatus('Selected users saved successfully!', false);

        // Send message to background script with selected users data
        chrome.runtime.sendMessage({ type: 'users_selected', users: selectedUserData });
        // NEW: Send message to save selected users to the database
        chrome.runtime.sendMessage({ type: 'save_selected_users_to_db', users: selectedUserData });
    } catch (error) {
        console.error('Error saving selected users:', error);
        showStatus('Error saving selected users', true);
    }
} 