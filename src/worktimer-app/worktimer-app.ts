// DOCUMENTATION GUIDELINES  https://www.polymer-project.org/1.0/docs/tools/documentation#type-annotation
/// <reference path="../../typings/index.d.ts" />

/**
# The Work Timer Application core

A simple application to monitor daily working time. Storing data on localStorage.

Using MicroSoft TypeScript. Displaying only one page (panel).

Including a START/STOP button. A button to correct OVERTIME.

Some timer data on;
* start working time,
* how much time already worked today,
* overtime of previous working days,
* time to stop working.

*/

interface TimerData {
    "currentDate": string;          // Last TIMER usage. Format YYMMDD
    "dailyWorkSeconds": number;     // Worktime today (8 hours)
    "saldoSeconds": number;         // Total number of seconds, for work overtime.
    "startTimeMilliSec": number;    // When the TIMER is started (date and time) in UNIX milliseconds
    "notification": string;         // Notification status;  'granted', 'denied', or 'default'.
    "notificationSend": boolean;    // Is notification given today, allowing only one per day
}

// declare var Notification: Notification; // Or download 'chrome.d.ts', which I did but it didn't work.

Polymer({

    // If localStore 'timerStorage' does not exist, create one.
    _initializeTimerData: function () {
        this._timerData = <TimerData>{
            "startTimeMilliSec": 0,     // When the TIMER is started (date and time) in miliseconds.
            "saldoSeconds": 0,          // Total number of seconds, for overtime.
            "currentDate": this._shortDateYYMMDD(new Date().getTime()), // Last date TIMER usage
            "dailyWorkSeconds": 0,      // Worktime today (8 hours), in seconds
            "notification": "default",  // Notification status;  'granted', 'denied', or 'default'.
            "notificationSend": false   // Notification not yet given
        };
    },

    // Process new OVERTIME data, entered by the user. Format (H)HMM, no ':'.
    _onTapAcceptNewOverwork: function () {
        let minutes = parseInt(this.$.timedigits.number.slice(-2));
        let hours = Math.floor(parseInt(this.$.timedigits.number, 10) / 100);

        this.set("_timerData.saldoSeconds", (hours * 60 * 60 + minutes * 60).toString());
        this.overtime = this._printTimeHHMM(this._timerData.saldoSeconds);
    },

    // Activate modal popup to change overtime.
    _onTapOpenModal: function (e) {
        this.$.timedigits.number = this.overtime.replace(/:/, '');
        this.$.paperDialog.open();
    },

    // Print HH:MM. Time as DATE object or number as SECONDS.
    _printTimeHHMM: function (time: any, leadingZero?: boolean): String {
        let hours: number = 0;
        let minutes: number = 0;
        let retVal: String;
        let isNegative: Boolean = false;

        if (time) {
            if (typeof time === "object") {
                // Expected to be a Date object.
                hours = time.getHours();
                minutes = time.getMinutes();
            } else {
                isNegative = time < 0;
                time = Math.abs(time);

                // Just a number of SECONDS.
                hours = Math.floor(time / 60 / 60);
                minutes = Math.floor((time / 60) - (hours * 60));
                hours = hours > 23 ? hours - 24 : hours;
            }
        }

        retVal = (leadingZero ? ("0" + hours).slice(-2) : hours) + ":" + ("0" + minutes).slice(-2);

        return isNegative ? "-" + retVal : retVal;
    },

    // ID of the display refresh timer function.
    _repaintIn60SecsTimer: null,

    // Returns a string, containing YYMMDD date format
    _shortDateYYMMDD: function (milliseconds: Number): String {
        let date = milliseconds ? new Date(milliseconds) : new Date();
        return date.getFullYear().toString().slice(-2) + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2);
    },

    // Start timer
    _startWork: function () {
        this.set("_timerData.startTimeMilliSec", new Date().getTime());
        this.isTimerActive = true;
    },

    // Stop timer
    _stopWork: function () {
        let beginTime   = this._timerData.startTimeMilliSec;
        let dwt         = this._timerData.dailyWorkSeconds;
        let endTime     = new Date().getTime();

        this.set("_timerData.dailyWorkSeconds", parseInt(dwt, 10) + Math.round((endTime - beginTime) / 1000));
        this.set("_timerData.startTimeMilliSec", 0);
        this.isTimerActive = false;
    },

    // Show the END TIME for a full 8 hours work day, overtime included
    _showEndTime: function (beginTime) {
        if (beginTime) {
            if (!this._showStopWorking.bind(this, beginTime)()) {
                // If showStopMessage is displayed, HIDE the END TIME message
                return true;
            } else {
                // Calculate new END TIME, using overtime and currunt work times
                let currentTime = new Date().getTime(),
                    stillToWorkSeconds: number,
                    workInSec = this._timerData.dailyWorkSeconds + Math.round((currentTime - beginTime) / 1000);

                stillToWorkSeconds  = (8 * 3600) - this._timerData.saldoSeconds - workInSec;
                currentTime         = stillToWorkSeconds + (new Date().getHours() * 3600) + (new Date().getMinutes() * 60);
                this.endWorkTime    = this._printTimeHHMM(currentTime, true);

                return stillToWorkSeconds <= 0;
            }
        } else {
            // Begin time is '0', meaning timer is stopped, don't show END TIME.
            return true;
        }
    },

    // Show 'Stop working' message, when a full workday (8 hours) is fullfilled.
    _showStopWorking: function (beginTime) {
        if (beginTime) {
            // Working hours today, plus OVERTIME (days before), greater then 8 hours
            let endTime   = new Date().getTime();
            let workInSec = parseInt(this._timerData.dailyWorkSeconds, 10) + Math.round((endTime - beginTime) / 1000);
            return Math.floor((workInSec + this._timerData.saldoSeconds) / 60 / 60) >= 8 ? false : true;
        } else {
            return true;
        }
    },

    // Fired when 'this._timerData.startTimeMilliSec' has been changed with START, STOP button
    _manageTimerData: function (startTime: number) {

        // This can happen when local storage is destroyed, externally
        if (this._timerData === null) {
            // Let <iron-localstorage  ...> do it's initializations process
            return;
        }

        if (startTime === 0) {
            // Timer session stopped or initialized. Waiting for user to START.
            let currentDate = this._shortDateYYMMDD(new Date().getTime());

            this.isTimerActive = false;

            // Check if last work date was in the past.
            // If so, correct SALDO on overtime.
            if (this._timerData.currentDate !== currentDate) {
                let workDay = new Date(parseInt("20" + this._timerData.currentDate.substr(0, 2), 10),
                                       parseInt(this._timerData.currentDate.substr(2, 2), 10) - 1,
                                       this._timerData.currentDate.substr(4, 2)).getDay();
                this._timerData.currentDate = currentDate;

                // Correcting by 8 hours work day, to seconds.
                // Increasing OVERTIME when 'dailyWorkSeconds' exceeds 8 hour work day (mo, th, we, th, fr).
                if (workDay < 1 || workDay > 5) {
                    // 0:Sunday, 6:Saturday is weekend, always OVERTIME
                    this._timerData.saldoSeconds = parseInt(this._timerData.saldoSeconds, 10) +
                        parseInt(this._timerData.dailyWorkSeconds, 10);
                } else {
                    // Weekdays: mo, tu, we, th, fr are works day, 8 hours.
                    this._timerData.saldoSeconds = parseInt(this._timerData.saldoSeconds, 10) +
                        (parseInt(this._timerData.dailyWorkSeconds, 10) - 8 * 60 * 60);
                }

                // Daily worked time has been processed in 'saldoSeconds'.
                this._timerData.dailyWorkSeconds = 0;
            }

            this.overtime       = this._printTimeHHMM(this._timerData.saldoSeconds);
            this.workingTime    = this._printTimeHHMM(this._timerData.dailyWorkSeconds, false);
            this.timerStartTime = "-:--";

            if (this._timerData.saldoSeconds < 0) {
                this.$.overtime.classList.add("timer--time__noovertime");
            } else {
                this.$.overtime.classList.remove("timer--time__noovertime");
            }

            // Cancel REPAINT display if active, because timer is stopped.
            // No updates needed.
            if (this._repaintIn60SecsTimer) {
                clearInterval(this._repaintIn60SecsTimer);
                this._repaintIn60SecsTimer = null;
            }

        } else {
            // Timer session is STARTED
            if (this._timerData) {
                let beginTime = this._timerData.startTimeMilliSec;
                let endTime   = new Date().getTime();

                this.isTimerActive = true;

                function updateDisplay () {
                    let beginTime = this._timerData.startTimeMilliSec;
                    let endTime   = new Date().getTime();
                    let workInSec = parseInt(this._timerData.dailyWorkSeconds, 10) + Math.round((endTime - beginTime) / 1000);
                    let workDay   = new Date(
                            parseInt("20" + this._timerData.currentDate.substr(0, 2), 10),
                            parseInt(this._timerData.currentDate.substr(2, 2), 10) - 1,
                            this._timerData.currentDate.substr(4, 2)
                        ).getDay();     // 0:su, 1:mo ...

                    this.workingTime =
                        this._printTimeHHMM(workInSec, false);

                    this._showStopWorking(beginTime);
                    this._showEndTime(beginTime);

                    /*
                        Notification.permission Read only
                            A string representing the current permission to display notifications.
                            Possible value are: denied (the user refuses to have notifications displayed),
                            granted (the user accepts having notifications displayed),
                            or default (the user choice is unknown and therefore the browser will act as if the value were denied).
                    */

                    // TODO: bad design -> this._timerData.notification, use notications

                    if (this._timerData.notificationSend && this._timerData.notification === "granted") {
                        // Show 8 hours worked notification, only on work days
                        // mo, tu, we, th, fr
                        if (workDay > 0 || workDay < 6) {
                            let totalWorkDayHours = Math.floor(workInSec / 60 / 60);
                            if (totalWorkDayHours >= 8) {
                                // https://developer.mozilla.org/en/docs/Web/API/notification
                                let notification = new Notification('At Work', {
                                    body:   'U heeft vandaag 8 uur gewerkt.',
                                    // ??NO SUPPORT?? badge:  '/images/manifest/icon-144x144.png',
                                    icon:   '/images/manifest/icon-72x72.png',
                                    // ??NO SUPPORT?? requireInteraction: true
                                });

                                notification.onshow = function() {
                                    console.log('Notification shown');
                                };

                                this._timerData.notificationSend = true;
                            }
                        }
                    }
                }

                // Timer becomes ACTIVE or was active (reload App). Now waiting for the user to STOP.
                this._repaintIn60SecsTimer = setInterval(updateDisplay.bind(this), 60000);  // One minute REPAINT

                // Repaint defaults
                this.workingTime    = this._printTimeHHMM(parseInt(this._timerData.dailyWorkSeconds, 10) +
                                        Math.round((endTime - beginTime) / 1000));
                this.timerStartTime = this._printTimeHHMM(new Date(beginTime));
                this.overtime       = this._printTimeHHMM(this._timerData.saldoSeconds);
            } else {
                this.workingTime    = this._printTimeHHMM(0);
                this.timerStartTime = "-:--";
                this.overtime       = this._printTimeHHMM(0);
                this.stopWorkingAtTime = "";
            }

        }
    },

    is: 'worktimer-app',

    // START, STOP button triggers changes in '_timerData.startTimeMilliSec'.
    observers: [
        "_manageTimerData(_timerData.startTimeMilliSec)"
    ],

    properties: {
        // You can stop working at time
        endWorkTime: {
            type: String,
            value: '00:00',
        },

        // TRUE when timer is active and user is working
        isTimerActive: {
            type: Boolean,
            value: false,
        },

        // Working overtime in the past.
        overtime: {
            type: String,
            value: '0:00',
        },

        // Timer started at
        timerStartTime: {
            type: String,
            value: '00:00',
        },

        // Time worked today, updated per minute
        workingTime: {
            type: String,
            value: '0:00',
        },

        // Timer Object with data on user working progress (in local Storage)
        _timerData: {
            type: Object,
        },
    },

    ready: function () {
        let that = this;
        // TODO: SOLVE THIS Notification stuff

        // DEPRECATED CODE
        // https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission
        Notification.requestPermission(function (permission) {
            that._timerData.notification = permission;
        });

        // STANDARD CODE
        // Notification as PROMISE, https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission
        /*
        Notification.requestPermission().then(function (permission) {
            that._timerData.notification = permission;
        });
        */
    },

});