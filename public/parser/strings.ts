import { createHash } from 'crypto'
import { Readable } from 'stream'
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
function strColor(ss: string, hue? : number, saturation?: number, lightness?:number,  hRange?: number, sRange?: number, lRange?: number) : string {
  if ( hue        === undefined ) { hue        = 180; }
  if ( hRange     === undefined ) { hRange     = 180; }
  if ( saturation === undefined ) { saturation =  80; }
  if ( sRange     === undefined ) { sRange     =  20; }
  if ( lightness  === undefined ) { lightness  =  20; }
  if ( lRange     === undefined ) { lRange     =  20; }

  function findHashes(ss) {
    const hashes = [];
    let hash = strHash(ss);
    hashes[0] = parseInt(hash.substring(0,2),16);
    hashes[1] = parseInt(hash.substring(2,4),16);
    hashes[2] = parseInt(hash.substring(4,6),16);
    return hashes;
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
  const hashes = findHashes(ss);
  hue        = findVal( hue        , 0, 360, hRange, hashes[0])
  saturation = findVal( saturation , 0, 100, sRange, hashes[1])
  lightness  = findVal( lightness  , 0, 100, lRange, hashes[2])

  return `hsl(${(hue)}, ${saturation}%, ${lightness}%)`;
}

function strHash(ss: string, algorithm : string = 'sha1') : string {
  const hash = createHash(algorithm);
  return hash.update(ss).digest('hex');
}

export function addParser(parser) {
  parser.functions.findRe       = findRe;
  parser.functions.findReGroups = findReGroups;
  parser.functions.findReNamed  = findReNamed;
  parser.functions.strColor     = strColor;
  parser.functions.strJoin      = strJoin;
  parser.functions.strHash      = strHash;
}
