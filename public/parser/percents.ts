export function addParser(parser) {
  parser.functions.percentFrom = function percentFrom (num,from) {
    return from >= 0 ? num * 100 / from : 0;
  }
  parser.functions.percentOf = function percentOf(num,percent) {
    return num*percent / 100;
  }
}
