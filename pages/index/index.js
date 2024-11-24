Page({
  data: {
    habits: [
      { id: 1, name: '锻炼', completed: false, lastEditDate: '' },
      { id: 2, name: '阅读', completed: false, lastEditDate: '' },
      { id: 3, name: '冥想', completed: false, lastEditDate: '' },
      { id: 4, name: '喝水', completed: false, lastEditDate: '' },
    ],
    points: 0,
    level: 1,
    achievements: [
      { id: 1, name: '第一个习惯', description: '完成你的第一个习惯', explanation: '你已经迈出了第一步！', unlocked: false },
      { id: 2, name: '习惯大师', description: '在一天内完成所有习惯', explanation: '你真是太棒了！', unlocked: false },
      { id: 3, name: '升级', description: '达到下一等级', explanation: '继续加油，你正在进步！', unlocked: false },
    ],
    newHabitName: '',
    editingHabit: null,
    weeklyData: [],
    showEditDialog: false,
    maxHabits: 4,
    showTooltip: false,
    historyData: [],
  },

  onLoad() {
    this.loadData()
    this.checkAndResetHabits()
    this.generateWeeklyData()
  },

  // Load data from storage
  loadData() {
    try {
      const habits = wx.getStorageSync('habits')
      const points = wx.getStorageSync('points')
      const level = wx.getStorageSync('level')
      const achievements = wx.getStorageSync('achievements')
      const weeklyData = wx.getStorageSync('weeklyData')
      const historyData = wx.getStorageSync('historyData')

      // Only update if data exists in storage
      if (habits) this.setData({ habits })
      if (points !== '') this.setData({ points })
      if (level) this.setData({ level })
      if (achievements) this.setData({ achievements })
      if (weeklyData) this.setData({ weeklyData })
      if (historyData) this.setData({ historyData })
      
      // Update maxHabits based on loaded habits
      if (habits) {
        this.setData({ maxHabits: habits.length })
      }

      // Generate weekly data after loading history
      if (historyData) {
        this.generateWeeklyData(historyData)
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    }
  },

  // Save data to storage
  saveData() {
    try {
      wx.setStorageSync('habits', this.data.habits)
      wx.setStorageSync('points', this.data.points)
      wx.setStorageSync('level', this.data.level)
      wx.setStorageSync('achievements', this.data.achievements)
      wx.setStorageSync('weeklyData', this.data.weeklyData)
      wx.setStorageSync('historyData', this.data.historyData)
    } catch (e) {
      console.error('Failed to save data:', e)
    }
  },

  // Update existing methods to save data after changes
  toggleHabit(e) {
    const currentDate = new Date().toISOString().split('T')[0]
    const id = e.currentTarget.dataset.id
    const habits = this.data.habits.map(habit =>
      habit.id === id 
        ? { ...habit, completed: !habit.completed, lastEditDate: currentDate } 
        : habit
    )
    
    const habitToToggle = this.data.habits.find(habit => habit.id === id)
    let newPoints = this.data.points

    if (habitToToggle) {
      if (!habitToToggle.completed) {
        newPoints += 10
      } else {
        newPoints = Math.max(0, newPoints - 10)
      }

      this.setData({ points: newPoints })
      this.checkLevelUp(newPoints)
      this.checkAchievements(habits, newPoints)
    }

    this.setData({ habits }, () => {
      this.updateTodayCompletion(habits)
      this.saveData()
    })
  },

  addHabit() {
    if (this.data.newHabitName.trim()) {
      const habits = this.data.habits
      const currentDate = new Date().toISOString().split('T')[0]
      const newHabit = {
        id: habits.length > 0 ? Math.max(...habits.map(h => h.id)) + 1 : 1,
        name: this.data.newHabitName.trim(),
        completed: false,
        lastEditDate: currentDate
      }

      const updatedHabits = [...habits, newHabit]
      
      // Update history for today with new target
      const historyEntry = {
        date: currentDate,
        target: updatedHabits.length,
        completion: updatedHabits.filter(h => h.completed).length
      }

      // Update or add to history
      const historyData = [...this.data.historyData]
      const existingIndex = historyData.findIndex(h => h.date === currentDate)
      if (existingIndex >= 0) {
        historyData[existingIndex] = historyEntry
      } else {
        historyData.push(historyEntry)
      }

      this.setData({
        habits: updatedHabits,
        newHabitName: '',
        maxHabits: updatedHabits.length,
        historyData
      }, () => {
        this.generateWeeklyData()
        this.saveData()
      })
    }
  },

  saveEditHabit() {
    if (this.data.editingHabit && this.data.newHabitName.trim()) {
      const habits = this.data.habits.map(h =>
        h.id === this.data.editingHabit.id ? { ...h, name: this.data.newHabitName.trim() } : h
      )
      this.setData({
        habits,
        editingHabit: null,
        newHabitName: '',
        showEditDialog: false
      }, () => {
        this.saveData() // Save after editing habit
      })
    }
  },

  deleteHabit(e) {
    const id = e.currentTarget.dataset.id
    const currentDate = new Date().toISOString().split('T')[0]
    
    // Get the habit before deletion to check if it was completed
    const habitToDelete = this.data.habits.find(h => h.id === id)
    let newPoints = this.data.points
    
    // If the habit was completed, decrease points
    if (habitToDelete && habitToDelete.completed) {
      newPoints = Math.max(0, newPoints - 10)
    }
    
    // First update the habit's completed status to false
    const updatedHabits = this.data.habits.map(h => 
      h.id === id ? { ...h, completed: false } : h
    )
    
    // Remove the habit
    const habits = updatedHabits.filter(h => h.id !== id)
    
    // Update history for today with new target
    const historyEntry = {
      date: currentDate,
      target: habits.length,
      completion: habits.filter(h => h.completed).length
    }

    // Update or add to history
    const historyData = [...this.data.historyData]
    const existingIndex = historyData.findIndex(h => h.date === currentDate)
    if (existingIndex >= 0) {
      historyData[existingIndex] = historyEntry
    } else {
      historyData.push(historyEntry)
    }
    
    this.setData({ 
      habits,
      maxHabits: habits.length,
      historyData,
      points: newPoints
    }, () => {
      this.generateWeeklyData()
      this.checkAchievements(habits, newPoints)
      this.saveData()
    })
  },

  checkAchievements(updatedHabits, newPoints) {
    const newAchievements = [...this.data.achievements]
    
    // First achievement: Complete first habit (10 points)
    if (newPoints >= 10) {
      newAchievements[0].unlocked = true
    } else {
      newAchievements[0].unlocked = false
    }
    
    // Second achievement: Complete all habits in one day
    if (updatedHabits.every(habit => habit.completed)) {
      newAchievements[1].unlocked = true
    } else {
      newAchievements[1].unlocked = false
    }
    
    // Third achievement: Reach level 2 (50 points)
    if (newPoints >= 50) {
      newAchievements[2].unlocked = true
    } else {
      newAchievements[2].unlocked = false
    }
    
    this.setData({ achievements: newAchievements }, () => {
      this.saveData()
    })
  },

  updateTodayCompletion(habits) {
    const today = new Date().toISOString().split('T')[0]
    const completedCount = habits.filter(h => h.completed).length
    
    // Create or update history entry for today
    const historyEntry = {
      date: today,
      target: habits.length,
      completion: completedCount
    }

    // Update or add to history
    const historyData = [...this.data.historyData]
    const existingIndex = historyData.findIndex(h => h.date === today)
    if (existingIndex >= 0) {
      historyData[existingIndex] = historyEntry
    } else {
      historyData.push(historyEntry)
    }

    // Update weekly data with new format
    this.generateWeeklyData(historyData)

    this.setData({ 
      historyData,
      maxHabits: habits.length
    }, () => {
      this.saveData()
    })
  },

  generateWeeklyData(historyData = this.data.historyData) {
    const weekData = []
    const today = new Date()
    
    // Generate data for the past 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const monthDate = `${date.getMonth() + 1}/${date.getDate()}`
      
      // Find history entry for this date
      const historyEntry = historyData.find(h => h.date === dateStr) || {
        target: 0,
        completion: 0
      }
      
      // Calculate chart-value as a number
      const chartValue = historyEntry.target > 0 
        ? historyEntry.completion / historyEntry.target
        : 0
      
      weekData.push({
        date: dateStr,
        displayDate: monthDate,
        target: historyEntry.target,
        completion: historyEntry.completion,
        'chart-value': chartValue
      })
    }

    console.log('Weekly Data:', weekData) // Debug log
    this.setData({ weeklyData: weekData })
  },

  checkLevelUp(newPoints) {
    const newLevel = Math.floor(newPoints / 50) + 1
    if (newLevel !== this.data.level) {
      this.setData({ level: newLevel })
    }
  },

  onInputChange(e) {
    this.setData({ newHabitName: e.detail.value })
  },

  startEditHabit(e) {
    const habit = this.data.habits.find(h => h.id === e.currentTarget.dataset.id)
    this.setData({
      editingHabit: habit,
      newHabitName: habit.name,
      showEditDialog: true
    })
  },

  cancelEdit() {
    this.setData({
      editingHabit: null,
      newHabitName: '',
      showEditDialog: false
    })
  },

  toggleTooltip() {
    this.setData({
      showTooltip: !this.data.showTooltip
    });
  },

  checkAndResetHabits() {
    const currentDate = new Date().toISOString().split('T')[0]
    let needsReset = false;
    
    const habits = this.data.habits.map(habit => {
      if (habit.lastEditDate !== currentDate) {
        needsReset = true;
        return { ...habit, completed: false, lastEditDate: currentDate }
      }
      return habit
    })
    
    if (needsReset) {
      // Add a new history entry for the new day
      const historyEntry = {
        date: currentDate,
        target: habits.length,
        completion: 0
      }
      
      const historyData = [...this.data.historyData, historyEntry]
      
      const achievements = this.data.achievements.map(achievement => ({
        ...achievement,
        unlocked: false
      }))
      
      this.setData({ 
        habits,
        achievements,
        historyData
      }, () => {
        this.generateWeeklyData()
        this.saveData()
      })
    }
  },
})