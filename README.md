# Date picker

## Installation

```
<link rel="stylesheet" type="text/css" href="/path/to/datepicker/datepicker.css"/>
<link rel="stylesheet" type="text/css" href="/path/to/datepicker/datepicker-theme.css"/>
<script src="/path/to/datepicker/datepicker.js"></script>
```

## Usage

```
<input type="date" />

...

<script>
$('input[type="date"]').datePicker();
</script>
```

To initialize with options:

```
<script>
$('input[type="date"]').datePicker({
    selectRange: true|false             // Default: false
    format: 'dd-mm-yyyy',               // Default: 'yyyy-mm-dd'
    startDate: 'today' | '31-08-1986',  // A date literal should conform to the format option
    disableWeekends: true|false,        // Default: false
    onChange: function(element, dateOrRange, stringValue) {
    	// ...
    }
});
</script>
```

## Customize

Copy and edit ```datepicker-theme.css``` to customize colors and fonts. Then include that file instead of ```datepicker-theme.css```.