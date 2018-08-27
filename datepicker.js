(function(){
    /**
     * Contains translations per language.
     * Eventually, CalTranslate.current will be filled with the current language
     */
    var CalTranslate = {
        en: {
            cancel: 'Cancel',
            numDays: function (num) {
                return num == 1 ? '1 day' : num + ' days'
            }
        },
        nl: {
            cancel: 'Annuleren',
            numDays: function (num) {
                return num == 1 ? '1 dag' : num + ' dagen'
            }
        },
        de: {
            cancel: 'Abbrechen',
            numDays: function (num) {
                return num == 1 ? '1 Tag' : num + ' Tagen'
            }
        }
    };

    /**
     * Represents a pattern.
     * A pattern can be use to match strings against, returning the detected
     * paramters, or it can be used as a template to construct a string with
     * the specified paramters.
     *
     * E.g. Pattern('This is a {variable} pattern') matches 'This is a cool pattern',
     * returning { variable: 'cool' } and can construct 'This is a nice pattern' with
     * { variable: 'nice' } provided.
     *
     * @param String pattern the pattern, with paramters between braces ({})
     */
    function Pattern(pattern) {
        var regex, lead, identifier, pair, type, index, match;

        this.pattern = pattern;
        this.replaceIndexes = [];
        this.strippedPattern = '';

        regex = '^';
        index = 1;

        while (match = /\{([^\}]+)\}/.exec(pattern)) {
            if (match.index > 0) {
                lead = pattern.substr(0, match.index);
                regex += lead.replace(/[\.\\\[\]\(\)\+\*\-]/g, '\\$&');
                this.strippedPattern += lead;
            }

            identifier = match[1];
            pair = identifier.split(':', 2);
            type = pair.length > 1 ? pair[1] : 'any';

            this.replaceIndexes[pair[0]] = index;
            if (type in Pattern.patterns) {
                regex += '(' + Pattern.patterns[type] + ')';
            } else {
                regex += '(' + type.replace(/\\/g, '\\\\') + ')';
            }
            this.strippedPattern += '{' + pair[0] + '}';

            pattern = pattern.substr(match.index + match[0].length);

            index++;
        }

        if (pattern) {
            regex += pattern.replace(/[\.\\\[\]\(\)\+\*\-]/g, '\\$&');
            this.strippedPattern += pattern;
        }

        regex += '$';

        this.regex = new RegExp(regex);
    }

        /**
         * Tries to match a string against the pattern, returning the detected
         * parameters.
         *
         * @param String string The string to match against
         * @param Boolean braceIdentifiers Set to true to include the braces ({}) in the parameter names
         */
        Pattern.prototype.match = function(string, braceIdentifiers) {
            var result = null, identifier, matches, index;

            if (matches = string.match(this.regex)) {
                result = {};

                for (identifier in this.replaceIndexes) {
                    index = this.replaceIndexes[identifier];
                    if (braceIdentifiers) {
                        result['{'+identifier+'}'] = matches[index];
                    } else {
                        result[identifier] = matches[index];
                    }
                }
            }

            return result;
        };

        /**
         * Uses the pattern as a template to generate a string
         *
         * @param Object variables The variables
         */
        Pattern.prototype.fill = function(variables) {
            var str = this.strippedPattern, key;

            for (key in variables) {
                str = str.replace(new RegExp('\\{'+key+'\\}', 'g'), variables[key]);
            }

            return str;
        };

        /**
         * Zero-pads numbers to the specified length
         *
         * @param Number number The number
         * @param Number length The desired length
         */
        Pattern.prototype.zeroPad = function(number, length) {
            var str = ''+number;
            while (str.length < length) str = '0' + str;
            return str;
        };

        /**
         * Like fill(), but uses a Date object, filling the paramters 'day',
         * 'month', 'year', 'hours', 'minutes', 'seconds' and 'tz'.
         *
         * @param Date date The date
         */
        Pattern.prototype.fillDate = function(date) {
            if (!(date instanceof Date)) return '';

            var props = {
                day: this.zeroPad(date.getDate(), 2),
                year: this.zeroPad(date.getFullYear(), 2),
                hours: this.zeroPad(date.getHours(), 2),
                minutes: this.zeroPad(date.getMinutes(), 2),
                month: this.zeroPad(date.getMonth(), 2),
                seconds: this.zeroPad(date.getSeconds(), 2),
                tz: date.getTimezoneOffset()
            };

            return this.fill(props);
        };

    /**
     * Predefined patterns
     */
    Pattern.patterns = {
        any: '[a-zA-Z0-9_-]+',
        int: '\\d+',
        float: '\\d*\\.?\\d+',
        url_part: '[^\/]+'
    };


    /**
     * Represents a month table in the DOM
     *
     * @param Number year The year
     * @param Number month The month
     * @param Calendar calendar The calendar
     */
    function MonthDisplay(year, month, calendar) {
        this.element = document.createElement('div');
        this.element.className = 'cal-month';
        this.element.setAttribute('data-month', year + '-' + month);

        var table = document.createElement('table');
        var part = document.createElement('thead');
        var row = document.createElement('tr');
        var cell = document.createElement('th');
        var d, i, day, className, wd;

        var date = new Date(year, month - 1, 1);
        var startDay = date.getDay() - calendar.startOfWeek;
        var numDays = Calendar.getNumDays(year, month);

        if (startDay < 0) {
            startDay += 7;
        }

        cell.setAttribute('colspan', 7);
        cell.innerHTML = '<span class="cal-month-name">' + calendar.monthSymbols[month] + '</span> <span>' + year + '</span>';
        row.appendChild(cell);
        part.appendChild(row);
        table.appendChild(part);

        row = document.createElement('tr');
        part.appendChild(row);

        for (i = 0; i < 7; i++) {
            cell = document.createElement('th');
            cell.innerHTML = calendar.shortDaySymbols[(i+calendar.startOfWeek)%7];
            row.appendChild(cell);
        }

        part = document.createElement('tbody');
        table.appendChild(part);
        row = null;

        for (day = startDay; day > 0; day--) {
            if (!row) {
                row = document.createElement('tr');
                part.appendChild(row);
            }
            cell = document.createElement('td');
            cell.innerHTML = '&nbsp;';
            row.appendChild(cell);
        }

        for (day = 1; day <= numDays; day++) {
            d = (startDay + day - 1) % 7;

            if (d == 0) {
                row = document.createElement('tr');
                part.appendChild(row);
            }
            cell = document.createElement('td');
            className = 'cal-day';
            wd = (d + calendar.startOfWeek)%7;
            if (wd == 0 || wd == 6) {
                className += ' cal-day-weekend';
            }
            cell.innerHTML = '<span class="' + className + '" id="cal-day-' + year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day + '">' + day + '</span>';
            row.appendChild(cell);
        }

        if (row) {
            d++;
            for (i = d; i < 7; i++) {
                cell = document.createElement('td');
                cell.innerHTML = '&nbsp;';
                row.appendChild(cell);
            }
        }

        this.element.appendChild(table);
    }

        MonthDisplay.prototype.addRangeElement = function(rangeElement) {
            this.element.appendChild(rangeElement);
        };

        MonthDisplay.prototype.unmarkDates = function(className) {
            var i, cells = this.element.querySelectorAll('.cal-day.'+className);
            for (i = 0; i < cells.length; i++) {
                cells[i].classList.remove(className);
            }
        };

    /**
     * Represents a date range in the DOM
     *
     * @param CalendarRange range The range to display
     * @param CalendarDisplay calendarDisplay The calendar display
     * @param String className The class name for the range
     */
    function DateRangeDisplay(range, calendarDisplay, className) {
        this.range = range;
        this.calendarDisplay = calendarDisplay;
        this.className = className;

        this.spans = [];
        this.startSpan = null;
        this.endSpan = null;
    }

        DateRangeDisplay.prototype.createRangeSpan = function(week, startDay, length) {
            var span = document.createElement('span');
            span.className = 'cal-range ' + this.className;
            span.style.left = (startDay * 100 / 7) + '%';
            span.style.width = (length * 100 / 7) + '%';
            span.setAttribute('data-week', week);
            return span;
        };

        DateRangeDisplay.prototype.render = function() {
            var date = this.range.start.clone();
            var weekDay = date.getDateObj().getDay() - this.calendarDisplay.calendar.startOfWeek;
            var monthDisplay = this.calendarDisplay.getMonthDisplay(date.year, date.month);
            var monthStartDay = weekDay - ((date.day % 7) - 1);
            if (monthStartDay < 0) monthStartDay += 7;
            var week = Math.ceil((date.day + monthStartDay) / 7) - 1;
            var totalDays = this.range.getNumDays();
            var daysLeft = totalDays;

            // Render first range
            var numDays;
            var span;

            var numDaysMonth = Calendar.getNumDays(date.year, date.month);
            var numDaysNext;

            this.calendarDisplay.markDate(this.range.start, 'cal-day-rangestart');
            this.calendarDisplay.markDate(this.range.end, 'cal-day-rangeend');

            while (daysLeft > 0) {
                numDays = 7 - weekDay;

                if (daysLeft < numDays) {
                    numDays = daysLeft;
                }

                if (1 + numDaysMonth - date.day < numDays) {
                    numDays = 1 + numDaysMonth - date.day;

                    if (numDays > 0) {
                        // Render a partial range
                        span = this.createRangeSpan(week, weekDay, numDays);
                        monthDisplay.addRangeElement(span);

                        date.increaseWith(numDays);
                    }
                    week = 0;

                    monthDisplay = this.calendarDisplay.getMonthDisplay(date.year, date.month);
                    numDaysMonth = Calendar.getNumDays(date.year, date.month);
                    weekDay += numDays;
                } else {
                    // Render a week range
                    span = this.createRangeSpan(week, weekDay, numDays);
                    monthDisplay.addRangeElement(span);

                    date.increaseWith(numDays);
                    if (date.day == 1) {
                        monthDisplay = this.calendarDisplay.getMonthDisplay(date.year, date.month);
                        numDaysMonth = Calendar.getNumDays(date.year, date.month);
                        week = 0;
                    } else {
                        week++;
                    }
                    weekDay = 0;
                }

                daysLeft -= numDays;

                if (numDays > 0) {
                    if (this.spans.length == 0) {
                        span.className = span.className + ' cal-range-first';
                        this.startSpan = document.createElement('span');
                        this.startSpan.className = 'cal-range-start ' + this.className;
                        this.startSpan.style.width = (100 / numDays) + '%';
                        span.appendChild(this.startSpan);
                    }

                    this.spans.push(span);
                }
            }

            if (span && totalDays > 1) {
                span.className = span.className + ' cal-range-last';
                this.endSpan = document.createElement('span');
                this.endSpan.className = 'cal-range-end ' + this.className;
                this.endSpan.style.width = (100 / numDays) + '%';
                span.appendChild(this.endSpan);
            }
        };

        DateRangeDisplay.prototype.unrender = function() {
            var i;
            for (i = 0; i < this.spans.length; i++) {
                if (this.spans[i].parentElement) {
                    this.spans[i].parentElement.removeChild(this.spans[i]);
                }
            }
            this.calendarDisplay.unmarkDate(this.range.start, 'cal-day-rangestart');
            this.calendarDisplay.unmarkDate(this.range.end, 'cal-day-rangeend');
            this.spans = [];
        };

    function SelectedDateDisplay(calendarDisplay, calendar) {
        this.calendarDisplay = calendarDisplay;
        this.calendar = calendar;

        this.element = document.createElement('div');
        this.element.className = 'cal-selected-date';
        calendarDisplay.header.appendChild(this.element);
    }

        SelectedDateDisplay.prototype.setDate = function(date) {
            var dateObj = date.getDateObj();

            this.element.innerHTML = '<div class="cal-selected-day">' + date.day + '</div>' +
                '<div class="cal-selected-date-content">' +
                    '<div class="cal-selected-date-month">' + this.calendar.monthSymbols[date.month] + ' ' + date.year + '</div>' +
                    '<div class="cal-selected-date-weekday">' + this.calendar.daySymbols[dateObj.getDay()] + '</div>' +
                '</div>';
        };


    /**
     * Represents an interactive calendar in the DOM
     *
     * @param Calendar calendar The calendar
     */
    function CalendarDisplay(calendar) {
        this.calendar = calendar;
        this.element = document.createElement('div');
        this.element.className = 'cal-display';

        this.dimmer = document.createElement('div');
        this.dimmer.className = 'cal-dimmer';

        this.header = document.createElement('div');
        this.header.className = 'cal-header';
        this.element.appendChild(this.header);

        this.header.innerHTML = '<span class="cal-header-arrow"></span>'

        this.monthContainer = document.createElement('div');
        this.monthContainer.className = 'cal-months';
        this.element.appendChild(this.monthContainer);

        this.monthSpan = 2;
        this.monthDisplays = {};
        this.rangeSelectStart = null;
        this.currRange = null;
        this.currCell = null;
        this.currYear = null;
        this.currMonth = null;

        this.onSelectDate = null;
        this.onSelectRange = null;

        if ('ontouchstart' in window) {
            this.element.addEventListener('touchend', this.onClick.bind(this));
        } else {
            this.element.addEventListener('click', this.onClick.bind(this));
            this.element.addEventListener('mousemove', this.onMouseMove.bind(this));
        }

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'cal-tooltip';
        this.tooltip.innerHTML = '42 dagen';
        this.element.appendChild(this.tooltip);

        this.selectedDateStart = new SelectedDateDisplay(this, calendar);
        this.selectedDateEnd = new SelectedDateDisplay(this, calendar);
        this.selectedDateStart.setDate(CalendarDate.today());

        var actions = document.createElement('div');
        actions.className = 'cal-actions';
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'cal-button';
        button.innerHTML = CalTranslate.current.cancel;
        actions.appendChild(button);
        this.element.appendChild(actions);
        button.addEventListener('click', this.close.bind(this));

        this.prevButton = document.createElement('button');
        this.prevButton.type = 'button';
        this.prevButton.className = 'cal-nav cal-prev';
        this.element.appendChild(this.prevButton);
        this.prevButton.addEventListener('click', this.showPrevMonth.bind(this));

        this.nextButton = document.createElement('button');
        this.nextButton.type = 'button';
        this.nextButton.className = 'cal-nav cal-next';
        this.element.appendChild(this.nextButton);
        this.nextButton.addEventListener('click', this.showNextMonth.bind(this));

        this.cancelClose = false;
        this.rangeDisplays = [];
        this.startDate = null;
        this.weekendsDisabled = false;
    }

        CalendarDisplay.prototype.getMonthDisplay = function(year, month) {
            var key = year + '-' + month;
            if (!(key in this.monthDisplays)) {
                this.monthDisplays[key] = new MonthDisplay(year, month, this.calendar);
            }

            return this.monthDisplays[key];
        };

        CalendarDisplay.prototype.showMonth = function(year, month) {
            var monthSpan = (document.body.clientWidth < 640 ? 1 : 2),
                child, next, i;

            // this.monthContainer.innerHTML = '';
            // Gracefully remove
            child = this.monthContainer.firstChild;
            while (child) {
                next = child.nextSibling;
                child.parentElement.removeChild(child);
                child = next;
            }

            this.element.style.width = (320 * monthSpan) + 'px';
            if (monthSpan == 1) {
                this.element.style.width = (document.body.clientWidth - 20) + 'px';
            }

            this.currYear = year;
            this.currMonth = month;

            for (i = 0; i < monthSpan; i++) {
                md = this.getMonthDisplay(year, month);
                this.monthContainer.appendChild(md.element);

                if (++month > 12) {
                    year++;
                    month = 1;
                }
            }

            this.respectStartDate();
        };

        CalendarDisplay.prototype.showPrevMonth = function() {
            var month = this.currMonth - 1, year = this.currYear;

            if (month < 1) {
                year--;
                month = 12;
            }

            this.showMonth(year, month);
        };

        CalendarDisplay.prototype.showNextMonth = function() {
            var month = this.currMonth + 1, year = this.currYear;

            if (month > 12) {
                year++;
                month = 1;
            }

            this.showMonth(year, month);
        };

        CalendarDisplay.prototype.markDate = function(date, className, markCell) {
            var id = 'cal-day-' + date.year + '-' + (date.month < 10 ? '0' : '') + date.month + '-' + (date.day < 10 ? '0' : '') + date.day;
            var cell = this.monthContainer.querySelector('#' + id);
            if (cell) {
                (markCell ? cell.parentElement : cell).classList.add(className);
            }
        };

        CalendarDisplay.prototype.markDateRange = function(dateRange, className, selectInHeader, dontAppendToRanges) {
            var rangeDisplay = new DateRangeDisplay(dateRange, this, className);
            rangeDisplay.render();
            if (selectInHeader) {
                this.selectedDateStart.setDate(dateRange.start);
                this.selectedDateEnd.setDate(dateRange.end);
            }
            if (!dontAppendToRanges) {
                this.rangeDisplays.push(rangeDisplay);
            }
            return rangeDisplay;
        };

        CalendarDisplay.prototype.unmarkDate = function(date, className, unmarkCell) {
            if (date) {
                var id = 'cal-day-' + date.year + '-' + (date.month < 10 ? '0' : '') + date.month + '-' + (date.day < 10 ? '0' : '') + date.day;
                var cell = this.monthContainer.querySelector('#' + id);
                if (cell) {
                    (unmarkCell ? cell.parentElement : cell).classList.remove(className);
                }
            } else {
                var key;
                for (key in this.monthDisplays) {
                    this.monthDisplays[key].unmarkDates(className);
                }
            }
        };

        CalendarDisplay.prototype.clearAllRanges = function() {
            var i;

            this.markDate(CalendarDate.today(), 'today');

            for (i = 0; i < this.rangeDisplays.length; i++) {
                this.rangeDisplays[i].unrender();
            }
            this.rangeDisplays = [];
        };

        CalendarDisplay.prototype.startRangeSelect = function(date) {
            this.rangeSelectStart = date;
            this.currRange = new CalendarRange(date, date);
            this.rangeDisplay = this.markDateRange(this.currRange, 'highlight', true, true);
        };

        CalendarDisplay.prototype.onClick = function(e) {
            if (e.target.classList.contains('cal-day')) {
                e.preventDefault();

                if (e.target.classList.contains('disabled')) {
                    return;
                }

                var m = e.target.getAttribute('id').match(/^cal-day-(\d{4})-(\d{1,2})-(\d{1,2})$/);
                var date = new CalendarDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
                var endsRange = this.rangeSelectStart != null;

                if (this.onSelectDate) {
                    this.onSelectDate(date, endsRange);
                }

                if (endsRange) {
                    this.rangeDisplay.unrender();
                    this.tooltip.style.display = 'none';
                    this.currRange = new CalendarRange(this.rangeSelectStart, date);

                    if (this.onSelectRange) {
                        this.onSelectRange(this.currRange);
                    }

                    this.rangeSelectStart = null;
                    this.currRange = null;
                }
            }
        };

        CalendarDisplay.prototype.onMouseMove = function(e) {
            if (e.target.classList.contains('cal-day') && e.target != this.currCell && this.rangeSelectStart) {
                if (e.target.classList.contains('disabled')) {
                    return;
                }

                var m = e.target.getAttribute('id').match(/^cal-day-(\d{4})-(\d{1,2})-(\d{1,2})$/);
                var date = new CalendarDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));

                this.currCell = e.target;

                if (this.currRange) {
                    this.rangeDisplay.unrender();
                }
                this.currRange = new CalendarRange(this.rangeSelectStart, date);
                this.rangeDisplay = this.markDateRange(this.currRange, 'highlight', true);
                this.showTooltip(e.target, this.currRange.getNumDays());
            }
        };

        CalendarDisplay.prototype.showTooltip = function(cell, days) {
            if (cell) {
                var left = 0, top = 0, el = cell;
                while (el && el != this.element) {
                    left += el.offsetLeft;
                    top += el.offsetTop;
                    el = el.offsetParent;
                }

                this.tooltip.innerHTML = CalTranslate.current.numDays(days);
                this.tooltip.style.display = 'block';
                this.tooltip.style.left = (left + (cell.offsetWidth - this.tooltip.offsetWidth) / 2) + 'px';
                this.tooltip.style.top = (top - this.tooltip.offsetHeight - 5) + 'px';
            }
        };

        CalendarDisplay.prototype.openAtPosition = function(left, top, activator) {
            if (document.body.clientWidth < 640) {
                this.element.style.position = 'fixed';
                this.element.style.left = '10px';
                this.element.style.top = ((Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 355) / 2) + 'px';
                this.dimmer.style.display = 'block';
            } else {
                if (left + 660 > document.body.clientWidth) {
                    left = (left + activator.offsetWidth) - 640;
                }
                this.element.style.position = 'absolute';
                this.element.style.left = left + 'px';
                this.element.style.top = (top + (activator ? activator.offsetHeight : 0)) + 'px';
            }
            this.element.style.display = 'block';

            this.cancelClose = true;

            var el = this.element,
                dim = this.dimmer;

            setTimeout(function(){
                el.classList.add('cal-visible');
                if (document.body.clientWidth < 640) {
                    dim.classList.add('cal-visible');
                }
            }, 100);


            setTimeout(function(){
                CalendarDisplay.instance().cancelClose = false;
            }, 1000);
        };

        CalendarDisplay.prototype.close = function() {
            if (!this.cancelClose) {
                this.element.classList.remove('cal-visible');
                this.dimmer.classList.remove('cal-visible');

                var el = this.element,
                    dim = this.dimmer;

                setTimeout(function(){
                    el.style.display = 'none';
                    dim.style.display = 'none';
                }, 400);
            }
        };

        CalendarDisplay.prototype.setStartDate = function(startDate) {
            this.startDate = startDate;
            if (startDate) {
                if (this.currYear * 100 + this.currMonth < startDate.year * 100 + startDate.month) {
                    this.showMonth(startDate.year, startDate.month);
                } else {
                    this.respectStartDate();
                }
            } else {
                this.respectStartDate();
            }
        };

        CalendarDisplay.prototype.disableWeekends = function(disabled) {
            this.weekendsDisabled = disabled;
            this.respectStartDate();
        };

        CalendarDisplay.prototype.respectStartDate = function() {
            var days, day, i, check;

            days = this.monthContainer.querySelectorAll('.cal-day');

            if (this.startDate) {
                check = 'cal-day-' + this.startDate.year + '-' +
                    (this.startDate.month < 10 ? '0' : '') + this.startDate.month + '-' +
                    (this.startDate.day < 10 ? '0' : '') + this.startDate.day;

                for (i = 0; i < days.length; i++) {
                    day = days[i];
                    if (day.getAttribute('id') < check) {
                        day.classList.add('disabled');
                    } else {
                        if (this.weekendsDisabled && day.classList.contains('cal-day-weekend')) {
                            day.classList.add('disabled');
                        } else {
                            day.classList.remove('disabled');
                        }
                    }
                }

                if (this.currYear * 100 + this.currMonth == this.startDate.year * 100 + this.startDate.month) {
                    this.prevButton.style.display = 'none';
                } else {
                    this.prevButton.style.display = 'block';
                }
            } else {
                for (i = 0; i < days.length; i++) {
                    day = days[i];
                    if (this.weekendsDisabled && day.classList.contains('cal-day-weekend')) {
                        day.classList.add('disabled');
                    } else {
                        day.classList.remove('disabled');
                    }
                }

                this.prevButton.style.display = 'block';
            }
        };

        CalendarDisplay.prototype.showHeader = function(show) {
            if (show) {
                this.element.classList.add('cal-with-header');
            } else {
                this.element.classList.remove('cal-with-header');
            }
        };

    CalendarDisplay.instance = function () {
        if (!CalendarDisplay._instance) {
            CalendarDisplay._instance = new CalendarDisplay(new Calendar());
            document.body.appendChild(CalendarDisplay._instance.dimmer);
            document.body.appendChild(CalendarDisplay._instance.element);
        }
        return CalendarDisplay._instance;
    };

    function Calendar () {
        var locale = document.documentElement.getAttribute('lang'),
            date, day, month;

        if (!locale) {
            locale = navigator.language || navigator.userLanguage || navigator.browserLanguage;
        }

        this.daySymbols = [];
        this.shortDaySymbols = [];
        for (day = 1; day <= 7; day++) {
            date = new Date(2018, 6, day);
            this.daySymbols.push(date.toLocaleDateString(locale, { weekday: 'long' }));
            this.shortDaySymbols.push(date.toLocaleDateString(locale, { weekday: 'short' }));
        }

        this.monthSymbols = [ '' ];
        for (month = 0; month < 12; month++) {
            this.monthSymbols.push((new Date(2018, month, 1)).toLocaleDateString(locale, { month: 'long' }));
        }

        this.startOfWeek = DatePicker.startOfWeek !== null ? DatePicker.startOfWeek : (DateRangePicker.startOfWeek !== null ? DateRangePicker.startOfWeek : 0);

        if (!CalTranslate.current) {
            var lang = locale.replace(/-[^$]*$/, '').toLowerCase();
            if (!(lang in CalTranslate)) {
                lang = 'en';
            }
            CalTranslate.current = CalTranslate[lang];
        }
    }

    Calendar.getNumDays = function(year, month) {
        if (month == 2) {
            var isLeapYear = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
            return isLeapYear ? 29 : 28;
        } else if (month < 8) {
            return 30 + (month % 2);
        }
        return 31 - (month % 2);
    };

    function CalendarDate(year, month, day) {
        this.year = parseInt(year);
        this.month = parseInt(month);
        this.day = parseInt(day);
        this.key = this.year + this.lpad(month, 2) + this.lpad(day, 2);
        this.numDays = Calendar.getNumDays(year, month);
    }

        CalendarDate.prototype.lpad = function(num, length) {
            var str = ''+num;
            while (str.length < length) {
                str = '0' + str;
            }
            return str;
        };

        CalendarDate.prototype.increaseWith = function(days) {
            var i;
            for (i = 0; i < days; i++) {
                if (++this.day > this.numDays) {
                    if (++this.month > 12) {
                        this.year++;
                        this.month = 1;
                    }
                    this.day = 1;
                    this.numDays = Calendar.getNumDays(this.year, this.month);
                }
            }
            this.key = this.year + this.lpad(this.month, 2) + this.lpad(this.day, 2);
        };

        CalendarDate.prototype.clone = function() {
            return new CalendarDate(this.year, this.month, this.day);
        };

        CalendarDate.prototype.getUnixTime = function() {
            var date = new Date(this.year, this.month - 1, this.day);
            return date.getTime() / 1000;
        };

        CalendarDate.prototype.getDateObj = function() {
            return new Date(this.year, this.month - 1, this.day);
        };

    CalendarDate.today = function() {
        var date = new Date();
        return new CalendarDate(date.getFullYear(), date.getMonth()+1, date.getDate());
    };

    function CalendarRange(start, end) {
        this.start = start;
        this.end = end || start;
        if (this.end.key < this.start.key) {
            var swap = this.end;
            this.end = this.start;
            this.start = swap;
        }
    }

        CalendarRange.prototype.each = function(callback) {
            var date = this.start.clone(),
                index = 0;

            while (date.key <= this.end.key) {
                callback(date, index, date.key == this.end.key);
                date.increaseWith(1);
                index++;
            }
        };

        CalendarRange.prototype.getNumDays = function() {
            var diffSeconds = this.end.getUnixTime() - this.start.getUnixTime();
            return 1 + (diffSeconds / 86400);
        };

    function DatePicker(element, options) {
        this.element = element;
        this.element.datePicker = this;
        this.date = null;
        this.startDate = null;
        this.weekendsDisabled = false;

        element.addEventListener('focus', this.onFocus.bind(this));

        var dateFormat;
        if (options && ('format' in options)) {
            dateFormat = options.format;
        } else {
            dateFormat = 'yyyy-mm-dd';
        }

        this.dateFormat = new Pattern(dateFormat.toLowerCase().replace('yyyy', '{year}').replace('mm', '{month}').replace('dd', '{day}'));

        if (options && ('onChange' in options)) {
            this.changeCallback = options.onChange;
        }

        if (options && ('startDate' in options)) {
            if (options.startDate == 'today') {
                this.startDate = CalendarDate.today();
            } else {
                var sd = this.dateFormat.match(options.startDate);
                if (sd) {
                    this.startDate = new CalendarDate(sd.year, sd.month, sd.day);
                }
            }
        }

        if (options && ('disableWeekends' in options)) {
            this.weekendsDisabled = options.disableWeekends;
        }

        if (element.value) {
            var date, match;

            match = this.dateFormat.match(element.value);

            if (match) {
                this.date = new CalendarDate(match.year, match.month, match.day);
            }
        }
    }

        DatePicker.prototype.onFocus = function(e) {
            var el = this.element, left = 0, top = 0;
            var date = this.date ? this.date : CalendarDate.today();
            var calendarDisplay = CalendarDisplay.instance();

            while (el) {
                left += el.offsetLeft;
                top += el.offsetTop;
                el = el.offsetParent;
            }

            calendarDisplay.onSelectDate = this.onSelectDate.bind(this);
            calendarDisplay.showHeader(false);
            calendarDisplay.showMonth(date.year, date.month);
            calendarDisplay.setStartDate(this.startDate);
            calendarDisplay.disableWeekends(this.weekendsDisabled);
            calendarDisplay.clearAllRanges();
            calendarDisplay.unmarkDate(null, 'selected');
            if (this.date) {
                calendarDisplay.markDate(this.date, 'selected');
            }
            calendarDisplay.openAtPosition(left, top, this.element);
        };

        DatePicker.prototype.onSelectDate = function(date, endsRange) {
            this.date = date;
            this.element.value = this.dateFormat.fill(date);
            CalendarDisplay.instance().close();

            if (this.changeCallback) {
                this.changeCallback.call(this.element, date, this.element.value);
            }
        };

    DatePicker.startOfWeek = null;

    function DateRangePicker(element, options) {
        this.element = element;
        this.element.datePicker = this;
        this.range = null;
        this.changeCallback = null;
        this.startDate = null;
        this.weekendsDisabled = false;
        this.separator = ' t/m ';

        element.addEventListener('focus', this.onFocus.bind(this));

        var dateFormat;
        if (options && ('format' in options)) {
            dateFormat = options.format;
        } else {
            dateFormat = 'yyyy-mm-dd';
        }

        this.dateFormat = new Pattern(dateFormat.toLowerCase().replace('yyyy', '{year}').replace('mm', '{month}').replace('dd', '{day}'));

        if (options && ('onChange' in options)) {
            this.changeCallback = options.onChange;
        }

        if (options && ('startDate' in options)) {
            if (options.startDate == 'today') {
                this.startDate = CalendarDate.today();
            } else {
                var sd = this.dateFormat.match(options.startDate);
                if (sd) {
                    this.startDate = new CalendarDate(sd.year, sd.month, sd.day);
                }
            }
        }

        if (options && ('disableWeekends' in options)) {
            this.weekendsDisabled = options.disableWeekends;
        }

        if (element.value) {
            var pair = element.value.split(this.separator), start, end, match;
            if (pair[0]) {
                match = this.dateFormat.match(pair[0]);

                if (match) {
                    start = new CalendarDate(match.year, match.month, match.day);

                    if (pair.length > 1 && pair[1]) {
                        match = this.dateFormat.match(pair[1]);
                        if (match) {
                            end = new CalendarDate(match.year, match.month, match.day);
                        }
                    }

                    if (!end) {
                        end = start;
                    }

                    this.range = new CalendarRange(start, end);
                }
            }
        }
    }

        DateRangePicker.prototype.onFocus = function(e) {
            var el = this.element, left = 0, top = 0;
            var date = this.range ? this.range.start : CalendarDate.today();
            var calendarDisplay = CalendarDisplay.instance();

            while (el) {
                left += el.offsetLeft;
                top += el.offsetTop;
                el = el.offsetParent;
            }

            calendarDisplay.onSelectDate = this.onSelectDate.bind(this);
            calendarDisplay.onSelectRange = this.onSelectRange.bind(this);
            calendarDisplay.showHeader(true);
            calendarDisplay.showMonth(date.year, date.month);
            calendarDisplay.setStartDate(this.startDate);
            calendarDisplay.disableWeekends(this.weekendsDisabled);
            calendarDisplay.clearAllRanges();
            if (this.range) {
                calendarDisplay.showMonth(this.range.start.year, this.range.start.month);
                calendarDisplay.markDateRange(this.range, 'selected', true);
            }
            calendarDisplay.openAtPosition(left, top, this.element);

            if (document.body.clientWidth < 640) {
                this.element.blur();
            }
        };

        DateRangePicker.prototype.onSelectDate = function(date, endsRange) {
            if (!endsRange) {
                if (this.range) {
                    this.range = null;
                }
                CalendarDisplay.instance().clearAllRanges();
                CalendarDisplay.instance().startRangeSelect(date);
            }
        };

        DateRangePicker.prototype.onSelectRange = function(range) {
            this.range = range;
            CalendarDisplay.instance().markDateRange(this.range, 'selected', true);
            this.element.value =
                this.dateFormat.fill(range.start) +
                this.separator +
                this.dateFormat.fill(range.end);

            CalendarDisplay.instance().close();

            if (this.changeCallback) {
                this.changeCallback.call(this.element, range, this.element.value);
            }
        };

    DateRangePicker.startOfWeek = null;

    window.DatePicker = DatePicker;
    window.DateRangePicker = DateRangePicker;

    window.addEventListener('click', function(e) {
        if (!e.target.datePicker) {
            var el = e.target;
            while (el && !el.classList.contains('cal-display')) {
                el = el.parentElement;
            }
            if (!el) {
                CalendarDisplay.instance().close();
            }
        }
    });

})();