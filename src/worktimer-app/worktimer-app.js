// DOCUMENTATION GUIDELINES  https://www.polymer-project.org/1.0/docs/tools/documentation#type-annotation
/// <reference path="../../typings/index.d.ts" />
// declare var Notification: Notification; // Or download 'chrome.d.ts', which I did but it didn't work.
Polymer({
    // If localStore 'timerStorage' does not exist, create one.
    _initializeTimerData: function () {
        this._timerData = {
            "startTimeMilliSec": 0,
            "saldoSeconds": 0,
            "currentDate": this._shortDateYYMMDD(new Date().getTime()),
            "dailyWorkSeconds": 0,
            "notification": "default",
            "notificationSend": false // Notification not yet given
        };
    },
    // Process new OVERTIME data, entered by the user. Format (H)HMM, no ':'.
    _onTapAcceptNewOverwork: function () {
        var minutes = parseInt(this.$.timedigits.number.slice(-2));
        var hours = Math.floor(parseInt(this.$.timedigits.number, 10) / 100);
        this.set("_timerData.saldoSeconds", (hours * 60 * 60 + minutes * 60).toString());
        this.overtime = this._printTimeHHMM(this._timerData.saldoSeconds);
    },
    // Activate modal popup to change overtime.
    _onTapOpenModal: function (e) {
        this.$.timedigits.number = this.overtime.replace(/:/, '');
        this.$.paperDialog.open();
    },
    // Print HH:MM. Time as DATE object or number as SECONDS.
    _printTimeHHMM: function (time, leadingZero) {
        var hours = 0;
        var minutes = 0;
        var retVal;
        var isNegative = false;
        if (time) {
            if (typeof time === "object") {
                // Expected to be a Date object.
                hours = time.getHours();
                minutes = time.getMinutes();
            }
            else {
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
    _shortDateYYMMDD: function (milliseconds) {
        var date = milliseconds ? new Date(milliseconds) : new Date();
        return date.getFullYear().toString().slice(-2) + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2);
    },
    // Start timer
    _startWork: function () {
        this.set("_timerData.startTimeMilliSec", new Date().getTime());
        this.isTimerActive = true;
    },
    // Stop timer
    _stopWork: function () {
        var beginTime = this._timerData.startTimeMilliSec;
        var dwt = this._timerData.dailyWorkSeconds;
        var endTime = new Date().getTime();
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
            }
            else {
                // Calculate new END TIME, using overtime and currunt work times
                var currentTime = new Date().getTime(), stillToWorkSeconds = void 0, workInSec = this._timerData.dailyWorkSeconds + Math.round((currentTime - beginTime) / 1000);
                stillToWorkSeconds = (8 * 3600) - this._timerData.saldoSeconds - workInSec;
                currentTime = stillToWorkSeconds + (new Date().getHours() * 3600) + (new Date().getMinutes() * 60);
                this.endWorkTime = this._printTimeHHMM(currentTime, true);
                return stillToWorkSeconds <= 0;
            }
        }
        else {
            // Begin time is '0', meaning timer is stopped, don't show END TIME.
            return true;
        }
    },
    // Show 'Stop working' message, when a full workday (8 hours) is fullfilled.
    _showStopWorking: function (beginTime) {
        if (beginTime) {
            // Working hours today, plus OVERTIME (days before), greater then 8 hours
            var endTime = new Date().getTime();
            var workInSec = parseInt(this._timerData.dailyWorkSeconds, 10) + Math.round((endTime - beginTime) / 1000);
            return Math.floor((workInSec + this._timerData.saldoSeconds) / 60 / 60) >= 8 ? false : true;
        }
        else {
            return true;
        }
    },
    // Fired when 'this._timerData.startTimeMilliSec' has been changed with START, STOP button
    _manageTimerData: function (startTime) {
        // This can happen when local storage is destroyed, externally
        if (this._timerData === null) {
            // Let <iron-localstorage  ...> do it's initializations process
            return;
        }
        if (startTime === 0) {
            // Timer session stopped or initialized. Waiting for user to START.
            var currentDate = this._shortDateYYMMDD(new Date().getTime());
            this.isTimerActive = false;
            // Check if last work date was in the past.
            // If so, correct SALDO on overtime.
            if (this._timerData.currentDate !== currentDate) {
                var workDay = new Date(parseInt("20" + this._timerData.currentDate.substr(0, 2), 10), parseInt(this._timerData.currentDate.substr(2, 2), 10) - 1, this._timerData.currentDate.substr(4, 2)).getDay();
                this._timerData.currentDate = currentDate;
                // Correcting by 8 hours work day, to seconds.
                // Increasing OVERTIME when 'dailyWorkSeconds' exceeds 8 hour work day (mo, th, we, th, fr).
                if (workDay < 1 || workDay > 5) {
                    // 0:Sunday, 6:Saturday is weekend, always OVERTIME
                    this._timerData.saldoSeconds = parseInt(this._timerData.saldoSeconds, 10) +
                        parseInt(this._timerData.dailyWorkSeconds, 10);
                }
                else {
                    // Weekdays: mo, tu, we, th, fr are works day, 8 hours.
                    this._timerData.saldoSeconds = parseInt(this._timerData.saldoSeconds, 10) +
                        (parseInt(this._timerData.dailyWorkSeconds, 10) - 8 * 60 * 60);
                }
                // Daily worked time has been processed in 'saldoSeconds'.
                this._timerData.dailyWorkSeconds = 0;
            }
            this.overtime = this._printTimeHHMM(this._timerData.saldoSeconds);
            this.workingTime = this._printTimeHHMM(this._timerData.dailyWorkSeconds, false);
            this.timerStartTime = "-:--";
            if (this._timerData.saldoSeconds < 0) {
                this.$.overtime.classList.add("timer--time__noovertime");
            }
            else {
                this.$.overtime.classList.remove("timer--time__noovertime");
            }
            // Cancel REPAINT display if active, because timer is stopped.
            // No updates needed.
            if (this._repaintIn60SecsTimer) {
                clearInterval(this._repaintIn60SecsTimer);
                this._repaintIn60SecsTimer = null;
            }
        }
        else {
            // Timer session is STARTED
            if (this._timerData) {
                var beginTime = this._timerData.startTimeMilliSec;
                var endTime = new Date().getTime();
                this.isTimerActive = true;
                function updateDisplay() {
                    var beginTime = this._timerData.startTimeMilliSec;
                    var endTime = new Date().getTime();
                    var workInSec = parseInt(this._timerData.dailyWorkSeconds, 10) + Math.round((endTime - beginTime) / 1000);
                    var workDay = new Date(parseInt("20" + this._timerData.currentDate.substr(0, 2), 10), parseInt(this._timerData.currentDate.substr(2, 2), 10) - 1, this._timerData.currentDate.substr(4, 2)).getDay(); // 0:su, 1:mo ...
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
                            var totalWorkDayHours = Math.floor(workInSec / 60 / 60);
                            if (totalWorkDayHours >= 8) {
                                // https://developer.mozilla.org/en/docs/Web/API/notification
                                var notification = new Notification('At Work', {
                                    body: 'U heeft vandaag 8 uur gewerkt.',
                                    // ??NO SUPPORT?? badge:  '/images/manifest/icon-144x144.png',
                                    icon: '/images/manifest/icon-72x72.png',
                                });
                                notification.onshow = function () {
                                    console.log('Notification shown');
                                };
                                this._timerData.notificationSend = true;
                            }
                        }
                    }
                }
                // Timer becomes ACTIVE or was active (reload App). Now waiting for the user to STOP.
                this._repaintIn60SecsTimer = setInterval(updateDisplay.bind(this), 60000); // One minute REPAINT
                // Repaint defaults
                this.workingTime = this._printTimeHHMM(parseInt(this._timerData.dailyWorkSeconds, 10) +
                    Math.round((endTime - beginTime) / 1000));
                this.timerStartTime = this._printTimeHHMM(new Date(beginTime));
                this.overtime = this._printTimeHHMM(this._timerData.saldoSeconds);
            }
            else {
                this.workingTime = this._printTimeHHMM(0);
                this.timerStartTime = "-:--";
                this.overtime = this._printTimeHHMM(0);
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
        // TRUE when timer is active and user is working
        isTimerActive: {
            type: Boolean,
            value: false,
        },
        // Timer Object with data on user working progress (in local Storage)
        _timerData: {
            type: Object,
        },
    },
    ready: function () {
        var that = this;
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
//# sourceMappingURL=worktimer-app.js.map