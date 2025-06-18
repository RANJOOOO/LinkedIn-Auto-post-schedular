# LinkedIn Post Scheduler Chrome Extension

A Chrome extension that allows you to schedule and automatically post content to LinkedIn.

## Features

- Schedule posts for future dates and times
- Add hashtags to your posts
- View all scheduled posts
- Delete scheduled posts
- Automatic posting at scheduled times
- Status tracking for scheduled posts

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar
2. Enter your post content
3. Add hashtags (comma-separated)
4. Select the date and time for posting
5. Click "Schedule Post"

## Development

The extension is built using:
- Chrome Extension Manifest V3
- JavaScript
- Chrome Storage API
- Chrome Alarms API

## File Structure

```
linkedin-scheduler-extension/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Security

- The extension only requests necessary permissions
- All data is stored locally using Chrome's storage API
- No external API calls or data sharing

## Contributing

Feel free to submit issues and enhancement requests! 