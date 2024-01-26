# Kibana Enhanced Table

This project is a Kibana plugin that provides two visualizations:
- **Enhanced Table:** same than Data Table, but with enhanced features like computed columns, filter bar and pivot table.
- **Document Table (NEW):** same thing than 'Enhanced Table' visualization, but for single documents (not aggregations). It especially allows to have enhanced features compared to a saved search (custom column labels, custom hits size, custom pagination, computed columns and filter bar).


## Features

- Add computed columns, based on other columns :
  - Computed formula based on [expr-eval](https://github.com/silentmatt/expr-eval#expression-syntax) expressions (more documentation [here](#computed-settings-documentation))
  - Support for numeric columns (ex: `col0 + col1` or `col[0] + col[1]`)
  - Support for string columns, including HTML (ex: `col0 > 0 ? 'OK' : 'KO'`)
  - Support for date columns
  - Ability to reference total hits count matched by Elasticsearch query (ex: `col0 / total * 100` or `col0 / totalHits * 100`)
  - Ability to reference a column by its label (ex: `col['Sum of duration'] / col['Count']`)
  - Ability to reference a column total (ex: `col['Sales by month'] / total['Sales by month']`)
  - Ability to reference Kibana time range (ex: `timeRange.duration.months`)
  - Ability to define/reference arrays, do variable assignment and define custom functions in expressions
  - Ability to compute column total using formula
  - Support for numeric pretty format using [Numeral.js](http://numeraljs.com/#format) (ex: `0,0.00`)
  - Support for date pretty format using [Moment.js](http://momentjs.com/docs/#/displaying/format/) (ex: `YYYY-MM-DD`)
  - Support for duration pretty format using Kibana duration format
  - Support for column alignment (ex: `left`, `right`)
  - Support for template rendering using [Handlebars](https://handlebarsjs.com/guide/expressions.html) (ex: `<strong>{{value}}</strong>`)
  - Template can reference other columns (ex: `<span style="color: {{col0}}">{{value}}</span>`)
  - Template can reference another column by its label (ex: `<span style="color: {{col['color']}}">{{value}}</span>`)
  - Template can encode a value to render it as a URL parameter (ex: `<a href="my-dashboard?param={{{encodeURIComponent value}}}">{{value}}</a>`)
  - Support for cell computed CSS based on a computed formula (ex: `value < 0 ? 'background-color: red' : ''`)
    - More documentation [here](#computed-settings-documentation)
  - Support for computed column filtering (Filter for/out value) if formula simply references a column value (ex: `col0`)
  - Ability to custom column position (to render computed column in a previous position in the table)
- Filter table rows based on a computed formula (ex: `col0 > 0`)
  - More documentation [here](#computed-settings-documentation)
- Set dynamically row CSS based on a computed formula (ex: `col0 < 0 ? 'background-color: red' : ''`)
  - More documentation [here](#computed-settings-documentation)
- Hide some table columns (ex: `0,1,Col2 Label` hides columns 0, 1 and the column labeled 'Col2 Label')
  - Note that the column label must be written as is (including whitespaces), with no surrounding quotes.
  - Column labels containing commas are not supported since the comma is used to separate the columns
  - It is recommended to use column labels to hide columns rather than their indices. Using the 'Split cols' feature, in fact, indices might depend on the global timerange that has been set. 
- Add a filter bar (ex: when user enters `cat` filter, it will display only rows that contain 'cat')  
  - Works also with numeric and date columns
  - Ability to enable case sensitive filter
  - Ability to make filter bar hideable
  - Ability to filter as you type
  - Ability to filter each term separately
  - Ability to highlight filter results
  - Ability to define filter bar width
- Support for a new bucket type : 'Split Cols'. It lets to create a pivot table
  - When combined with computed columns, each computed column can be added per split column or after all split columns  
  - Ability to sort split columns (by split column value)
- Hide CSV export links (when checked, it will hide 'Raw' and 'Formatted' export links)
- Change CSV export encoding (ex: `iso-8859-1`)
- Full CSV export: in Document Table vis, ability to download full data in Elasticsearch, not only displayed data in the table (Kibana 7.7+)
- Add total row to CSV export
- Add a total label on total row first column (ex: `Total:`)
- Display striped rows
- Add a row number column
- Ability to add the visualization to a Canvas workpad (Kibana 7.9+)
- Ability to use dashboard drilldowns (Kibana 7.9+)
- Kibana supported versions: all versions from 5.5 to 8.7
- OpenSearch Dashboards supported versions : all versions from 1.x to 2.x

## Demo

![Demo](docs/demo.gif)


## Getting Started

### Install

Every release package includes a Plugin version (X.Y.Z) and a Kibana version (A.B.C).

- Go to [releases](https://github.com/fbaligand/kibana-enhanced-table/releases) and choose the right one for your Kibana
- launch a shell terminal and go to $KIBANA_HOME folder
- use Kibana CLI to install :
  - directly from Internet URL :
`./bin/kibana-plugin install https://github.com/fbaligand/kibana-enhanced-table/releases/download/vX.Y.Z/enhanced-table-X.Y.Z_A.B.C.zip`
  - locally after manual download :
`./bin/kibana-plugin install file:///path/to/enhanced-table-X.Y.Z_A.B.C.zip`
- restart Kibana

### First Use

- Open Kibana URL in your browser (by default: [http://localhost:5601](http://localhost:5601))
- Go to "Visualize" app
- Click on "Create visualization" button
- If you use Kibana 7.11 or superior, click on "Aggregation based"
- If you want a table based on aggregated data:
  - Choose "Enhanced Table"
  - Select your index-pattern, and then your buckets & metrics
  - Go to "Options" tab, and enjoy the enhanced features: computed columns, hidden columns, filter bar, and so on...
- If you want a table based on single documents:
  - Choose "Document Table"
  - Select your index-pattern
  - Then in 'Data' tab, define columns to display and indicate "Hits size"
  - Go to "Options" tab, and enjoy the enhanced features: computed columns, hidden columns, filter bar, and so on...

### Troubleshooting

If you don't see 'Enhanced Table' (when you go to "Create visualization" screen) or if you see any error, try these actions:
- in your browser, force Kibana page reload: Shift+F5 or Ctrl+F5
- if it still doesn't work, empty your browser cache (using Ctrl+Shift+Del), and then, reload Kibana page
- if it still doesn't work:
  - stop Kibana
  - delete `$KIBANA_HOME/optimize` folder
  - start Kibana
  - empty again your browser cache
  - reload Kibana page in your browser


## Computed Settings documentation

This is the common documentation for all computed settings:
- Computed Column Formula
- Cell Computed CSS
- Rows Computed Filter
- Rows Computed CSS


### Available features

- Support for [expr-eval](https://github.com/silentmatt/expr-eval#expression-syntax) expressions
- Support for features brought by expr-eval 2.0:
  - Ability to reference arrays. Especially useful to reference a 'Top Hits' metric column: `col1[0]`
  - New functions for arrays available: `join, map, filter`
  - Variable assignment: `x = 4`
  - Custom function definitions: `myfunction(x, y) = x * y`
  - Evaluate multiple expressions by separating them with `;`
- Formula validation, with error notification


### Available variables

- `col0, col1, ..., colN`: value of a previous column, referenced by its index (0-based index)
- `col['COLUMN_LABEL']`: value of a previous column, referenced by its label
- `total0, total1, ..., totalN`: total of a previous column, referenced by its index (0-based index)
- `total['COLUMN_LABEL']`: total of a previous column, referenced by its label
- `total`, `totalHits`: total hits count matched by Elasticsearch query (given search bar & filter bar)
- `value`: value of current computed column (only available in "Cell computed CSS" feature)
- `timeRange`: informations about current time range, selected in Kibana time picker
  - `duration`: object containing time range duration, in different units
    - `years`: years count in time range (rounded up to the nearest whole number)
    - `months`: months count in time range (rounded up to the nearest whole number)
    - `weeks`: weeks count in time range (rounded up to the nearest whole number)
    - `days`: days count in time range (rounded up to the nearest whole number)
    - `hours`: hours count in time range (rounded up to the nearest whole number)
    - `minutes`: minutes count in time range (rounded up to the nearest whole number)
    - `seconds`: seconds count in time range (rounded up to the nearest whole number)
    - `milliseconds`: milliseconds count in time range
  - <a aria-hidden="true" tabindex="-1" id="time-range-from-to" name="time-range-from-to"></a>`from` / `to`: object containing all informations on `from` and `to` dates of current time range
    - `fullYear`: result of [Date.getFullYear()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getFullYear)
    - `month`: result of [Date.getMonth()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getMonth)
    - `date`: result of [Date.getDate()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDate)
    - `day`: result of [Date.getDay()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDay)
    - `hours`: result of [Date.getHours()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getHours)
    - `minutes`: result of [Date.getMinutes()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getMinutes)
    - `seconds`: result of [Date.getSeconds()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getSeconds)
    - `milliseconds`: result of [Date.getMilliseconds()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getMilliseconds)
    - `time`: result of [Date.getTime()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime)
    - `timezoneOffset`: result of [Date.getTimezoneOffset()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
    - `dateString`: result of [Date.toDateString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toDateString)
    - `isoString`: result of [Date.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
    - `localeDateString`: result of [Date.toLocaleDateString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString)
    - `localeString`: result of [Date.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString)
    - `localeTimeString`: result of [Date.toLocaleTimeString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString)
    - `string`: result of [Date.toString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toString)
    - `timeString`: result of [Date.toTimeString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toTimeString)
    - `utcString`: result of [Date.toUTCString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toUTCString)


### Available functions

- All pre-defined functions provided by [expr-eval](https://github.com/silentmatt/expr-eval#pre-defined-functions)
- Additional custom functions listed in table below (ex: `col['Expiration Date'] > now() ? 'OK' : 'KO'`)

Function     | Description
:----------- | :----------
cell(rowRef, colRef, defaultValue)  | Returns table cell value referenced by `rowRef` and `colRef` (if it exists), or else `defaultValue`. `rowRef` is either `'first'` (for first row), `'last'` (for last row) or a number that is the relative target row position compared to current row (ex: `-1` means the previous row). `colRef` is either the column label (ex: `'Count'`) or the column index (ex: `1`).
col(colRef, defaultValue)  | Returns column value referenced by `colRef` (if it exists), or else `defaultValue`. `colRef` is either the column label (ex: `'Count'`) or the column index (ex: `1`).
countSplitCols()  | Returns the count of all split columns (only if 'Split cols' bucket is used).
[dateObject(params)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date)  | Given standard `Date` constructor params (milliseconds since Epoch, ...), builds and returns a date object, same structure than [timeRange from/to object](#time-range-from-to). The result can be used in template (ex: `{{ rawValue.fullYear }}`).
durationObject(durationInMillis)  | Given a duration in milliseconds, builds and returns a duration object, that breaks down the duration in years, months, weeks, days, hours, minutes, seconds and milliseconds. The result can be used in template (ex: `{{ rawValue.hours }}`).
[encodeURIComponent(str)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)  | Encodes the provided string as a Uniform Resource Identifier (URI) component.
formattedCell(rowRef, colRef, defaultValue)  | Returns formatted table cell value referenced by `rowRef` and `colRef` (if it exists), or else `defaultValue`. `rowRef` is either `'first'` (for first row), `'last'` (for last row) or a number that is the relative target row position compared to current row (ex: `-1` means the previous row). `colRef` is either the column label (ex: `'Count'`) or the column index (ex: `1`).
formattedCol(colRef, defaultValue)  | Returns formatted column value referenced by `colRef` (if it exists), or else `defaultValue`. `colRef` is either the column label (ex: `'Count'`) or the column index (ex: `1`).
[indexOf(strOrArray, searchValue\[, fromIndex\])](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf)  | Returns the index within the calling String or Array object of the first occurrence of the specified value, starting the search at fromIndex. Returns -1 if the value is not found.
[isArray(value)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray)  | Determines whether the passed value is an Array.
[lastIndexOf(strOrArray, searchValue\[, fromIndex\])](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/lastIndexOf)  | Returns the index within the calling String or Array object of the last occurrence of the specified value, searching backwards from fromIndex. Returns -1 if the value is not found.
[now()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now)  | Returns the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
[parseDate(dateString)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse)  | Returns the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC and the date obtained by parsing the given string representation of a date. If the argument doesn't represent a valid date, NaN is returned. Useful to parse date columns in 'Document Table' visualization.
[replace(str, substr, replacement)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)  | Returns a new string with first match of substr replaced by a replacement. Only the first occurrence will be replaced.
[replaceRegexp(str, regexp, replacement)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)  | Returns a new string with all matches of a regexp replaced by a replacement. All the occurrences will be replaced.
[search(str, regexp)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/search)   | Executes a search for a match between a regular expression on 'str' String. Returns the index of the first match or -1 if not found.
[sort(array\[, compareFunction\])](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)   | Sorts the elements of an array in place and returns the sorted array. A compare function can be provided to customize the sort order. Example for an array of numbers: `comparator(a, b) = a - b; sort(col0, comparator)`
[substring(str, indexStart\[, indexEnd\])](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring)   | Returns the part of the string between the start and end indexes, or to the end of the string (if no index end is provided).
sumSplitCols()   | Returns the sum of all split column values (only if 'Split cols' bucket is used).
[toLowerCase(str)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLowerCase)   | Returns the calling string value converted to lowercase.
[toUpperCase(str)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toUpperCase)   | Returns the calling string value converted to uppercase.
total(colRef, defaultValue)  | Returns column total referenced by `colRef` (if it exists), or else `defaultValue`. `colRef` is either the column label (ex: `'Count'`) or the column index (ex: `1`).
[trim(str)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim)   | Removes whitespace from both ends of a string.
[uniq(array)](https://lodash.com/docs/3.10.1#uniq)   | Removes duplicates from provided array so that array contains only unique values.


## Computed Column Template documentation

This is the documentation for "Template" setting in computed columns.  
A template is a [Handlebars](https://handlebarsjs.com/guide/expressions.html) expression.  
Examples:  
- `<strong>{{value}} items</strong>`
- `{{timeRange.from.localeDateString}} - {{timeRange.to.localeDateString}}`
- `<a href="my-dashboard?param={{{encodeURIComponent rawValue}}}">{{value}}</a>`
- `{{#if rawValue}}OK{{else}}KO{{/if}}`


### Available variables

- `col0, col1, ..., colN`: raw value of a previous column, referenced by its index (0-based index)
- `col['COLUMN_LABEL']`: raw value of a previous column, referenced by its label
- `formmattedCol, formmattedCol1, ..., colN`: formatted value of a previous column, referenced by its index (0-based index)
- `formattedCol['COLUMN_LABEL']`: formatted value of a previous column, referenced by its label
- `total0, total1, ..., totalN`: total of a previous column, referenced by its index (0-based index)
- `total['COLUMN_LABEL']`: total of a previous column, referenced by its label
- `total`, `totalHits`: total hits count matched by Elasticsearch query (given search bar & filter bar)
- `value`: value of current computed column, formatted using "Format" setting
- `rawValue`: value of current computed column, not formatted
- `timeRange`: informations about current time range, selected in Kibana time picker
  - `duration`: object containing time range duration, in different units
    - `years`: years count in time range (rounded up to the nearest whole number)
    - `months`: months count in time range (rounded up to the nearest whole number)
    - `weeks`: weeks count in time range (rounded up to the nearest whole number)
    - `days`: days count in time range (rounded up to the nearest whole number)
    - `hours`: hours count in time range (rounded up to the nearest whole number)
    - `minutes`: minutes count in time range (rounded up to the nearest whole number)
    - `seconds`: seconds count in time range (rounded up to the nearest whole number)
    - `milliseconds`: milliseconds count in time range
  - `from` / `to`: object containing all informations on `from` and `to` dates of current time range
    - `fullYear`: result of [Date.getFullYear()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getFullYear)
    - `month`: result of [Date.getMonth()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getMonth)
    - `date`: result of [Date.getDate()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDate)
    - `day`: result of [Date.getDay()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDay)
    - `hours`: result of [Date.getHours()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getHours)
    - `minutes`: result of [Date.getMinutes()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getMinutes)
    - `seconds`: result of [Date.getSeconds()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getSeconds)
    - `milliseconds`: result of [Date.getMilliseconds()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getMilliseconds)
    - `time`: result of [Date.getTime()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime)
    - `timezoneOffset`: result of [Date.getTimezoneOffset()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
    - `dateString`: result of [Date.toDateString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toDateString)
    - `isoString`: result of [Date.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
    - `localeDateString`: result of [Date.toLocaleDateString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString)
    - `localeString`: result of [Date.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString)
    - `localeTimeString`: result of [Date.toLocaleTimeString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString)
    - `string`: result of [Date.toString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toString)
    - `timeString`: result of [Date.toTimeString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toTimeString)
    - `utcString`: result of [Date.toUTCString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toUTCString)


### Available helpers

- All pre-defined helpers provided by [Handlebars](https://handlebarsjs.com/guide/builtin-helpers.html)
- Additional custom helpers listed in table below.

Helper     | Description
:----------- | :----------
[encodeURIComponent(str)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)  | Encodes the provided string as a Uniform Resource Identifier (URI) component. Example: `<a href="my-dashboard?param={{{encodeURIComponent rawValue}}}">{{value}}</a>`


## Change Log

Versions and Release Notes are listed in [Releases](https://github.com/fbaligand/kibana-enhanced-table/releases) page


## Credits

This Kibana plugin is inspired from [computed-columns](https://github.com/seadiaz/computed-columns) and [kbn_searchtables](https://github.com/dlumbrer/kbn_searchtables) plugins.  
Thanks for their great work !


## Development

To run enhanced-table plugin in development mode (that enables hot code reload), follow these instructions:
- execute these commands :
``` bash
git clone --depth 1 -b X.Y https://github.com/elastic/kibana.git # replace 'X.Y' by desired Kibana version
cd kibana/plugins
git clone https://github.com/fbaligand/kibana-enhanced-table.git enhancedTable
cd ..
```
- install the version of Node.js noted in `kibana/.node-version` file (for instance using `nvm use` command)
- ensure that node binary directory is in PATH environment variable
- install the latest version of [yarn](https://yarnpkg.com): `npm install -g yarn`
- execute these commands (starting from 'kibana' directory) :
``` bash
yarn kbn bootstrap
cd plugins/enhancedTable
yarn install
yarn compile
yarn start
```
- in your browser, call `http://localhost:5601` and enjoy!


To build a distributable archive, execute this command :
``` bash
yarn compile-and-build --kibana-version X.Y.Z # replace 'X.Y.Z' by target Kibana version
```
The zip archive is generated into `build` directory.


## Donation

If this plugin helps you and you want to support it, you can give me a cup of coffee :)

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=fbaligand%40gmail.com&currency_code=EUR&source=url)
