# Enhanced Datatable

This visualization plugin is like a Data Table, but with enhanced features like computed columns and filter bar.

## Install

Every release includes plugins version (x.y.z) and Kibana version (a.b.c).

#### From Kibana CLI:
`./bin/kibana-plugin install https://github.com/fbaligand/kibana-enhanced-table/releases/download/x.y.z/kibana-enhanced-table-x.y.z-a.b.c.zip`

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
