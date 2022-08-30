export let EnhancedTableError : any = Error;
export let parser: any;

function findRe( ss: string , reStr : string, group: number|string, fallback: string ) : string {
  let re: RegExp;
  try {
    re = new RegExp(reStr);
  } catch (ee) {
    throw EnhancedTableError(ee.toString());
  }
  const matches = ss.match(re);
  if ( matches ) {
    if ( typeof group === "number" ) {
      if (group < matches.length) {
        return matches[group];
      }
    } else {
      if (group in matches.groups) {
        return matches.groups[group];
      }
    }
  }
  return fallback;
}

function findReGroups( ss: string , reStr : string ) : string[] {
  let re: RegExp;
  try {
    re = new RegExp(reStr);
  } catch (ee) {
    throw EnhancedTableError(ee.toString());
  }
  const matches = ss.match(re);
  if ( matches ) {
    return matches;
  }
  return [];
}

function findReNamed( ss: string , reStr : string ) : { [key: string]: string; } {
  let re: RegExp;
  try {
    re = new RegExp(reStr);
  } catch (ee) {
    throw EnhancedTableError(ee.toString());
  }
  const matches = ss.match(re);
  if ( matches ) {
    return matches.groups;
  }
  return {};
}

function strJoin(s1:string, s2: string) : string {
  return s1 + s2;
}
function strColor(ss: string, hue? : number, saturation?: number, lightness?:number, hRange?: number, sRange?: number, lRange?: number) : string {
  if ( hue        === undefined ) { hue        = 180; }
  if ( hRange     === undefined ) { hRange     = 180; }
  if ( saturation === undefined ) { saturation =  80; }
  if ( sRange     === undefined ) { sRange     =  20; }
  if ( lightness  === undefined ) { lightness  =  80; }
  if ( lRange     === undefined ) { lRange     =  20; }

  let hash1 = 0x9123;
  let hash2 = 0x811C;
  let hash3 = 0x1C91;

  const cc = ss.length
  for (let ii = 0; ii <  2; ii++) {
    for (let kk = 0; kk < ss.length; kk++) {
      hash1 = ((3 * hash1 + ss.charCodeAt((kk + 1 ) % cc)) | 0)
      hash2 = ((3 * hash2 ^ ss.charCodeAt((kk + 3 ) % cc)) | 0)
      hash3 = ((3 * hash3 + ss.charCodeAt((cc - kk) % cc)) | 0)
    }
  }

  function findVal(val : number, min: number, max: number, rangeFull: number, rangeChange: number ) : number {
    val =  val - Math.round(rangeFull / 2) + rangeChange % rangeFull;
    if ( val > max ) {
      return max;
    }
    if ( val < min ) {
      return min;
    }
    return val

  }
  saturation = findVal( saturation , 0, 100, sRange, hash1)
  lightness  = findVal( lightness  , 0, 100, lRange, hash2)
  hue        = findVal( hue        , 0, 360, hRange, hash3)

  return `hsl(${(hue)}, ${saturation}%, ${lightness}%)`;
}

export function addParser(parser) {
  parser.functions.findRe       = findRe;
  parser.functions.findReGroups = findReGroups;
  parser.functions.findReNamed  = findReNamed;
  parser.functions.strColor     = strColor;
  parser.functions.strJoin      = strJoin;
}
