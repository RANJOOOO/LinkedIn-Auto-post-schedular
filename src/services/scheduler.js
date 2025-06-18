// scheduler.js
const schedulerService = {
  // Get all scheduled posts
  async getScheduledPosts() {
    const posts = JSON.parse(localStorage.getItem('scheduled_posts') || '[]');
    return posts.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  },

  // Schedule a new post
  async schedulePost(post, date) {
    const posts = await this.getScheduledPosts();
    const newPost = {
      ...post,
      id: Date.now().toString(),
      scheduledDate: date,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    
    // Check for scheduling conflicts
    const hasConflict = posts.some(p => 
      new Date(p.scheduledDate).getTime() === new Date(date).getTime()
    );

    if (hasConflict) {
      throw new Error('Scheduling conflict: Another post is already scheduled for this time');
    }

    posts.push(newPost);
    localStorage.setItem('scheduled_posts', JSON.stringify(posts));
    return newPost;
  },

  // Update scheduled post
  async updateScheduledPost(postId, updates) {
    const posts = await this.getScheduledPosts();
    const index = posts.findIndex(p => p.id === postId);
    
    if (index === -1) {
      throw new Error('Post not found');
    }

    // Check for conflicts if date is being updated
    if (updates.scheduledDate) {
      const hasConflict = posts.some(p => 
        p.id !== postId && 
        new Date(p.scheduledDate).getTime() === new Date(updates.scheduledDate).getTime()
      );

      if (hasConflict) {
        throw new Error('Scheduling conflict: Another post is already scheduled for this time');
      }
    }

    posts[index] = { ...posts[index], ...updates };
    localStorage.setItem('scheduled_posts', JSON.stringify(posts));
    return posts[index];
  },

  // Delete scheduled post
  async deleteScheduledPost(postId) {
    const posts = await this.getScheduledPosts();
    const updatedPosts = posts.filter(p => p.id !== postId);
    localStorage.setItem('scheduled_posts', JSON.stringify(updatedPosts));
  },

  // Get posts scheduled for a specific date range
  async getPostsByDateRange(startDate, endDate) {
    const posts = await this.getScheduledPosts();
    return posts.filter(post => {
      const postDate = new Date(post.scheduledDate);
      return postDate >= startDate && postDate <= endDate;
    });
  },

  // Get next available time slot
  async getNextAvailableSlot(date) {
    const posts = await this.getScheduledPosts();
    const scheduledTimes = posts.map(p => new Date(p.scheduledDate).getTime());
    
    let proposedTime = new Date(date);
    while (scheduledTimes.includes(proposedTime.getTime())) {
      proposedTime.setMinutes(proposedTime.getMinutes() + 30);
    }
    
    return proposedTime;
  }
};

export default schedulerService;