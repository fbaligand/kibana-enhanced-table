const colSrcNone = 0;
const colSrcRow  = 1;
const colSrcBase = 2;

export let EnhancedTableError : any;
export let parser: any;


enum ValueSource {
  None = 0,
  Base = 1,
  Row  = 2
}
class Val {
  constructor(val: any) {
    this.val = val;

    let matches;
    const colType = typeof val;
    this.isString  = colType === 'string';
    this.isNumber  = colType === 'number';
    this.isBoolean = colType === 'boolean';

    this.isVal = true;
    this.id  = 0;
    this.src = ValueSource.None;

    if (this.isString) {
      matches = val.match(/^(base|row).col(\d+)$/)
      if (matches) {
        this.id = parseInt(matches[2]);
        this.src = matches[1] === 'base' ? ValueSource.Base :  ValueSource.Row;
        this.isVal = false;
      }

      matches = val.match(/^(base|row)[(.*?)]$/)
      if (matches) {
        this.id  = matches[2]
        this.src = matches[1] === 'base' ? ValueSource.Base :  ValueSource.Row;
        this.isVal = false;
      }
    }
  }

  val: any;
  public readonly isString  : boolean = false;
  public readonly isBoolean : boolean = false;
  public readonly isNumber  : boolean = false;
  public readonly isVal     : boolean = false;
  public readonly id : number | string = 0;
  public readonly src : ValueSource = ValueSource.None;

}
class Row {
  constructor(row: any) {
    this.row = row;
  }

  colId(name:string) : string | number {
    let id : string | number = name;
    if (typeof name === 'string') {
      const matches = name.match(/col(\d+)/);
      if (matches) {
        id = parseInt(matches[1])
      }
    }
    return id;
  }

  colVal(name:string) : any {
    const colId = this.colId(name);
    const value = parser.functions.col(this.row, colId, null)
    if (value !== undefined) {
      return value;
    }
  }
  public readonly row : any;
}


class Actions {
  constructor() {
    this.byName = {}
  }
  add(action) {
    this.byName[action.name] = action;
  }
  find(name: string) : ActionBase | null {
    if ( name in this.byName ) {
      return this.byName[name];
    }
    return null
  }
  byName : Record<string, ActionBase>
}

class ActionBase {
  constructor(name) {
    this.name = name;
  }
  calc(rows,base,colName,fallback) {
    throw new EnhancedTableError("Unknown Calc")
  }
  public readonly name : string;
}
class ActionFirst extends ActionBase {
  constructor() {
    super('first')
  }
  calc(rows, base, colName, fallback) {
    if ( rows.length > 0 ) {
      const row = new Row(rows[0])
      const val = row.colVal(colName)
      if (val !== undefined) {
        return val;
      }
    }
    return fallback;
  }
}
class ActionLast extends ActionBase {
  constructor() {
    super('last')
  }
  calc(rows, base, colName, fallback) {
    if ( rows.length > 0 ) {
      const row = new Row(rows[rows.length-1])
      const val = row.colVal(colName)
      if (val !== undefined) {
        return val;
      }
    }
  }
}
class ActionSum extends ActionBase {
  constructor() {
    super('sum')
  }
  calc(rows, base, colName, fallback) {
    let sum = 0;
    let cnt = 0;
    rows.forEach(function (row1) {
      const row = new Row(row1)
      const val = row.colVal(colName)
      if (val !== undefined) {
        sum += val;
        cnt++;
      }
    });
    return cnt > 0 ? sum : fallback;
  }
}
class ActionAvg extends ActionBase {
  constructor() {
    super('avg')
  }
  calc(rows, base, colName, fallback) {
    let sum = 0;
    let cnt = 0;
    rows.forEach(function (row1) {
      const row = new Row(row1)
      const val = row.colVal(colName)
      if (val !== undefined) {
        sum += val;
        cnt++;
      }
    });
    return cnt > 0 ? sum/cnt : fallback;
  }
}
class ActionMax extends ActionBase {
  constructor() {
    super('max')
  }
  calc(rows, base, colName, fallback) {
    let max = null;
    rows.forEach(function (row1) {
      const row = new Row(row1)
      const val = row.colVal(colName)
      if ( max === null || val > max ) {
        max = val;
      }
    });
    return max !== null ? max : fallback;
  }
}
class ActionMin extends ActionBase {
  constructor() {
    super('min')
  }
  calc(rows, base, colName, fallback) {
    let min = null;
    rows.forEach(function (row1) {
      const row = new Row(row1)
      const val = row.colVal(colName)
      if ( min === null || val < min ) {
        min = val;
      }
    });
    return min !== null ? min : fallback;
  }
}

class Filters {
  constructor(qFilters: string) {
    this.filters = this.parse(qFilters)
  }

  parse(qFilters) : any {
    try {
      return JSON.parse(qFilters);
    } catch (ee) {
      throw new EnhancedTableError(`Invalid Filters format, Expected valid JSON. ${ee}`);
    }
  }

  valid(row, base, filter) {
    return this.valid1(new Row(row), new Row(base), filter)
  }

  valid1(row, base , filter) {
    if (Array.isArray(filter)) {
      for (const _filter of filter) {
        if (!this.valid1(row, base, _filter)) {
          return false;
        }
      }
      return true;
    }

    if (typeof filter === 'object') {
      for (let [filterName, filterVal] of Object.entries(filter)) {
        const col1 = row.colId(filterName)
        const val1 = row.colVal(filterVal)

        const val2 = new Val(filterVal)
        if (val2.isVal) {
          if (val2.isBoolean) {
            const val1 = row.colVal(col1)
          }
          if (val1 !== val2) {
            return false;
          }
        }
      }
      return true;
    }
  }

  private filters: any;
}





const actions = new Actions();

actions.add( new ActionFirst() );
actions.add( new ActionLast()  );
actions.add( new ActionSum()   );
actions.add( new ActionAvg()   );
actions.add( new ActionMax()   );
actions.add( new ActionMin()   );


export function make_rowval(_EnhancedTableError, _parser ) {
  EnhancedTableError = _EnhancedTableError;
  parser = _parser;
  return function (table, base1, colName, actionName, fallback, qFilters) {
    const base = new Row(base1);

    let filters = null;
    let rows = table.rows;

    if (qFilters !== undefined) {
      filters = new Filters(qFilters);
    }

    if (false && filters) {
      rows = rows.filter((row) => {
        return filters.valid(row, base, filters)
      });
    }

    if (actionName === '' || actionName === undefined) {
      actionName = 'first'
    }

    const action = actions.find(actionName);
    if (!action) {
      return fallback;
    }
    return action.calc(rows, base1, colName, fallback);
  }
}
