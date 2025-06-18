# LinkedIn Blog Automation & Engagement System

A comprehensive LinkedIn automation system that combines blog post scheduling with intelligent engagement tracking and connection management. This project consists of a Chrome extension for LinkedIn automation and a Node.js backend for content management and scheduling.

## 🚀 Features

### 📝 Blog Post Scheduling
- **AI-Powered Content Generation**: Generate blog posts from topics using GPT integration
- **Smart Scheduling**: Schedule posts with optimal timing for maximum engagement
- **Content Management**: Rich text editor with hashtag support
- **Post Approval Workflow**: Review and approve posts before publishing

### 🤝 LinkedIn Engagement Automation
- **Reaction Tracking**: Automatically extract users who reacted to recent posts (within 3 days)
- **Smart User Filtering**: Identify non-connected users for targeted outreach
- **Connection Management**: Send connection requests to relevant users
- **Follow-up Messaging**: Automated follow-up messages after connection requests
- **Duplicate Prevention**: Track sent requests to avoid duplicates

### 📊 Analytics & Monitoring
- **Real-time Status Tracking**: Monitor post scheduling and engagement progress
- **User Analytics**: Track connection success rates and engagement metrics
- **Storage Management**: Local and MongoDB storage for data persistence

## 🏗️ Project Structure

```
Mr Chandra Project/
├── linkedin-scheduler-extension/     # Chrome Extension
│   ├── manifest.json                 # Extension configuration
│   ├── popup.html                    # Extension popup interface
│   ├── popup.js                      # Popup functionality
│   ├── background.js                 # Background service worker
│   ├── content.js                    # Content script for LinkedIn
│   ├── engagement-utils.js           # Engagement automation utilities
│   ├── calendar-utils.js             # Calendar and scheduling utilities
│   ├── styles.css                    # Extension styling
│   └── icons/                        # Extension icons
├── backend/                          # Node.js Backend Server
│   ├── server.js                     # Main server file
│   ├── scheduler.js                  # Post scheduling logic
│   ├── websocket.js                  # Real-time communication
│   ├── models/                       # MongoDB models
│   │   ├── Post.js                   # Post data model
│   │   ├── Topic.js                  # Topic data model
│   │   ├── Engagement.js             # Engagement data model
│   │   └── ProfileUrl.js             # Profile URL model
│   ├── controllers/                  # API controllers
│   ├── routes/                       # API routes
│   └── services/                     # Business logic services
├── src/                              # React Frontend
│   ├── components/                   # React components
│   ├── pages/                        # Page components
│   └── services/                     # API services
└── public/                           # Static assets
```

## 🛠️ Technology Stack

### Frontend (React)
- **React 18** - UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **React Quill** - Rich text editor
- **Axios** - HTTP client

### Chrome Extension
- **Manifest V3** - Extension manifest
- **Service Workers** - Background processing
- **Content Scripts** - LinkedIn page interaction
- **Chrome Storage API** - Local data storage

### Backend (Node.js)
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Node-cron** - Task scheduling
- **WebSocket** - Real-time communication
- **CORS** - Cross-origin resource sharing

## 📦 Installation & Setup

### Prerequisites
- Node.js (>=16.0.0)
- MongoDB
- Chrome browser
- LinkedIn account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "Mr Chandra Project"
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
```

### 4. Environment Configuration
Create `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/linkedin-automation
PORT=5000
NODE_ENV=development
```

### 5. Start Backend Server
```bash
cd backend
npm run dev
```

### 6. Start Frontend Development Server
```bash
npm start
```

### 7. Load Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `linkedin-scheduler-extension` folder

## 🎯 Usage Guide

### Blog Post Scheduling
1. **Access the Dashboard**: Open the React app at `http://localhost:3000`
2. **Create Content**: Use the blog editor to create or generate posts
3. **Schedule Posts**: Set timing and schedule posts for LinkedIn
4. **Review & Approve**: Review scheduled posts before publishing

### LinkedIn Engagement
1. **Configure Profile**: Save your LinkedIn profile URL in the extension
2. **Find Recent Posts**: Click "Find Recent Posts" to scan your LinkedIn activity
3. **Select Users**: Choose users who reacted to your posts
4. **Save Selection**: Save selected users for connection requests
5. **Automate Outreach**: The system will send connection requests and follow-up messages

### Extension Features
- **Profile Configuration**: Set your LinkedIn profile URL
- **User Selection**: Select users from recent post reactions
- **Status Monitoring**: Track engagement and scheduling progress
- **Real-time Updates**: Get live updates on automation progress

## 🔧 Configuration

### Extension Permissions
The extension requires the following permissions:
- `storage` - Local data storage
- `tabs` - Tab management
- `notifications` - User notifications
- `scripting` - Content script injection
- `activeTab` - Active tab access
- `https://*.linkedin.com/*` - LinkedIn domain access

### API Endpoints
- `POST /api/posts` - Create new posts
- `GET /api/posts` - Get scheduled posts
- `POST /api/topics` - Generate content from topics
- `GET /api/engagements` - Get engagement data
- `POST /api/engagements` - Save engagement data

## 🚨 Important Notes

### LinkedIn Compliance
- This tool is designed for legitimate business use
- Respect LinkedIn's terms of service
- Use reasonable intervals between actions
- Monitor automation to prevent account restrictions

### Data Privacy
- User data is stored locally and in MongoDB
- No sensitive data is shared with third parties
- Users can control their data through the extension

### Rate Limiting
- The system includes built-in delays to respect LinkedIn's rate limits
- Avoid excessive automation to prevent account issues
- Monitor your LinkedIn account for any warnings

## 🐛 Troubleshooting

### Common Issues
1. **Extension Not Loading**: Check manifest.json and ensure all files are present
2. **Backend Connection**: Verify MongoDB is running and environment variables are set
3. **LinkedIn Access**: Ensure you're logged into LinkedIn and the extension has proper permissions
4. **Content Script Errors**: Check browser console for JavaScript errors

### Debug Mode
Enable debug logging by checking browser console and backend logs for detailed error information.

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For technical support or questions about the LinkedIn automation system, please contact the development team.

---

**Note**: This system is designed for legitimate business automation. Users are responsible for complying with LinkedIn's terms of service and applicable laws.
