// Calendar Navigation Utilities
const CalendarUtils = {
  // Round time to next 15 minutes
  roundToNext15Minutes: function(date) {
    const minutes = date.getMinutes();
    // Calculate minutes to add to reach next 15-minute mark
    const minutesToAdd = 15 - (minutes % 15);
    const newDate = new Date(date);
    newDate.setMinutes(minutes + minutesToAdd);
    return newDate;
  },

  // Format time for LinkedIn
  formatTimeForLinkedIn: function(date) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  },

  // Navigate to target month
  async navigateToTargetMonth(targetMonth, targetYear) {
    const currentMonthElement = document.querySelector('.artdeco-calendar__month');
    if (!currentMonthElement) {
      throw new Error('Calendar month element not found');
    }

    const [currentMonth, currentYear] = currentMonthElement.textContent.split(' ');
    console.log(`Current calendar month: ${currentMonth} ${currentYear}`);
    
    // Convert text month to index (0-11)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthIndex = monthNames.indexOf(currentMonth);
    const targetMonthIndex = targetMonth;

    if (currentMonthIndex === -1) {
      throw new Error(`Invalid month name: ${currentMonth}`);
    }

    console.log(`Month indices - Current: ${currentMonthIndex} (${currentMonth}), Target: ${targetMonthIndex} (${monthNames[targetMonthIndex]})`);

    // If we're in the same month and year, no need to navigate
    if (currentMonthIndex === targetMonthIndex && parseInt(currentYear) === targetYear) {
      console.log('Already in target month, no navigation needed');
      return;
    }

    const monthsDiff = (targetYear - parseInt(currentYear)) * 12 + (targetMonthIndex - currentMonthIndex);
    console.log(`Navigation details:
      - Current: ${currentMonth} ${currentYear} (index: ${currentMonthIndex})
      - Target: ${monthNames[targetMonthIndex]} ${targetYear} (index: ${targetMonthIndex})
      - Months to navigate: ${Math.abs(monthsDiff)}
      - Direction: ${monthsDiff > 0 ? 'forward' : 'backward'}`);

    const nextButton = document.querySelector('button[data-calendar-next-month]');
    const prevButton = document.querySelector('button[data-calendar-prev-month]');

    if (!nextButton || !prevButton) {
      throw new Error('Navigation buttons not found');
    }

    // Navigate one month at a time
    for (let i = 0; i < Math.abs(monthsDiff); i++) {
      const button = monthsDiff > 0 ? nextButton : prevButton;
      if (button.getAttribute('aria-disabled') === 'true') {
        throw new Error(`Cannot navigate to target month - ${monthsDiff > 0 ? 'next' : 'previous'} button is disabled`);
      }

      const stepNumber = i + 1;
      const totalSteps = Math.abs(monthsDiff);
      console.log(`\nNavigation step ${stepNumber}/${totalSteps}:`);
      console.log(`  - From: ${monthNames[currentMonthIndex + i * (monthsDiff > 0 ? 1 : -1)]} ${currentYear}`);
      console.log(`  - To: ${monthNames[currentMonthIndex + (i + 1) * (monthsDiff > 0 ? 1 : -1)]} ${currentYear}`);
      console.log(`  - Action: Clicking ${monthsDiff > 0 ? 'next' : 'previous'} month button...`);
      
      // Enhanced button click with multiple methods
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Method 1: Focus and click
      button.focus();
      await new Promise(resolve => setTimeout(resolve, 100));
      button.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Method 2: Mouse events
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Method 3: Programmatic click
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      button.dispatchEvent(clickEvent);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify navigation
      const newMonthElement = document.querySelector('.artdeco-calendar__month');
      if (newMonthElement) {
        const [newMonth, newYear] = newMonthElement.textContent.split(' ');
        const newMonthIndex = monthNames.indexOf(newMonth);
        
        if (newMonthIndex === -1) {
          throw new Error(`Invalid month name after navigation: ${newMonth}`);
        }
        
        // Calculate expected month index after this navigation step
        const expectedMonthIndex = (currentMonthIndex + (i + 1) * (monthsDiff > 0 ? 1 : -1) + 12) % 12;
        const expectedYear = parseInt(currentYear) + Math.floor((currentMonthIndex + (i + 1) * (monthsDiff > 0 ? 1 : -1)) / 12);
        
        console.log(`  - Verification:
            Current: ${newMonth} ${newYear} (index: ${newMonthIndex})
            Expected: ${monthNames[expectedMonthIndex]} ${expectedYear} (index: ${expectedMonthIndex})
            Match: ${newMonthIndex === expectedMonthIndex && parseInt(newYear) === expectedYear ? 'Yes' : 'No'}`);
        
        if (newMonthIndex === expectedMonthIndex && parseInt(newYear) === expectedYear) {
          console.log(`  - Success: Navigated to ${newMonth} ${newYear}`);
        } else {
          throw new Error(`Failed to verify month navigation at step ${stepNumber}. 
            Current: ${newMonth} ${newYear} (index: ${newMonthIndex})
            Expected: ${monthNames[expectedMonthIndex]} ${expectedYear} (index: ${expectedMonthIndex})`);
        }
      } else {
        throw new Error(`Month element not found after navigation step ${stepNumber}`);
      }
    }

    // Final verification of target month
    const finalMonthElement = document.querySelector('.artdeco-calendar__month');
    if (finalMonthElement) {
      const [finalMonth, finalYear] = finalMonthElement.textContent.split(' ');
      const finalMonthIndex = monthNames.indexOf(finalMonth);
      
      if (finalMonthIndex === -1) {
        throw new Error(`Invalid month name in final verification: ${finalMonth}`);
      }
      
      console.log(`\nFinal verification:
        - Current: ${finalMonth} ${finalYear} (index: ${finalMonthIndex})
        - Target: ${monthNames[targetMonthIndex]} ${targetYear} (index: ${targetMonthIndex})
        - Match: ${finalMonthIndex === targetMonthIndex && parseInt(finalYear) === targetYear ? 'Yes' : 'No'}`);
      
      if (finalMonthIndex !== targetMonthIndex || parseInt(finalYear) !== targetYear) {
        throw new Error(`Failed to reach target month. 
          Current: ${finalMonth} ${finalYear} (index: ${finalMonthIndex})
          Target: ${monthNames[targetMonthIndex]} ${targetYear} (index: ${targetMonthIndex})`);
      }
    }
  },

  // Select target date
  async selectTargetDate(targetDay) {
    console.log(`Looking for day ${targetDay} in calendar...`);
    
    // Wait for calendar to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get all day buttons with the specific data attribute
    let dayButtons = [];
    let retries = 0;
    const maxRetries = 5;

    while (dayButtons.length === 0 && retries < maxRetries) {
        // Try multiple selectors to find day buttons
        dayButtons = Array.from(document.querySelectorAll([
            'button.artdeco-calendar-day-btn',
            'button[data-calendar-day]',
            'button[data-daynum]'
        ].join(',')));
        
        if (dayButtons.length === 0) {
            console.log(`Attempt ${retries + 1}: No day buttons found, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries++;
        }
    }

    if (dayButtons.length === 0) {
        throw new Error('Could not find any day buttons in calendar');
    }

    console.log(`Found ${dayButtons.length} day buttons in calendar`);
    
    // Find the target button with more specific checks
    const targetButton = dayButtons.find(button => {
        const dayNum = button.getAttribute('data-daynum');
        // Check if the button is selectable (not disabled, not outside month, not shadow)
        const isDisabled = button.disabled || 
                          button.getAttribute('aria-disabled') === 'true' ||
                          button.classList.contains('artdeco-calendar-day-btn--not-selectable') ||
                          button.classList.contains('artdeco-calendar-day-btn--diff-month') ||
                          dayNum?.includes('shadow');
        
        console.log(`Checking day ${dayNum}, disabled: ${isDisabled}`);
        return dayNum === targetDay.toString() && !isDisabled;
    });

    if (!targetButton) {
        throw new Error(`Could not find selectable date for day ${targetDay}`);
    }

    console.log(`Found selectable date button for day ${targetDay}, attempting to click...`);
    
    // Try multiple click methods with proper timing
    try {
        // Ensure the button is in view and visible
        targetButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Wait for any animations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Method 1: Direct click with focus
        targetButton.focus();
        await new Promise(resolve => setTimeout(resolve, 1000));
        targetButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Method 2: Mouse events sequence (matching linkedin-scheduler.js)
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

        // Verify selection with retries
        let selectionVerified = false;
        retries = 0;
        const maxVerificationRetries = 5;

        while (!selectionVerified && retries < maxVerificationRetries) {
            // Try multiple selectors for selected date
            const selectedDate = document.querySelector([
                'button.artdeco-calendar-day-btn--selected',
                'button[data-calendar-day][aria-selected="true"]',
                'button.artdeco-button--primary'
            ].join(','));

            if (selectedDate) {
                const selectedDay = selectedDate.getAttribute('data-daynum');
                if (selectedDay === targetDay.toString()) {
                    selectionVerified = true;
                    console.log('Date selection verified');
                    break;
                }
            }
            
            if (!selectionVerified) {
                console.log(`Selection verification attempt ${retries + 1}: Selection not verified`);
                retries++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!selectionVerified) {
            throw new Error('Date selection not verified after multiple attempts');
        }
        
    } catch (error) {
        console.error('Error during date selection:', error);
        throw error;
    }
  },

  // Helper function to click date button with multiple methods
  clickDateButton: async function(element) {
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
  },

  // Select time for the post
  async selectTime(targetDate) {
    console.log('Looking for time input field...');
    
    // Round time to next 15 minutes
    const roundedDate = this.roundToNext15Minutes(targetDate);
    console.log('Original time:', this.formatTimeForLinkedIn(targetDate));
    console.log('Rounded time:', this.formatTimeForLinkedIn(roundedDate));
    
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
    const formattedTime = this.formatTimeForLinkedIn(roundedDate);
    
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
    
    // Wait after time selection
    console.log('Waiting after time selection...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  }
};

// Make CalendarUtils available globally
window.CalendarUtils = CalendarUtils; 