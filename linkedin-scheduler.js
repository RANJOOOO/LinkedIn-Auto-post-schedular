async function scheduleLinkedInPostWithCalendar(content, targetDate) {
    try {
        // First, find and click the "Start a post" button
        const startPostButton = Array.from(document.querySelectorAll('button')).find(button => 
            button.textContent.includes('Start a post')
        );
        
        if (!startPostButton) {
            throw new Error('Could not find "Start a post" button');
        }
        
        console.log('Found "Start a post" button, clicking...');
        startPostButton.click();
        
        // Wait for modal to appear and enter content
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find the text editor element
        const editor = document.querySelector('.ql-editor') || 
                      document.querySelector('[data-placeholder="What do you want to talk about?"]') ||
                      document.querySelector('.share-box__input') ||
                      document.querySelector('.share-box__input--textarea');
        
        if (!editor) {
            throw new Error('Text editor not found');
        }
        
        console.log('Found text editor, setting content...');
        editor.textContent = content;
        
        // Wait for content to be set
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find and click the schedule button
        const scheduleButton = document.querySelector('button[aria-label="Schedule post"]');
        if (!scheduleButton) {
            throw new Error('Schedule button not found');
        }
        
        console.log('Found schedule button, clicking...');
        scheduleButton.click();
        
        // Wait for scheduling modal to appear
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find and click the date input field
        const dateInput = document.querySelector('input[aria-label="Date"]') || 
                         document.querySelector('#share-post__scheduled-date');
        
        if (!dateInput) {
            throw new Error('Date input field not found');
        }

        console.log('Found date input field, focusing...');
        dateInput.focus();
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Clicking date input field...');
        dateInput.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Function to navigate to target month
        const navigateToTargetMonth = async (targetMonth, targetYear) => {
            const currentMonthElement = document.querySelector('.artdeco-calendar__month');
            if (!currentMonthElement) {
                throw new Error('Calendar month element not found');
            }

            const [currentMonth, currentYear] = currentMonthElement.textContent.split(' ');
            console.log(`Current calendar month: ${currentMonth} ${currentYear}`);
            
            const currentMonthIndex = new Date(`${currentMonth} 1, ${currentYear}`).getMonth();
            const targetMonthIndex = targetMonth;

            // Calculate months difference
            const monthsDiff = (targetYear - parseInt(currentYear)) * 12 + (targetMonthIndex - currentMonthIndex);
            console.log(`Need to navigate ${Math.abs(monthsDiff)} months ${monthsDiff > 0 ? 'forward' : 'backward'}`);

            // Navigate to target month
            const nextButton = document.querySelector('button[data-calendar-next-month]');
            const prevButton = document.querySelector('button[data-calendar-prev-month]');

            for (let i = 0; i < Math.abs(monthsDiff); i++) {
                const button = monthsDiff > 0 ? nextButton : prevButton;
                if (!button || button.disabled) {
                    throw new Error('Cannot navigate to target month - button disabled or not found');
                }
                console.log(`Clicking ${monthsDiff > 0 ? 'next' : 'previous'} month button...`);
                button.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        };

        // Function to select target date
        const selectTargetDate = async (targetDay) => {
            console.log(`Looking for day ${targetDay} in calendar...`);
            const dayButtons = Array.from(document.querySelectorAll('button[data-calendar-day]'));
            console.log(`Found ${dayButtons.length} day buttons in calendar`);
            
            const targetButton = dayButtons.find(button => {
                const dayNum = button.getAttribute('data-daynum');
                const isDisabled = button.disabled;
                console.log(`Checking day ${dayNum}, disabled: ${isDisabled}`);
                return dayNum === targetDay.toString() && !button.disabled;
            });

            if (!targetButton) {
                throw new Error(`Could not find selectable date for day ${targetDay}`);
            }

            console.log(`Found selectable date button for day ${targetDay}, attempting to click...`);
            
            // Try multiple click methods
            try {
                // Method 1: Direct click
                targetButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Method 2: Mouse events
                targetButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 500));
                targetButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 500));
                targetButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 500));

                // Method 3: Focus and click
                targetButton.focus();
                await new Promise(resolve => setTimeout(resolve, 500));
                targetButton.click();
                await new Promise(resolve => setTimeout(resolve, 500));

                // Method 4: Programmatic click
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                targetButton.dispatchEvent(clickEvent);
                await new Promise(resolve => setTimeout(resolve, 500));

                console.log('Multiple click attempts completed, waiting for selection to register...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                console.error('Error during date selection:', error);
                throw error;
            }
        };

        // Navigate to target month and select date
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        const targetDay = targetDate.getDate();

        console.log(`Target date: ${targetMonth + 1}/${targetDay}/${targetYear}`);
        console.log('Starting calendar navigation...');
        await navigateToTargetMonth(targetMonth, targetYear);
        console.log('Calendar navigation complete, selecting date...');
        await selectTargetDate(targetDay);
        console.log('Date selection complete');
        
        // Find the time input field - try multiple selectors
        const timeInput = document.querySelector('input[aria-label="Time"]') || 
                         document.querySelector('input[placeholder="Time"]') ||
                         Array.from(document.querySelectorAll('input')).find(input => 
                             input.getAttribute('aria-label')?.includes('Time') ||
                             input.getAttribute('placeholder')?.includes('Time')
                         );
        
        if (!timeInput) {
            throw new Error('Time input not found');
        }
        
        // Format time to match LinkedIn's format (e.g., "11:00 PM")
        const formattedTime = targetDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        console.log('Setting time to:', formattedTime);
        
        // Click the time input to focus it
        timeInput.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear the time input first
        timeInput.value = '';
        timeInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Type the time value to trigger the dropdown
        timeInput.value = formattedTime;
        timeInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Wait longer for the dropdown to appear
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find all time options in the dropdown
        const timeOptions = Array.from(document.querySelectorAll('li'));
        console.log('Found time options:', timeOptions.map(opt => opt.textContent.trim()));
        
        // Find the matching time option
        const matchingTimeOption = timeOptions.find(option => 
            option.textContent.trim() === formattedTime
        );
        
        if (!matchingTimeOption) {
            throw new Error('Matching time option not found in dropdown');
        }
        
        console.log('Found matching time option:', matchingTimeOption.textContent.trim());
        
        // Try multiple click events on the matching time option
        matchingTimeOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        matchingTimeOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        matchingTimeOption.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Additional click with different event types
        matchingTimeOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify the time was selected
        if (timeInput.value !== formattedTime) {
            console.log('Time not set correctly, trying alternative selection method...');
            
            // Try clicking the option again with a different approach
            matchingTimeOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            matchingTimeOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            matchingTimeOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Wait 1 second after time selection
        console.log('Waiting 1 second after time selection...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find and click the Next button
        const nextButton = document.querySelector('button[aria-label="Next"]');
        if (!nextButton) {
            throw new Error('Next button not found');
        }
        
        console.log('Found Next button, clicking...');
        nextButton.click();
        
        // Wait for the transition back to post content screen
        console.log('Waiting for transition back to post content screen...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Wait for and find the final schedule button
        console.log('Looking for final Schedule button...');
        let finalScheduleButton = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (!finalScheduleButton && attempts < maxAttempts) {
            finalScheduleButton = document.querySelector('button.share-actions__primary-action') || 
                                document.querySelector('button[aria-label="Schedule"]') || 
                                document.querySelector('button[aria-label="Schedule post"]') ||
                                Array.from(document.querySelectorAll('button')).find(button => 
                                    button.textContent.trim() === 'Schedule'
                                );
            
            if (!finalScheduleButton) {
                console.log(`Attempt ${attempts + 1}: Final Schedule button not found, waiting...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
        }

        if (!finalScheduleButton) {
            throw new Error('Final Schedule button not found after multiple attempts');
        }
        
        console.log('Found final Schedule button, clicking...');
        
        // Try multiple click methods for the final button
        try {
            // Method 1: Direct click
            finalScheduleButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Method 2: Mouse events
            finalScheduleButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
            finalScheduleButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
            finalScheduleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));

            // Method 3: Focus and click
            finalScheduleButton.focus();
            await new Promise(resolve => setTimeout(resolve, 500));
            finalScheduleButton.click();
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
        return { success: true, message: 'Post scheduled successfully' };
        
    } catch (error) {
        console.error('Error scheduling post:', error);
        return { success: false, error: error.message };
    }
}

// Example usage
const postContent = `🚀 Exciting developments in AI! 

I'm thrilled to share some insights about the latest advancements in artificial intelligence and machine learning. The field is evolving at an incredible pace, bringing transformative changes to how we work and live.

Key highlights:
• Breakthroughs in natural language processing
• Advancements in computer vision
• Ethical AI considerations
• Real-world applications

What are your thoughts on these developments? Let's discuss in the comments! 👇

#AI #MachineLearning #Technology #Innovation #FutureOfWork`;

const targetDate = new Date();
targetDate.setDate(30); // Set to May 30th
targetDate.setMonth(4); // May (0-based month)
targetDate.setHours(23, 0, 0); // Set time to 11:00 PM

// Run the test
scheduleLinkedInPostWithCalendar(postContent, targetDate); 