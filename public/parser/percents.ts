export let parser: any;

function percentFrom (num: number,from: number) : number{
  return from > 0 ? num * 100 / from : 0;
}
function percentOf(num: number,percent: number) : number {
  return num*percent / 100;
}
function percentChange(valNew: number,valOld: number) : number{
  return percentFrom(valNew - valOld, valOld)
}

export function addParser(parser) {
  parser.functions.percentFrom   = percentFrom;
  parser.functions.percentOf     = percentOf;
  parser.functions.percentChange = percentChange;
}
