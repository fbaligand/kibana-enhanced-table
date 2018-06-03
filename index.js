export default function (kibana) {

  return new kibana.Plugin({
    id: 'enhanced-table',
    uiExports: {
      visTypes: [
        'plugins/enhanced-table/enhanced-table-vis'
      ],
      hacks: [
        'plugins/enhanced-table/enhanced-table-vis-hack'
      ]
    }
  });

}
