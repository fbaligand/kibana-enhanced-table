export function addParser(parser) {
  parser.functions.percentFrom = function percentFrom (num: number,from: number) : number{
    return from >= 0 ? num * 100 / from : 0;
  }
  parser.functions.percentOf = function percentOf(num: number,percent: number) : number {
    return num*percent / 100;
  }
  parser.functions.percentChange = function percentOf(valNew: number,valOld: number) : number{
    return parser.functions.percentFrom(valNew-valOld, valOld)
  }
}
