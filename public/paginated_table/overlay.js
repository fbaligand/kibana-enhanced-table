import $ from 'jquery';

const docOverlayId = "docOverlay";
const overlayImageId = "overlayImage";
const overlayButtonId = "overlayButton";
const kibanaBodyId = 'kibana-body';
const noFilePId = 'noFilePId'
const KEYCODE_ESC = 27;

const hideDocOverlay = () => {
  $('#'+docOverlayId).css('display', 'none');
  $('body').css('overflow', '');
  try {
    $('#'+overlayImageId).remove();
    $('#'+overlayButtonId).remove();
    $('#'+noFilePId).remove();
  } catch (e) {
    console.warn("No element to remove");
  }
};

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
    "top": "4%",
    "max-width": "75%",
    "height": "auto",
    "cursor": "default",
    "box-shadow": "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
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
    "box-shadow": "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
    "text-decoration": "none",
  };
  overlayButtonCssHover = {
    "background-color": "#005c9b",
    "text-decoration": "underline",
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
    $('body').css('overflow', 'hidden');
  };

  createDocOverlay() {
    const overlay = $('<div id="'+this.docOverlayId+'">');
    overlay.css(this.overlayCss);
    overlay.appendTo($('#'+this.kibanaBodyId));
    overlay.click(hideDocOverlay);
    $(document).keyup(function(e) {
      if (e.keyCode === KEYCODE_ESC) hideDocOverlay();
    });
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

  createFetchBtn(fetchDocBaseUrl, file) {
    const fetchBtn = $('<button id="'+this.overlayButtonId+'">Download document</button>');
    fetchBtn.css(this.overlayButtonCss);
    fetchBtn.click(e => e.stopPropagation());
    fetchBtn.click(() => {
      this.downloadDocument(fetchDocBaseUrl, file.filename, file.metadata.contentType);
    });
    fetchBtn.hover(
      () => { fetchBtn.css(this.overlayButtonCssHover); },
      () => { fetchBtn.css(this.overlayButtonCss); });
    fetchBtn.appendTo('#'+this.docOverlayId);
  }

  createImage(fetchDocBaseUrl, file) {
    const fetchImageUrl = fetchDocBaseUrl+'/stream?contentType='+file.metadata.contentType;
    const img = $('<img id="'+this.overlayImageId+'">');
    img.css(this.overlayImageCss);
    img.attr('src', fetchImageUrl);
    img.click(e => e.stopPropagation());
    img.appendTo('#'+this.docOverlayId);
  }

  handleNoFile() {
    const noFileP = $('<p id="'+this.noFilePId+'">No file found</p>>');
    noFileP.css(this.noFilePIdCss);
    noFileP.appendTo('#'+this.docOverlayId);
  }
}
