import { Component, OnInit } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  currentTime: string = '';
  timerDisplay: string = '';
  duration: number = 0;
  isRunning: boolean = false;
  paused: boolean = false;
  countdown: any;
  cycleState: 'idle' | 'work' | 'break' = 'idle';

  radius: number = 100;
  circumference: number = 2 * Math.PI * this.radius;
  strokeDashoffset: number = this.circumference;

  constructor() {
    // Handle back button to exit the app
    App.addListener('backButton', () => {
      App.exitApp();
    });
  }

  ngOnInit() {
    this.requestNotificationPermission();
    setInterval(() => {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString();
    }, 1000);
  }

  async requestNotificationPermission() {
    if (Capacitor.getPlatform() === 'android') {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        console.error('Notification permission not granted!');
      }
    }
  }

  updateDisplay() {
    const mins = Math.floor(this.duration / 60);
    const secs = this.duration % 60;
    this.timerDisplay = `${this.pad(mins)}:${this.pad(secs)}`;

    const progress = this.duration / (this.cycleState === 'work' ? 25 * 60 : 5 * 60);
    this.strokeDashoffset = this.circumference * (1 - progress);
  }

  pad(val: number): string {
    return val < 10 ? '0' + val : val.toString();
  }

  startPomodoro() {
    this.startTimer(25 * 60, 'work');
  }

  startTimer(seconds: number, type: 'work' | 'break') {
    this.duration = seconds;
    this.cycleState = type;
    this.isRunning = true;
    this.paused = false;
    this.updateDisplay();

    this.countdown = setInterval(() => {
      if (!this.paused) {
        this.duration--;
        this.updateDisplay();

        if (this.duration <= 0) {
          clearInterval(this.countdown);
          this.fireSessionEnd();
        }
      }
    }, 1000);
  }

  pauseTimer() {
    this.isRunning = false;
    this.paused = true;
  }

  resumeTimer() {
    this.isRunning = true;
    this.paused = false;
  }

  resetPomodoro() {
    clearInterval(this.countdown);
    this.duration = 0;
    this.isRunning = false;
    this.paused = false;
    this.cycleState = 'idle';
    this.timerDisplay = '';
    this.strokeDashoffset = this.circumference;
  }

  async fireSessionEnd() {
    if (this.cycleState === 'work') {
      await this.sendNotification('Work session ended! Time for a break.');
      this.playSound('work-end.mp3');
      this.startTimer(5 * 60, 'break');
    } else {
      await this.sendNotification('Break ended! Ready to work again.');
      this.playSound('break-end.mp3');
      this.resetPomodoro();
    }
    this.triggerVibration();
  }

  async sendNotification(text: string) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Pomodoro Timer',
          body: text,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) },
        },
      ],
    });
  }

  triggerVibration() {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Use Haptics for vibration feedback
    Haptics.impact({ style: ImpactStyle.Heavy });
  }

  playSound(file: string) {
    const audio = new Audio(`assets/sounds/${file}`);
    audio.play();
  }
}