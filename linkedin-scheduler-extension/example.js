// Example usage of LinkedIn post scheduler

// Example post content
const postContent = `🚀 Exciting developments in AI! 

I'm thrilled to share some insights about the latest advancements in artificial intelligence and machine learning. The field is evolving at an incredible pace, bringing transformative changes to how we work and live.

Key highlights:
• Breakthroughs in natural language processing
• Advancements in computer vision
• Ethical AI considerations
• Real-world applications

What are your thoughts on these developments? Let's discuss in the comments! 👇

#AI #MachineLearning #Technology #Innovation #FutureOfWork`;

// Example function to schedule a post
async function scheduleExamplePost() {
    try {
        // Create target date (e.g., tomorrow at 9:00 AM)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1); // Tomorrow
        targetDate.setHours(9, 0, 0); // 9:00 AM
        
        // Round to nearest 15 minutes
        const roundedDate = roundToNearest15Minutes(targetDate);
        
        console.log('Scheduling post for:', roundedDate.toLocaleString());
        
        // Schedule the post
        const result = await scheduleLinkedInPost(postContent, roundedDate);
        
        if (result.success) {
            console.log('Post scheduled successfully!');
        } else {
            console.error('Failed to schedule post:', result.error);
        }
    } catch (error) {
        console.error('Error in scheduleExamplePost:', error);
    }
}

// Example function to schedule multiple posts
async function scheduleMultiplePosts() {
    const posts = [
        {
            content: postContent,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        },
        {
            content: postContent,
            date: new Date(Date.now() + 48 * 60 * 60 * 1000) // Day after tomorrow
        }
    ];
    
    for (const post of posts) {
        try {
            // Round time to nearest 15 minutes
            const roundedDate = roundToNearest15Minutes(post.date);
            
            console.log('Scheduling post for:', roundedDate.toLocaleString());
            
            // Schedule the post
            const result = await scheduleLinkedInPost(post.content, roundedDate);
            
            if (result.success) {
                console.log('Post scheduled successfully!');
            } else {
                console.error('Failed to schedule post:', result.error);
            }
            
            // Wait between posts to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.error('Error scheduling post:', error);
        }
    }
}

// Export example functions
window.scheduleExamplePost = scheduleExamplePost;
window.scheduleMultiplePosts = scheduleMultiplePosts;

// Test script for LinkedIn profile action area selectors
async function testProfileActionSelectors() {
    console.log('🔍 Testing Profile Action Area Selectors');
    console.log('====================================');

    // Wait for page load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 1: Main container
    console.log('\nTest 1: Main Container');
    console.log('-------------------');
    const mainContainer = document.querySelector('.ph5.pb5');
    console.log('Main Container Found:', !!mainContainer);
    if (mainContainer) {
        console.log('Container HTML:', mainContainer.outerHTML);
    }

    // Test 2: Action buttons container
    console.log('\nTest 2: Action Buttons Container');
    console.log('---------------------------');
    const actionButtonsContainer = mainContainer?.querySelector('div[class*="BqbEdkwobKQASKlQjshCQCVaEiuhwbcCfHA"]');
    console.log('Action Buttons Container Found:', !!actionButtonsContainer);
    if (actionButtonsContainer) {
        console.log('Container HTML:', actionButtonsContainer.outerHTML);
    }

    // Test 3: Connect button
    console.log('\nTest 3: Connect Button');
    console.log('-------------------');
    const connectButton = actionButtonsContainer?.querySelector('button[aria-label*="Invite"][aria-label*="to connect"]');
    console.log('Connect Button Found:', !!connectButton);
    if (connectButton) {
        console.log('Button HTML:', connectButton.outerHTML);
        console.log('Button Text:', connectButton.textContent.trim());
        console.log('Button Aria Label:', connectButton.getAttribute('aria-label'));
    }

    // Test 4: More button
    console.log('\nTest 4: More Button');
    console.log('----------------');
    const moreButton = actionButtonsContainer?.querySelector('button[aria-label="More actions"]');
    console.log('More Button Found:', !!moreButton);
    if (moreButton) {
        console.log('Button HTML:', moreButton.outerHTML);
        console.log('Button Text:', moreButton.textContent.trim());
        console.log('Button Aria Label:', moreButton.getAttribute('aria-label'));
    }

    // Test 5: Alternative selectors
    console.log('\nTest 5: Alternative Selectors');
    console.log('-------------------------');
    
    // Test 5.1: Using parent structure
    const profileHeader = document.querySelector('.pv-top-card');
    const actionArea = profileHeader?.querySelector('.pv-top-card__actions');
    console.log('Profile Header Found:', !!profileHeader);
    console.log('Action Area Found:', !!actionArea);

    // Test 5.2: Using button attributes
    const allConnectButtons = document.querySelectorAll('button[aria-label*="Invite"][aria-label*="to connect"]');
    console.log('Total Connect Buttons:', allConnectButtons.length);
    allConnectButtons.forEach((button, index) => {
        console.log(`\nConnect Button ${index + 1}:`);
        console.log('Parent Structure:', button.closest('.ph5.pb5') ? 'In Main Container' : 'Outside Main Container');
    });

    // Summary
    console.log('\n📊 Test Summary');
    console.log('=============');
    console.log('1. Main Container (.ph5.pb5):', !!mainContainer);
    console.log('2. Action Buttons Container:', !!actionButtonsContainer);
    console.log('3. Connect Button:', !!connectButton);
    console.log('4. More Button:', !!moreButton);
    console.log('5. Profile Header:', !!profileHeader);
    console.log('6. Action Area:', !!actionArea);
}

// Run the test
console.log('🚀 Starting Profile Action Area Selector Test...');
testProfileActionSelectors().then(() => {
    console.log('✅ Test completed');
}).catch(error => {
    console.error('❌ Test failed:', error);
});

// LinkedIn Profile Selector Test Script
// Copy and paste this entire script into your browser console while on a LinkedIn profile page

(function() {
    console.log('🔍 LinkedIn Profile Selector Test');
    console.log('===============================');

    // Helper function to check if element exists and log details
    function checkElement(selector, description) {
        const element = document.querySelector(selector);
        console.log(`\n📌 Testing: ${description}`);
        console.log(`Selector: ${selector}`);
        
        if (element) {
            console.log('✅ Found!');
            console.log('Element details:', {
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                isVisible: element.offsetParent !== null,
                innerHTML: element.innerHTML.substring(0, 200) + '...'
            });
            return true;
        } else {
            console.log('❌ Not found');
            return false;
        }
    }

    // Test main container selectors
    console.log('\n🔍 Testing Main Container Selectors');
    console.log('================================');
    
    const mainContainerSelectors = [
        '.ph5.pb5',
        '.pv-top-card',
        '.pv-top-card-v2',
        'div[class*="pv-top-card"]'
    ];

    let mainContainer = null;
    for (const selector of mainContainerSelectors) {
        if (checkElement(selector, 'Main Container')) {
            mainContainer = document.querySelector(selector);
            break;
        }
    }

    if (mainContainer) {
        // Test action button selectors within main container
        console.log('\n🔍 Testing Action Button Selectors');
        console.log('================================');
        
        const actionButtonSelectors = [
            'button[aria-label*="Invite"][aria-label*="to connect"]',
            'button.artdeco-button--primary[aria-label*="Invite"]',
            'button[aria-label="More actions"]',
            'div[class*="pv-top-card-v2-ctas"]',
            'div[class*="pv-top-card__actions"]'
        ];

        for (const selector of actionButtonSelectors) {
            checkElement(selector, 'Action Button');
        }

        // Test dropdown selectors
        console.log('\n🔍 Testing Dropdown Selectors');
        console.log('================================');
        
        const dropdownSelectors = [
            '.artdeco-dropdown__content',
            '.artdeco-dropdown__content-inner',
            'div[aria-label*="Invite"][aria-label*="to connect"]'
        ];

        for (const selector of dropdownSelectors) {
            checkElement(selector, 'Dropdown Element');
        }
    }

    // Log current page structure
    console.log('\n📄 Current Page Structure');
    console.log('================================');
    console.log('Document ready state:', document.readyState);
    console.log('Body classes:', document.body.className);
    console.log('First 1000 chars of body:', document.body.innerHTML.substring(0, 1000));

    // Check for any LinkedIn-specific classes
    console.log('\n🔍 LinkedIn-specific Classes');
    console.log('================================');
    const allElements = document.getElementsByTagName('*');
    const linkedInClasses = new Set();
    
    for (const element of allElements) {
        if (element.className && typeof element.className === 'string') {
            element.className.split(' ').forEach(cls => {
                if (cls.startsWith('pv-') || cls.startsWith('artdeco-')) {
                    linkedInClasses.add(cls);
                }
            });
        }
    }
    
    console.log('Found LinkedIn classes:', Array.from(linkedInClasses));

})(); 