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
    function MonthView(year, month, calendar) {
        this.element = document.createElement('div');
        this.element.className = 'cal-month';
        this.element.setAttribute('data-month', year + '-' + month);
        this.dayCells = [];

        var table = document.createElement('table');
        var part = document.createElement('thead');
        var row = document.createElement('tr');
        var cell = document.createElement('th');
        var d, i, day, className, wd;
        var cellSpan;

        var date = new Date(year, month - 1, 1);
        var startDay = date.getDay() - calendar.startOfWeek;
        var numDays = Calendar.getNumDays(year, month);

        this.startWeek = Calendar.getWeekNumber(year, month, 1);
        this.endWeek = this.startWeek + Math.ceil((numDays + startDay) / 7) - 1;

        var prevMonth = month - 1;
        var prevYear = year;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear--;
        }
        var nextMonth = month + 1;
        var nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        var numDaysPrev = Calendar.getNumDays(year, prevMonth);

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
            cell.innerHTML = '<span class="cal-day cal-day-othermonth" id="cal-day-' + prevYear + '-' + (prevMonth < 10 ? '0' : '') + prevMonth + '-' + (1 + numDaysPrev - day) + '">' + (1 + numDaysPrev - day) + '</span>';

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
            cellSpan = document.createElement('span');
            cellSpan.className = className;
            cellSpan.setAttribute('id', 'cal-day-' + year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day);
            cellSpan.innerHTML = day;
            cell.appendChild(cellSpan);
            this.dayCells.push(cellSpan);
            // cell.innerHTML = '<span class="' + className + '" id="cal-day-' + year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day + '">' + day + '</span>';
            row.appendChild(cell);
        }

        if (row) {
            d++;
            for (i = d; i < 7; i++) {
                cell = document.createElement('td');
                // cell.innerHTML = '&nbsp;';
                cell.innerHTML = '<span class="cal-day cal-day-othermonth" id="cal-day-' + nextYear + '-' + (nextMonth < 10 ? '0' : '') + nextMonth + '-' + (1 + i - d) + '">' + (1 + i - d) + '</span>';
                row.appendChild(cell);
            }
        }

        this.element.appendChild(table);
    }

        MonthView.prototype.addRangeElement = function(rangeElement) {
            this.element.appendChild(rangeElement);
        };

        MonthView.prototype.unmarkDates = function(className) {
            var i, cells = this.element.querySelectorAll('.cal-day.'+className);
            for (i = 0; i < cells.length; i++) {
                cells[i].classList.remove(className);
            }
        };

        MonthView.prototype.spansWeek = function(week) {
            return week >= this.startWeek && week <= this.endWeek;
        };

        MonthView.prototype.highlightRange = function(className, startDay, numDays, isRangeStart, isRangeEnd) {
            var index = startDay - 1,
                i;

            for (i = 0; i < numDays; i++) {
                if (index + i < this.dayCells.length) {
                    this.dayCells[index + i].classList.add(
                        'cal-day-range' +
                        (isRangeStart && i == 0 ? '-start' : '') +
                        (isRangeEnd && i == numDays-1 ? '-end' : ''));
                    this.dayCells[index + i].classList.add('range-' + className);
                }
            }
        };

        MonthView.prototype.unhighlightRanges = function() {
            var i;

            for (i = 0; i < this.dayCells.length; i++) {
                this.dayCells[i].className = 'cal-day ' + (this.dayCells[i].classList.contains('today') ? ' today' : '');
                this.dayCells[i].className = this.dayCells[i].className
                    .replace(/\s+cal-day-range\b/, '')
                    .replace(/\s+range-[^\s]+/, '');
            }
        };

        MonthView.prototype.clearMarkedDates = function() {
            for (i = 0; i < this.dayCells.length; i++) {
                this.dayCells[i].className = 'cal-day ' + (this.dayCells[i].classList.contains('today') ? ' today' : '');
                this.dayCells[i].className = this.dayCells[i].className
                    .replace(/\s+marked-[^\s]+/, '');
            }
        };

        MonthView.prototype.setMarkedDates = function(dates) {
            var i, day;
            for (i = 0; i < dates.length; i++) {
                day = this.element.querySelector('#cal-day-' + dates[i].date);
                if (day) {
                    day.classList.add('marked-' + dates[i].className);
                }
            }
        };

    /**
     * Represents a date range in the DOM
     *
     * @param CalendarRange range The range to display
     * @param CalendarView calendarView The calendar display
     * @param String className The class name for the range
     */
    function DateRangeDisplay(range, calendarView, className) {
        this.range = range;
        this.calendarView = calendarView;
        this.className = className;

        this.spans = [];
    }

        DateRangeDisplay.prototype.render = function() {
            var year = this.range.start.year;
            var month = this.range.start.month;
            var day = this.range.start.day;
            var end = this.range.end.year * 100 + this.range.end.month;
            var numDays = 31;
            var monthView, isStart = true, isEnd = false;

            while (year * 100 + month <= end) {
                if (year == this.range.end.year && month == this.range.end.month) {
                    numDays = 1 + this.range.end.day - day;
                    isEnd = true;
                }

                monthView = this.calendarView.getMonthView(year, month);
                monthView.highlightRange(this.className, day, numDays, isStart, isEnd);

                if (++month >= 12) {
                    year++;
                    month = 1;
                }
                day = 1;
                isStart = false;
            }
        };

        DateRangeDisplay.prototype.unrender = function() {
            var year = this.range.start.year;
            var month = this.range.start.month;
            var day = this.range.start.day;
            var end = this.range.end.year * 100 + this.range.end.month;
            var monthView;

            while (year * 100 + month <= end) {
                monthView = this.calendarView.getMonthView(year, month);
                monthView.unhighlightRanges();
                if (++month >= 12) {
                    year++;
                    month = 1;
                }
            }
        };

    function SelectedDateView(calendarView, calendar) {
        this.calendarView = calendarView;
        this.calendar = calendar;

        this.element = document.createElement('div');
        this.element.className = 'cal-selected-date';
        calendarView.header.appendChild(this.element);
    }

        SelectedDateView.prototype.setDate = function(date) {
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
    function CalendarView(calendar, options) {
        options = options||{};

        this.calendar = calendar;
        this.element = document.createElement('div');
        this.element.className = 'cal-view';

        if (('inline' in options) && options.inline) {
            this.element.classList.add('cal-visible');
            this.element.classList.add('cal-inline');
            this.isInline = true;
        } else {
            this.dimmer = document.createElement('div');
            this.dimmer.className = 'cal-dimmer';
            this.isInline = false;
        }

        this.header = document.createElement('div');
        this.header.className = 'cal-header';
        this.element.appendChild(this.header);

        this.header.innerHTML = '<span class="cal-header-arrow"></span>'

        this.monthContainer = document.createElement('div');
        this.monthContainer.className = 'cal-months';
        this.element.appendChild(this.monthContainer);

        this.monthSpan = 2;
        this.forcedMonthSpan = null;
        this.monthViews = {};
        this.rangeSelectStart = null;
        this.currRange = null;
        this.currCell = null;
        this.currYear = null;
        this.currMonth = null;

        this.onSelectDate = null;
        this.onSelectRange = null;

        if ('ontouchstart' in window) {
            this.element.addEventListener('touchend', this.onClick.bind(this));
            this.dimmer = null;
        } else {
            this.element.addEventListener('click', this.onClick.bind(this));
            this.element.addEventListener('mousemove', this.onMouseMove.bind(this));
        }

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'cal-tooltip';
        this.tooltip.innerHTML = '42 dagen';
        this.element.appendChild(this.tooltip);

        this.selectedDateStart = new SelectedDateView(this, calendar);
        this.selectedDateEnd = new SelectedDateView(this, calendar);
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
        this.isTooltipEnabled = true;
        this.showOtherMonths = false;

        this.markedDates = {};
    }

        CalendarView.prototype.getMonthView = function(year, month) {
            var key = year + '-' + month;
            if (!(key in this.monthViews)) {
                this.monthViews[key] = new MonthView(year, month, this.calendar);
            }

            return this.monthViews[key];
        };

        CalendarView.prototype.showMonth = function(year, month) {
            var monthSpan = this.forcedMonthSpan ? this.forcedMonthSpan : (document.body.clientWidth < 640 ? 1 : 2),
                child, next, i;

            // this.monthContainer.innerHTML = '';
            // Gracefully remove
            child = this.monthContainer.firstChild;
            while (child) {
                next = child.nextSibling;
                child.parentElement.removeChild(child);
                child = next;
            }

            if (!this.isInline) {
                this.element.style.width = (320 * monthSpan) + 'px';
                if (document.body.clientWidth < 640) {
                    this.element.style.width = (document.body.clientWidth - 20) + 'px';
                } else if (monthSpan == 1) {
                    this.element.style.width = '500px';
                }
            }

            this.element.className = this.element.className.replace(/\scal-span-\d+/, '') + ' cal-span-' + monthSpan;

            this.currYear = year;
            this.currMonth = month;

            for (i = 0; i < monthSpan; i++) {
                md = this.getMonthView(year, month);
                this.monthContainer.appendChild(md.element);

                md.clearMarkedDates();
                if ((year in this.markedDates) && (month in this.markedDates[year])) {
                    md.setMarkedDates(this.markedDates[year][month]);
                }

                if (++month > 12) {
                    year++;
                    month = 1;
                }
            }

            this.respectStartDate();
        };

        CalendarView.prototype.showPrevMonth = function() {
            var month = this.currMonth - 1, year = this.currYear;

            if (month < 1) {
                year--;
                month = 12;
            }

            this.showMonth(year, month);
        };

        CalendarView.prototype.showNextMonth = function() {
            var month = this.currMonth + 1, year = this.currYear;

            if (month > 12) {
                year++;
                month = 1;
            }

            this.showMonth(year, month);
        };

        CalendarView.prototype.markDate = function(date, className, markCell) {
            var id = 'cal-day-' + date.year + '-' + (date.month < 10 ? '0' : '') + date.month + '-' + (date.day < 10 ? '0' : '') + date.day;
            var cell = this.monthContainer.querySelector('#' + id);
            if (cell) {
                (markCell ? cell.parentElement : cell).classList.add(className);
            }
        };

        CalendarView.prototype.markDateRange = function(dateRange, className, selectInHeader, dontAppendToRanges) {
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

        CalendarView.prototype.unmarkDate = function(date, className, unmarkCell) {
            if (date) {
                var id = 'cal-day-' + date.year + '-' + (date.month < 10 ? '0' : '') + date.month + '-' + (date.day < 10 ? '0' : '') + date.day;
                var cell = this.monthContainer.querySelector('#' + id);
                if (cell) {
                    (unmarkCell ? cell.parentElement : cell).classList.remove(className);
                }
            } else {
                var key;
                for (key in this.monthViews) {
                    this.monthViews[key].unmarkDates(className);
                }
            }
        };

        CalendarView.prototype.clearAllRanges = function() {
            var i;

            this.markDate(CalendarDate.today(), 'today');

            for (i = 0; i < this.rangeDisplays.length; i++) {
                this.rangeDisplays[i].unrender();
            }
            this.rangeDisplays = [];
        };

        CalendarView.prototype.startRangeSelect = function(date) {
            this.rangeSelectStart = date;
            this.currRange = new CalendarRange(date, date);
            this.rangeDisplay = this.markDateRange(this.currRange, 'highlight', true, true);
        };

        CalendarView.prototype.onClick = function(e) {
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

        CalendarView.prototype.onMouseMove = function(e) {
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

        CalendarView.prototype.showTooltip = function(cell, days) {
            if (this.isTooltipEnabled && cell) {
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

        CalendarView.prototype.openAtPosition = function(left, top, activator) {
            if (document.body.clientWidth < 640) {
                this.element.style.position = 'fixed';
                this.element.style.left = '10px';
                this.element.style.top = ((Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 355) / 2) + 'px';
                if (this.dimmer) {
                    this.dimmer.style.display = 'block';
                }
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
                if (dim && document.body.clientWidth < 640) {
                    dim.classList.add('cal-visible');
                }
            }, 100);


            setTimeout(function(){
                CalendarView.instance().cancelClose = false;
            }, 1000);
        };

        CalendarView.prototype.close = function() {
            if (!this.cancelClose) {
                this.element.classList.remove('cal-visible');
                if (this.dimmer) {
                    this.dimmer.classList.remove('cal-visible');
                }

                var el = this.element,
                    dim = this.dimmer;

                setTimeout(function(){
                    el.style.display = 'none';
                    if (dim) {
                        dim.style.display = 'none';
                    }
                }, 400);
            }
        };

        CalendarView.prototype.setStartDate = function(startDate) {
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

        CalendarView.prototype.disableWeekends = function(disabled) {
            this.weekendsDisabled = disabled;
            this.respectStartDate();
        };

        CalendarView.prototype.respectStartDate = function() {
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

        CalendarView.prototype.showHeader = function(show) {
            if (show) {
                this.element.classList.add('cal-with-header');
            } else {
                this.element.classList.remove('cal-with-header');
            }
        };

        CalendarView.prototype.enableTooltip = function(enable) {
            this.isTooltipEnabled = (typeof enable == 'undefined') ? true : enable;
        };

        CalendarView.prototype.enableOtherMonths = function(enable) {
            this.showOtherMonths = (typeof enable == 'undefined') ? true : enable;
            if (this.showOtherMonths) {
                this.element.classList.add('cal-with-othermonths');
            } else {
                this.element.classList.remove('cal-with-othermonths');
            }
        };

        CalendarView.prototype.forceMonthSpan = function(span) {
            this.forcedMonthSpan = span;
        };

        CalendarView.prototype.setMarkedDates = function(dates) {
            this.markedDates = dates;
        }

    CalendarView.instance = function () {
        if (!CalendarView._instance) {
            CalendarView._instance = new CalendarView(Calendar.instance());
            document.body.appendChild(CalendarView._instance.dimmer);
            document.body.appendChild(CalendarView._instance.element);
        }
        return CalendarView._instance;
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

    Calendar.instance = function() {
        if (!Calendar._instance) {
            Calendar._instance = new Calendar();
        }
        return Calendar._instance;
    };

    Calendar.monthOffsets = [ 0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];
    Calendar.getWeekNumber = function(year, month, day) {
        var lyAdd = 0,
            yearDay,
            jan1Day = (new Date(year, 0, 1)).getDay(),
            week;

        if (month > 2) {
            lyAdd = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) ? 1 : 0;
        }

        yearDay = this.monthOffsets[month] + lyAdd + day;
        week = Math.ceil((yearDay + jan1Day) / 7);
        if (jan1Day == 0 || jan1Day >= 5) {
            week--;
            if (week < 1) week = 52;
        }

        return week;
    };

    function CalendarDate(year, month, day) {
        if (arguments.length == 1 && typeof year == 'string') {
            var m = year.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (m) {
                this.year = parseInt(m[1]);
                this.month = parseInt(m[2]);
                this.day = parseInt(m[3]);
            } else {
                console.error('Invalid date: ' + year);
            }
        } else {
            this.year = parseInt(year);
            this.month = parseInt(month);
            this.day = parseInt(day);
        }
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
        this.showOtherMonths = false;
        this.monthSpan = null;
        this.markedDates = {};

        if (options && ('inline' in options) && options.inline) {
            this.calendarView = new CalendarView(Calendar.instance(), { inline: true });
            this.element.parentElement.insertBefore(this.calendarView.element, this.element.nextSibling);
            this.element.style.position = 'absolute';
            this.element.style.zIndex = -100;
            this.element.style.pointerEvents = 'none';
            this.element.style.opacity = 0;
            this.isInline = true;
        } else {
            this.calendarView = CalendarView.instance();
            this.isInline = false;
            element.addEventListener('focus', this.onFocus.bind(this));
        }


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
        if (options && ('showOtherMonths' in options)) {
            this.showOtherMonths = options.showOtherMonths;
        }
        if (options && ('monthSpan' in options)) {
            this.monthSpan = options.monthSpan;
        }
        if (options && ('markedDates' in options)) {
            this.markedDates = options.markedDates;
        }

        if (element.value) {
            var date, match;

            match = this.dateFormat.match(element.value);

            if (match) {
                this.date = new CalendarDate(match.year, match.month, match.day);
            }
        }

        if (this.isInline) {
            this.prepareCalendarView();
        }
    }

        DatePicker.prototype.prepareCalendarView = function() {
            var date = this.date ? this.date : CalendarDate.today();
            this.calendarView.onSelectDate = this.onSelectDate.bind(this);
            this.calendarView.showHeader(false);
            this.calendarView.setMarkedDates(this.markedDates);
            this.calendarView.forceMonthSpan(this.monthSpan);
            this.calendarView.showMonth(date.year, date.month);
            this.calendarView.setStartDate(this.startDate);
            this.calendarView.disableWeekends(this.weekendsDisabled);
            this.calendarView.enableOtherMonths(this.showOtherMonths);
            this.calendarView.clearAllRanges();
            this.calendarView.unmarkDate(null, 'selected');
            if (this.date) {
                this.calendarView.markDate(this.date, 'selected');
            }
        }

        DatePicker.prototype.onFocus = function(e) {
            var el = this.element, left = 0, top = 0;

            while (el) {
                left += el.offsetLeft;
                top += el.offsetTop;
                el = el.offsetParent;
            }

            this.prepareCalendarView();
            this.calendarView.openAtPosition(left, top, this.element);
        };

        DatePicker.prototype.onSelectDate = function(date, endsRange) {
            this.date = date;
            this.element.value = this.dateFormat.fill(date);
            if (this.isInline) {
                this.calendarView.unmarkDate(null, 'selected');
                if (this.date) {
                    this.calendarView.markDate(this.date, 'selected');
                }
            } else {
                this.calendarView.close();
            }

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
        this.showHeader = true;
        this.showDayCount = true;
        this.showOtherMonths = false;
        this.monthSpan = null;
        this.markedDates = {};

        if (options && ('showHeader' in options) && !options.showHeader) {
            this.showHeader = false;
        }
        if (options && ('showDayCount' in options) && !options.showDayCount) {
            this.showDayCount = false;
        }

        if (options && ('inline' in options) && options.inline) {
            this.calendarView = new CalendarView(Calendar.instance(), { inline: true });
            this.element.parentElement.insertBefore(this.calendarView.element, this.element.nextSibling);
            this.element.style.position = 'absolute';
            this.element.style.zIndex = -100;
            this.element.style.pointerEvents = 'none';
            this.element.style.opacity = 0;
            this.isInline = true;
        } else {
            this.calendarView = CalendarView.instance();
            this.isInline = false;
        }

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
        if (options && ('showOtherMonths' in options)) {
            this.showOtherMonths = options.showOtherMonths;
        }
        if (options && ('monthSpan' in options)) {
            this.monthSpan = options.monthSpan;
        }
        if (options && ('markedDates' in options)) {
            var i, date;
            for (i = 0; i < options.markedDates.length; i++) {
                date = new CalendarDate(options.markedDates[i].date);
                if (!(date.year in this.markedDates)) {
                    this.markedDates[date.year] = {};
                }
                if (!(date.month in this.markedDates[date.year])) {
                    this.markedDates[date.year][date.month] = [];
                }
                this.markedDates[date.year][date.month].push(Object.create(options.markedDates[i]));
            }
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

        if (this.isInline) {
            this.prepareCalendarView();
        }
    }

        DateRangePicker.prototype.prepareCalendarView = function() {
            var date = this.range ? this.range.start : CalendarDate.today();
            this.calendarView.onSelectDate = this.onSelectDate.bind(this);
            this.calendarView.onSelectRange = this.onSelectRange.bind(this);
            this.calendarView.enableTooltip(this.showDayCount);
            this.calendarView.showHeader(this.showHeader);
            this.calendarView.setMarkedDates(this.markedDates);
            this.calendarView.forceMonthSpan(this.monthSpan);
            this.calendarView.showMonth(date.year, date.month);
            this.calendarView.setStartDate(this.startDate);
            this.calendarView.disableWeekends(this.weekendsDisabled);
            this.calendarView.enableOtherMonths(this.showOtherMonths);
            this.calendarView.clearAllRanges();
            if (this.range) {
                this.calendarView.showMonth(this.range.start.year, this.range.start.month);
                this.calendarView.markDateRange(this.range, 'selected', true);
            }
        }

        DateRangePicker.prototype.onFocus = function(e) {
            var el = this.element, left = 0, top = 0;
            var date = this.range ? this.range.start : CalendarDate.today();

            while (el) {
                left += el.offsetLeft;
                top += el.offsetTop;
                el = el.offsetParent;
            }

            this.calendarView.openAtPosition(left, top, this.element);

            if (document.body.clientWidth < 640) {
                this.element.blur();
            }
        };

        DateRangePicker.prototype.onSelectDate = function(date, endsRange) {
            if (!endsRange) {
                if (this.range) {
                    this.range = null;
                }
                this.calendarView.clearAllRanges();
                this.calendarView.startRangeSelect(date);
            }
        };

        DateRangePicker.prototype.onSelectRange = function(range) {
            this.range = range;
            this.calendarView.markDateRange(this.range, 'selected', true);
            this.element.value =
                this.dateFormat.fill(range.start) +
                this.separator +
                this.dateFormat.fill(range.end);

            if (!this.isInline) {
                this.calendarView.close();
            }

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
            while (el && !el.classList.contains('cal-view')) {
                el = el.parentElement;
            }
            if (!el) {
                CalendarView.instance().close();
            }
        }
    });

    if ('jQuery' in window) {
        jQuery.fn.datePicker = function(options) {
            this.each(function() {
                this._datePicker = new DatePicker(this, options);
            });
            return this;
        }
        jQuery.fn.dateRangePicker = function(options) {
            this.each(function() {
                this._datePicker = new DateRangePicker(this, options);
            });
            return this;
        }
    }

})();
