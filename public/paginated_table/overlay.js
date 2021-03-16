import $ from 'jquery';

const docOverlayId = "docOverlay";
const overlayImageId = "overlayImage";
const overlayButtonId = "overlayButton";
const kibanaBodyId = 'kibana-body';
const noFilePId = 'noFilePId'

export default class Overlay {

  docOverlayId
  overlayImageId
  overlayButtonId
  kibanaBodyId
  noFilePId
  overlayCss = {
    "position": "fixed",
    "display": "none",
    "width": "100%",
    "height": "100%",
    "top": "0",
    "left": "0",
    "right": "0",
    "bottom": "0",
    "background-color": "rgba(0,0,0,0.5)",
    "z-index": "20000",
    "cursor": "alias",
    "overflow-y": "scroll",
  };
  overlayImageCss = {
    "position": "relative",
    "display": "block",
    "margin-left": "auto",
    "margin-right": "auto",
    "top": "3%",
    "width": "90%",
    "height": "auto",
    "cursor": "default",
  };
  overlayButtonCss = {
    "position": "relative",
    "display": "block",
    "margin-left": "auto",
    "margin-right": "auto",
    "top": "50%",
    "width": "15%",
    "height": "40px",
    "cursor": "point",
    "color": "#FFF",
    "background-color": "#006BB4",
    "border-color": "#006BB4",
    "min-width": "250px",
    "padding": "4px",
    "border-radius": "4px",
  };
  noFilePIdCss = {
    "position": "relative",
    "display": "block",
    "margin-left": "auto",
    "margin-right": "auto",
    "top": "48%",
    "width": "140px",
    "height": "40px",
    "cursor": "default",
    "color": "#FFF",
    "background-color": "#af3a6f",
    "padding": "5px",
    "font-size": "larger",
    "padding-top": "10px",
    "border-radius": "4px",
  };
  constructor() {
    this.docOverlayId = docOverlayId;
    this.overlayImageId = overlayImageId;
    this.overlayButtonId = overlayButtonId;
    this.kibanaBodyId = kibanaBodyId;
    this.noFilePId = noFilePId;
  };

  dispayDocOverlay() {
    $('#'+this.docOverlayId).css('display', 'block');
  };

  hideDocOverlay() {
    $('#'+docOverlayId).css('display', 'none');
    try {
      $('#'+overlayImageId).remove();
      $('#'+overlayButtonId).remove();
      $('#'+noFilePId).remove();
    } catch (e) {
      console.warn("No element to remove");
    }
  };

  createDocOverlay() {
    const overlay = $('<div id="'+this.docOverlayId+'">');
    overlay.css(this.overlayCss);
    overlay.appendTo($('#'+this.kibanaBodyId));
    overlay.click(this.hideDocOverlay);
  };

  downloadDocument(fetchDocBaseUrl, filename, contentType) {
    const downloadDocUrl = fetchDocBaseUrl +"/download?filename="+filename+"&contentType="+contentType;
    fetch(downloadDocUrl)
      .then(resp => resp.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // the filename you want
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(()=> console.log("Download failed!"));
  }
}
