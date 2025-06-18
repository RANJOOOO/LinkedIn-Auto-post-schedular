// LinkedIn Post Processor Test Script
(() => {
    // Helper function for waiting
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Function to wait for profile to load
    async function waitForProfileLoad(tab) {
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
        } catch (error) {
            console.log('⚠️ Profile load check failed, continuing anyway...');
        }
    }

    // Function to scroll to a specific post
    async function scrollToPost(post) {
        console.log('📜 Scrolling to post...');
        post.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await wait(1000); // Wait for scroll to complete
    }

    // Function to get all posts
    async function getAllPosts() {
        const feedContainer = document.querySelector('.scaffold-finite-scroll');
        if (!feedContainer) {
            console.log('❌ No feed container found');
            return [];
        }

        let previousHeight = 0;
        let currentHeight = feedContainer.scrollHeight;
        let noNewPostsCount = 0;
        const maxNoNewPosts = 5; // Increased from 3 to 5 for more thorough checking
        const processedPosts = new Set();
        const allPosts = [];
        let consecutiveSameHeightCount = 0;
        const maxSameHeightCount = 3; // Number of times height can be same before considering end

        console.log('📜 Starting to load all posts...');

        while (noNewPostsCount < maxNoNewPosts) {
            // Get current posts
            const currentPosts = Array.from(feedContainer.querySelectorAll('div.feed-shared-update-v2'));
            let foundNewPost = false;

            // Add new posts
            for (const post of currentPosts) {
                const postId = post.getAttribute('data-urn') || post.getAttribute('data-id');
                if (postId && !processedPosts.has(postId)) {
                    processedPosts.add(postId);
                    allPosts.push(post);
                    foundNewPost = true;
                }
            }

            // If no new posts found, increment counter
            if (!foundNewPost) {
                noNewPostsCount++;
                console.log(`No new posts found (${noNewPostsCount}/${maxNoNewPosts})`);
            } else {
                noNewPostsCount = 0; // Reset counter if we found new posts
                console.log(`Found ${allPosts.length} posts so far...`);
            }

            // Scroll to load more posts
            previousHeight = currentHeight;
            feedContainer.scrollTop = currentHeight;
            
            // Wait longer for new posts to load
            console.log('⏳ Waiting for new posts to load...');
            await wait(3000); // Increased from 2000 to 3000ms
            
            currentHeight = feedContainer.scrollHeight;

            // Check if we've reached the end
            if (previousHeight === currentHeight) {
                consecutiveSameHeightCount++;
                console.log(`Feed height unchanged (${consecutiveSameHeightCount}/${maxSameHeightCount})`);
                
                if (consecutiveSameHeightCount >= maxSameHeightCount) {
                    console.log('📏 Feed height unchanged multiple times - likely reached end');
                    noNewPostsCount++;
                }
            } else {
                consecutiveSameHeightCount = 0;
            }

            // Additional check for "End of feed" message
            const endOfFeedMessage = document.querySelector('.feed-shared-end-of-feed');
            if (endOfFeedMessage) {
                console.log('🏁 Found end of feed message');
                break;
            }

            // Additional wait to ensure everything is loaded
            await wait(1000);
        }

        // Final verification
        console.log('🔍 Performing final verification...');
        await wait(2000);
        
        // One last scroll to be sure
        feedContainer.scrollTop = feedContainer.scrollHeight;
        await wait(3000);
        
        // Check for any new posts one last time
        const finalPosts = Array.from(feedContainer.querySelectorAll('div.feed-shared-update-v2'));
        for (const post of finalPosts) {
            const postId = post.getAttribute('data-urn') || post.getAttribute('data-id');
            if (postId && !processedPosts.has(postId)) {
                processedPosts.add(postId);
                allPosts.push(post);
            }
        }

        console.log(`✅ Finished loading posts. Total posts found: ${allPosts.length}`);
        return allPosts;
    }

    // Function to wait for an element to appear
    async function waitForElement(selector, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
            await wait(100);
        }
        return null;
    }

    // Function to extract reactor information from an element
    function extractReactorInfo(element) {
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
            
            return { 
                name, 
                url,
                reactionType,
                caption
            };
        } catch (error) {
            console.log('⚠️ Error extracting reactor info:', error);
            return null;
        }
    }

    // Function to scroll and load all reactions
    async function scrollAndLoadAllReactions(dialog) {
        const scrollContainer = dialog.querySelector('.scaffold-finite-scroll__content');
        if (!scrollContainer) return [];

        let previousHeight = 0;
        let currentHeight = scrollContainer.scrollHeight;
        let scrollAttempts = 0;
        let noNewReactionsCount = 0;
        const maxNoNewReactions = 3; // Number of times we can scroll without finding new reactions
        const processedUrls = new Set(); // Keep track of processed profiles
        const reactors = [];

        while (noNewReactionsCount < maxNoNewReactions) {
            // Extract reactors from current view
            const reactorElements = dialog.querySelectorAll('.social-details-reactors-tab-body-list-item');
            console.log(`\n📊 Found ${reactorElements.length} reactors in current view`);

            let foundNewReactor = false;

            // Process each reactor
            for (const element of reactorElements) {
                const reactorInfo = extractReactorInfo(element);
                if (reactorInfo && !processedUrls.has(reactorInfo.url)) {
                    processedUrls.add(reactorInfo.url);
                    reactors.push(reactorInfo);
                    foundNewReactor = true;
                    console.log(`👤 Extracted: ${reactorInfo.name} - ${reactorInfo.reactionType}`);
                }
            }

            // If no new reactors found, increment counter
            if (!foundNewReactor) {
                noNewReactionsCount++;
                console.log(`No new reactors found (${noNewReactionsCount}/${maxNoNewReactions})`);
            } else {
                noNewReactionsCount = 0; // Reset counter if we found new reactors
            }

            // Scroll to next batch
            previousHeight = currentHeight;
            scrollContainer.scrollTop = currentHeight;
            await wait(1000); // Wait for content to load
            currentHeight = scrollContainer.scrollHeight;
            scrollAttempts++;

            // Check if "Show more results" button exists and click it
            const showMoreButton = dialog.querySelector('.scaffold-finite-scroll__load-button');
            if (showMoreButton) {
                console.log('📜 Clicking "Show more results" button...');
                showMoreButton.click();
                await wait(2000); // Wait longer for more content to load
                noNewReactionsCount = 0; // Reset counter when loading more
            }

            console.log(`Scrolling... (${scrollAttempts} attempts, ${reactors.length} unique reactors found so far)`);
        }

        console.log('✅ Finished scrolling - no new reactors found after multiple attempts');
        return reactors;
    }

    // Function to view profiles in a single tab
    async function viewProfilesInSingleTab(reactors) {
        console.log('\n🌐 Opening profiles in a single tab...');
        
        // Open the first profile in a new tab
        const profileTab = window.open(reactors[0].url, '_blank');
        if (!profileTab) {
            console.log('❌ Failed to open profile tab. Please allow popups.');
            return;
        }

        // Wait for the first profile to load
        console.log(`⏳ Waiting for ${reactors[0].name}'s profile to load...`);
        await waitForProfileLoad(profileTab);
        console.log('✅ First profile loaded');

        // Process remaining profiles
        for (let i = 1; i < reactors.length; i++) {
            console.log(`\n🔄 Viewing profile for: ${reactors[i].name}`);
            
            // Update the URL of the existing tab
            profileTab.location.href = reactors[i].url;
            
            // Wait for the profile to load completely
            console.log('⏳ Waiting for profile to load...');
            await waitForProfileLoad(profileTab);
            console.log('✅ Profile loaded successfully');
            
            // Additional wait to ensure everything is rendered
            await wait(2000);
        }
    }

    // Function to close the reactions dialog
    async function closeReactionsDialog() {
        console.log('🔒 Closing reactions dialog...');
        const closeButton = document.querySelector('button[data-test-modal-close-btn]');
        if (closeButton) {
            closeButton.click();
            await wait(1000);
        }
    }

    // Function to process a single post
    async function processPost(post, index) {
        console.log(`\n🔄 Processing post ${index + 1}...`);
        
        try {
            // Scroll the post into view
            await scrollToPost(post);
            
            // 1. Find the reaction button - look for it within the post's social counts section
            const socialCounts = post.querySelector('.social-details-social-counts__reactions');
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

            // 2. Click the reaction button and wait for dialog
            reactionButton.click();
            console.log('✅ Clicked reaction button');
            
            // Wait longer for the dialog to load completely
            console.log('⏳ Waiting for reactions to load...');
            await wait(3000); // Wait 3 seconds for initial load

            // 3. Wait for the reactions dialog with the correct class
            const dialog = await waitForElement('.social-details-reactors-modal__content', 5000);
            if (!dialog) {
                console.log('❌ No reactions dialog found');
                return null;
            }

            // Additional wait to ensure all content is loaded
            console.log('⏳ Ensuring all reactions are loaded...');
            await wait(2000);

            // 4. Scroll and extract all reactors
            console.log('📜 Starting to scroll and extract all reactions...');
            const reactors = await scrollAndLoadAllReactions(dialog);
            console.log('✅ Finished scrolling and extracting');

            if (reactors.length === 0) {
                console.log('❌ No reactors found for this post');
                await closeReactionsDialog();
                return null;
            }

            // 5. View profiles in a single tab
            await viewProfilesInSingleTab(reactors);

            // 6. Close the dialog properly
            await closeReactionsDialog();

            return reactors;
        } catch (error) {
            console.error('❌ Error processing post:', error);
            return null;
        }
    }

    // Main processing function
    async function processAllPosts() {
        console.log('⏳ Loading all posts...');
        const posts = await getAllPosts();
        
        if (posts.length === 0) {
            console.log('❌ No posts found');
            return;
        }

        console.log(`📝 Found ${posts.length} posts to process`);

        for (let i = 0; i < posts.length; i++) {
            console.log(`\n🔄 Starting post ${i + 1} of ${posts.length}`);
            
            const reactors = await processPost(posts[i], i);
            
            if (reactors) {
                console.log(`\n✅ Completed processing post ${i + 1}:`);
                console.log(`Found ${reactors.length} unique reactors`);
                console.log('Reactor details:');
                reactors.forEach((reactor, idx) => {
                    console.log(`${idx + 1}. ${reactor.name} - ${reactor.reactionType}`);
                    console.log(`   Headline: ${reactor.caption}`);
                    console.log(`   Profile: ${reactor.url}`);
                });
            }

            // Wait longer between posts
            console.log('\n⏳ Moving to next post...');
            await wait(3000); // Increased from 2000 to 3000ms
        }

        // Final verification
        console.log('\n🔍 Performing final verification...');
        await wait(2000);
        
        // Check if we missed any posts
        const finalCheck = await getAllPosts();
        if (finalCheck.length > posts.length) {
            console.log(`⚠️ Found ${finalCheck.length - posts.length} additional posts. Processing them now...`);
            for (let i = posts.length; i < finalCheck.length; i++) {
                console.log(`\n🔄 Processing additional post ${i + 1} of ${finalCheck.length}`);
                await processPost(finalCheck[i], i);
                await wait(3000);
            }
        }

        console.log('\n🎉 Finished processing all posts!');
    }

    // Run the script
    console.log('🚀 Starting post processing...');
    processAllPosts();
})(); 