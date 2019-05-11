# Kibana Enhanced Table

This Kibana visualization plugin is like a Data Table, but with enhanced features like computed columns and filter bar.

## Features

- Add computed columns, based on other columns :
  - Support for [expr-eval](https://github.com/silentmatt/expr-eval#expression-syntax) expressions
  - Support for numeric columns (ex: `col0 + col1` or `col[0] + col[1]`)
  - Support for string columns, including HTML (ex: `col0 > 0 ? 'OK' : 'KO'`)
  - Ability to reference total hits count returned by ES query (ex: `col0 / total * 100`)
  - Ability to reference a column by its label (ex: `col['Sum of duration'] / col['Count']`)
  - Support for numeric pretty format using [Numeral.js](http://numeraljs.com/#format) (ex: `0,0.00`)
  - Support for date pretty format using [Moment.js](http://momentjs.com/docs/#/displaying/format/) (ex: `YYYY-MM-DD`)
  - Support for column alignment (ex: `left`, `right`)
  - Support for template rendering using [Handlebars](http://handlebarsjs.com/expressions.html) (ex: `<strong>{{value}}</strong>`)
  - Template can reference other columns (ex: `<span style="color: {{col0}}">{{value}}</span>`)
  - Column reference validation (by number or label), with error notification
- Filter table lines based on a computed formula (ex: `col0 > 0`)
- Hide some table columns (ex: `0,1` hides columns 0 and 1)
- Add a filter bar (ex: when user enters `cat` filter, it will display only rows that contain "cat")  
  - Works also with numeric and date columns
  - Ability to enable case sensitive filter
  - Ability to make filter bar hideable
  - Ability to filter as you type
  - Ability to filter each term separately
  - Ability to highlight filter results
  - Ability to define filter bar width
- Support for a new bucket type : 'Split Cols'. It lets to create a pivot table
  - When combined with computed columns, each computed column can be added per split column or after all split columns  
- Hide export links (when checked, it will hide "Raw" and "Formatted" export links)
- Add a total label on total line first column (ex: `Total:`)
- Kibana supported versions : all versions from 5.5 to 7.0

## Demo

![Demo](docs/demo.gif)


## Install

Every release package includes a Plugin version (X.Y.Z) and a Kibana version (A.B.C).

- Go to [releases](https://github.com/fbaligand/kibana-enhanced-table/releases "Go to releases!") and choose the right one for your Kibana
- launch a shell terminal and go to $KIBANA_HOME/bin folder
- use Kibana CLI to install : 
  - directly from Internet URL :
`$KIBANA_HOME/bin/kibana-plugin install https://github.com/fbaligand/kibana-enhanced-table/releases/download/vX.Y.Z/enhanced-table-X.Y.Z_A.B.C.zip`
  - locally after manual download :
`$KIBANA_HOME/bin/kibana-plugin install file:///path/to/enhanced-table-X.Y.Z_A.B.C.zip`
- restart Kibana


## Change Log

Versions and Release Notes are listed in [Releases](https://github.com/fbaligand/kibana-enhanced-table/releases) page


## Credits

This Kibana plugin is inspired from [computed-columns](https://github.com/seadiaz/computed-columns) and [kbn_searchtables](https://github.com/dlumbrer/kbn_searchtables) plugins.  
Thanks for their great work !


## Development

To run enhanced-table plugin in development mode (that enables hot code reload), follow these instructions:
- execute these commands :
``` bash
git clone https://github.com/elastic/kibana.git
git clone https://github.com/fbaligand/kibana-enhanced-table.git
cd kibana
git reset --hard vX.Y.Z # replace 'X.Y.Z' by desired Kibana version
```
- install the version of Node.js listed in the `.node-version` file
- ensure that `node` binary is both in `PATH` environment variable and in `kibana/node` folder
- install the latest version of [yarn](https://yarnpkg.com)
- execute these commands :
``` bash
yarn kbn bootstrap
cd ../kibana-enhanced-table
yarn install
yarn start
```
- in your browser, call `http://localhost:5601` and enjoy!


To build a distributable archive, execute this command :
``` bash
yarn build --kibana-version X.Y.Z # replace 'X.Y.Z' by desired Kibana version
```
