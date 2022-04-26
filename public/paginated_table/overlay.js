import $ from 'jquery';
import overlayHtml from './overlay.html';

const docOverlayId = 'docOverlay';
const docOverlayMenuId = 'docOverlayMenuId';
const docOverlayContent = 'docOverlayContent';
const overlayImageId = 'overlayImage';
const overlayButtonId = 'overlayButton';
const overlayCloseId = 'overlayCloseBtn';
const docOverlayMenuFilenameId = 'docOverlayMenuFilenameId';
const kibanaBodyId = 'kibana-body';
const noFilePId = 'noFilePId';
const KEYCODE_ESC = 27;

const removeOverlay = () => {
  try {
    $('#'+docOverlayId).remove();
  } catch (e) {
    console.warn('No element to remove');
  }
  $('body').css('overflow', '');
};

export default class Overlay {

  docOverlayId
  overlayImageId
  overlayButtonId
  overlayCloseId
  kibanaBodyId
  noFilePId

  constructor() {
    this.docOverlayId = docOverlayId;
    this.docOverlayMenuId = docOverlayMenuId;
    this.docOverlayContent = docOverlayContent;
    this.overlayImageId = overlayImageId;
    this.overlayButtonId = overlayButtonId;
    this.overlayCloseId = overlayCloseId;
    this.docOverlayMenuFilenameId = docOverlayMenuFilenameId;
    this.kibanaBodyId = kibanaBodyId;
    this.noFilePId = noFilePId;
  }

  createDocOverlay() {
    $('body').css('overflow', 'hidden');
    const overlay = $(overlayHtml);
    overlay.appendTo($('#'+this.kibanaBodyId));

    const closeOverlay = $('#'+this.overlayCloseId);
    closeOverlay.click(e => e.stopPropagation());
    closeOverlay.click(() => {
      removeOverlay();
    });

    $(document).keyup(function(e) {
      if (e.keyCode === KEYCODE_ESC) removeOverlay();
    });
  }

  downloadDocument(fetchDocBaseUrl, filename, contentType) {
    const downloadDocUrl = fetchDocBaseUrl +'/download?filename='+filename+'&contentType='+contentType;
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
      .catch(()=> console.log('Download failed!'));
  }

  createFetchBtn(fetchDocBaseUrl, file) {
    const fetchBtn = $('#'+this.overlayButtonId);
    fetchBtn.click(e => e.stopPropagation());
    fetchBtn.click(() => {
      this.downloadDocument(fetchDocBaseUrl, file.filename, file.metadata.contentType);
    });
  }

  createImage(fetchDocBaseUrl, file) {
    const fetchImageUrl = fetchDocBaseUrl+'/stream?contentType='+file.metadata.contentType;
    const img = $('<img id="'+this.overlayImageId+'">');
    img.attr('src', fetchImageUrl);
    img.click(e => e.stopPropagation());
    img.appendTo('#'+this.docOverlayContent);
  }

  render(fetchDocBaseUrl, file, contentType) {
    if (contentType === 'image/png' || contentType === 'image/jpeg') {
      this.createImage(fetchDocBaseUrl, file);
      this.createFetchBtn(fetchDocBaseUrl, file);
    } else {
      this.createFetchBtn(fetchDocBaseUrl, file);
    }
    this.createFileName(file);
  }

  createFileName(file) {
    $('#'+this.docOverlayMenuFilenameId).text(file.filename)
  }

  handleNoFile() {
    const noFileP = $('<p id="'+this.noFilePId+'">No file found</p>');
    noFileP.appendTo('#'+this.docOverlayContent);
  }
}
