import { Server } from "socket.io";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/database";

interface MatchTimer {
  matchId: number;
  intervalId: NodeJS.Timeout;
  remainingTime: number;
  isRunning: boolean;
}

class TimerService {
  private static instance: TimerService;
  private io: Server | null = null;
  private activeTimers: Map<number, MatchTimer> = new Map();

  private constructor() {}

  public static getInstance(): TimerService {
    if (!TimerService.instance) {
      TimerService.instance = new TimerService();
    }
    return TimerService.instance;
  }

  public setIO(io: Server): void {
    this.io = io;
  }

  /**
   * Start countdown timer for a match question
   */
  public startTimer(matchId: number, initialTime: number): void {
    // Stop existing timer if any
    this.stopTimer(matchId);

    const timer: MatchTimer = {
      matchId,
      remainingTime: initialTime,
      isRunning: true,
      intervalId: setInterval(async () => {
        await this.tick(matchId);
      }, 1000) // Update every second
    };

    this.activeTimers.set(matchId, timer);
    
    logger.info(`⏰ Timer started for match ${matchId} with ${initialTime} seconds`);
  }

  /**
   * Stop timer for a match
   */
  public stopTimer(matchId: number): void {
    const timer = this.activeTimers.get(matchId);
    if (timer) {
      clearInterval(timer.intervalId);
      timer.isRunning = false;
      this.activeTimers.delete(matchId);
      
      logger.info(`⏹️ Timer stopped for match ${matchId}`);
    }
  }

  /**
   * Pause timer for a match
   */
  public pauseTimer(matchId: number): void {
    const timer = this.activeTimers.get(matchId);
    if (timer && timer.isRunning) {
      clearInterval(timer.intervalId);
      timer.isRunning = false;
      
      logger.info(`⏸️ Timer paused for match ${matchId} at ${timer.remainingTime} seconds`);
    }
  }

  /**
   * Resume timer for a match
   */
  public resumeTimer(matchId: number): void {
    const timer = this.activeTimers.get(matchId);
    if (timer && !timer.isRunning) {
      timer.intervalId = setInterval(async () => {
        await this.tick(matchId);
      }, 1000);
      timer.isRunning = true;
      
      logger.info(`▶️ Timer resumed for match ${matchId} with ${timer.remainingTime} seconds`);
    }
  }

  /**
   * Get current timer status
   */
  public getTimerStatus(matchId: number): { remainingTime: number; isRunning: boolean } | null {
    const timer = this.activeTimers.get(matchId);
    if (timer) {
      return {
        remainingTime: timer.remainingTime,
        isRunning: timer.isRunning
      };
    }
    return null;
  }

  /**
   * Set remaining time manually
   */
  public setRemainingTime(matchId: number, remainingTime: number): void {
    const timer = this.activeTimers.get(matchId);
    if (timer) {
      timer.remainingTime = remainingTime;
      
      // Update database
      this.updateMatchTimer(matchId, remainingTime);
      
      // Broadcast update
      this.broadcastTimerUpdate(matchId, remainingTime);
    }
  }

  /**
   * Timer tick - called every second
   */
  private async tick(matchId: number): Promise<void> {
    const timer = this.activeTimers.get(matchId);
    if (!timer || !timer.isRunning) {
      return;
    }

    timer.remainingTime--;

    // Update database every 5 seconds or when time is critical
    if (timer.remainingTime % 5 === 0 || timer.remainingTime <= 10) {
      await this.updateMatchTimer(matchId, timer.remainingTime);
    }

    // Broadcast timer update
    this.broadcastTimerUpdate(matchId, timer.remainingTime);

    // Handle time up
    if (timer.remainingTime <= 0) {
      await this.handleTimeUp(matchId);
    }
  }

  /**
   * Update match timer in database
   */
  private async updateMatchTimer(matchId: number, remainingTime: number): Promise<void> {
    try {
      await prisma.match.update({
        where: { id: matchId },
        data: { remainingTime: remainingTime }
      });
    } catch (error) {
      logger.error(`Failed to update timer for match ${matchId}:`, error);
    }
  }

  /**
   * Broadcast timer update to all clients in match room
   */
  private broadcastTimerUpdate(matchId: number, remainingTime: number): void {
    if (!this.io) return;

    const roomName = `match-${matchId}`;
    
    // 🔥 UPDATE: Broadcast timer:update event từ timer.event.ts
    const timerData = {
      timeRemaining: remainingTime,
      isActive: true,
      isPaused: false,
      updatedAt: new Date().toISOString()
    };

    // Broadcast to match control namespace
    this.io.of("/match-control").to(roomName).emit("timer:update", timerData);

    // Also broadcast to student namespace
    this.io.of("/student").to(roomName).emit("timer:update", timerData);

    // Send warning when time is running low
    if (remainingTime === 30 || remainingTime === 10 || remainingTime === 5) {
      const warningData = {
        matchId: matchId,
        remainingTime: remainingTime,
        message: `⚠️ ${remainingTime} giây còn lại!`
      };

      // Warning to match control
      this.io.of("/match-control").to(roomName).emit("match:timerWarning", warningData);

      // Warning to students
      this.io.of("/student").to(roomName).emit("match:timerWarning", warningData);
    }
  }

  /**
   * Handle when time is up
   */
  private async handleTimeUp(matchId: number): Promise<void> {
    this.stopTimer(matchId);

    if (!this.io) return;

    const roomName = `match-${matchId}`;
    
    // Get current question info
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { currentQuestion: true }
    });

    // Emit time up event to match control
    this.io.of("/match-control").to(roomName).emit("match:timeUp", {
      matchId: matchId,
      questionOrder: match?.currentQuestion || 0,
      timeUpAt: new Date().toISOString()
    });

    // Also emit to students
    this.io.of("/student").to(roomName).emit("match:timeUp", {
      matchId: matchId,
      questionOrder: match?.currentQuestion || 0,
      timeUpAt: new Date().toISOString()
    });

    logger.info(`⏰ Time up for match ${matchId}, question ${match?.currentQuestion || 0}`);
  }

  /**
   * Clean up all timers (for shutdown)
   */
  public cleanup(): void {
    for (const [matchId, timer] of this.activeTimers) {
      clearInterval(timer.intervalId);
    }
    this.activeTimers.clear();
    logger.info("🧹 All timers cleaned up");
  }

  /**
   * Get all active timers (for debugging)
   */
  public getActiveTimers(): Array<{ matchId: number; remainingTime: number; isRunning: boolean }> {
    return Array.from(this.activeTimers.entries()).map(([matchId, timer]) => ({
      matchId,
      remainingTime: timer.remainingTime,
      isRunning: timer.isRunning
    }));
  }
}

export const timerService = TimerService.getInstance(); 