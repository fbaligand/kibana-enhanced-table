# Kibana Enhanced Table

This Kibana visualization plugin is like a Data Table, but with enhanced features like computed columns and filter bar.

## Features

- Add computed columns, based on other columns (ex: col[0] * col[1])
  - Support for number and string formats
- Hide some table columns (ex: "0,1" hides columns 0 and 1)
- Add a filter bar (ex: "cat" will display only rows that contain "cat")
- Hide export links (ex: when enabled, will hide "Raw" and "Formatted" export links)


## Install

Every release includes a Plugin version (X.Y.Z) and a Kibana version (A.B.C).

#### From Kibana CLI:
`./bin/kibana-plugin install https://github.com/fbaligand/kibana-enhanced-table/releases/download/vX.Y.Z/kibana-enhanced-table-X.Y.Z_A.B.C.zip`

## Credits

This plugin is inspired from [computed-columns](https://github.com/seadiaz/computed-columns) and [kbn_searchtables](https://github.com/dlumbrer/kbn_searchtables) plugins.  
Thanks for their great work !

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions setting up your development environment. Once you have completed that, use the following npm tasks.

  - `npm start`

    Start kibana and have it include this plugin

  - `npm start -- --config kibana.yml`

    You can pass any argument that you would normally send to `bin/kibana` by putting them after `--` when running `npm start`

  - `npm run build`

    Build a distributable archive

  - `npm run test:browser`

    Run the browser tests in a real web browser

  - `npm run test:server`

    Run the server tests using mocha

For more information about any of these commands run `npm run ${task} -- --help`.
