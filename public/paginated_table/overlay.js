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
const KEYCODE_ARROW_LEFT = 37;
const KEYCODE_ARROW_RIGHT = 39;
const fetchDocBaseUrl = '../api/kibana-enhanced-table/datafetch';

export default class Overlay {

  docOverlayId
  overlayImageId
  overlayButtonId
  overlayCloseId
  kibanaBodyId
  noFilePId
  documentIdList
  shufflePosition
  fetchDocBaseUrl

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
    this.fetchDocBaseUrl = fetchDocBaseUrl;
  }

  createDocOverlay(documentId, documentIdList) {
    $('body').css('overflow', 'hidden');
    const overlay = $(overlayHtml);
    overlay.appendTo($('#'+this.kibanaBodyId));

    const closeOverlay = $('#'+this.overlayCloseId);
    closeOverlay.on('click',e => e.stopPropagation());
    closeOverlay.on('click',() => { this.removeOverlay() });

    $(document).keyup(e => {
      switch (e.keyCode) {
        case KEYCODE_ESC:
          this.removeOverlay();
          break;
        case KEYCODE_ARROW_LEFT:
          this.shuffle(true);
          break;
        case KEYCODE_ARROW_RIGHT:
          this.shuffle(false);
          break;
      }
    });

    this.shufflePosition = documentIdList.indexOf(documentId);
    this.documentIdList = documentIdList;
    const leftShuffle = $('#overlayContentLeft');
    const rightShuffle = $('#overlayContentRight');

    leftShuffle.on('click',e => e.stopPropagation());
    leftShuffle.on('click',() => { this.shuffle(true) });
    rightShuffle.on('click',e => e.stopPropagation());
    rightShuffle.on('click',() => { this.shuffle(false) });
  }

  removeOverlay() {
    try {
      $('#'+docOverlayId).remove();
    } catch (e) {
      console.warn('No element to remove');
    }
    $('body').css('overflow', '');
  };

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

  setFetchBtn(fetchDocBaseUrl, file) {
    const fetchBtn = $('#'+this.overlayButtonId);
    fetchBtn.off('click');
    fetchBtn.on('click',e => e.stopPropagation());
    fetchBtn.on('click',() => { this.downloadDocument(fetchDocBaseUrl, file.filename, file.metadata.contentType) });
  }

  setImage(fetchDocBaseUrl, file) {
    const imgId = '#'+this.overlayImageId
    const fetchImageUrl = fetchDocBaseUrl+'/stream?contentType='+file.metadata.contentType;
    let img;

    if (!$(imgId).length) {
      img = $('<img id="'+this.overlayImageId+'">');
      img.appendTo('#'+this.docOverlayContent);
    } else {
      img = $(imgId);
    }
    img.attr('src', fetchImageUrl);
    img.click(e => e.stopPropagation());
  }

  setContent(documentId, file, contentType) {
    const fetchDocBaseUrl = `${this.fetchDocBaseUrl}/${documentId}`;
    this.setFetchBtn(fetchDocBaseUrl, file);
    this.setFileName(file);

    if (contentType === 'image/png' || contentType === 'image/jpeg') {
      this.setImage(fetchDocBaseUrl, file);
    } else {
      const img = $('#'+this.overlayImageId);
      img.remove();
    }
  }

  setFileName(file) {
    $('#'+this.docOverlayMenuFilenameId).text(file.filename)
  }

  handleNoFile(documentId) {
    const message = `No file ${documentId} found`
    const noFileId = '#'+this.noFilePId
    let noFile;

    if (!$(noFileId).length) {
      noFile = $('<p id="'+this.noFilePId+'"></p>');
      noFile.appendTo('#'+this.docOverlayContent);
    } else {
      noFile = $(noFileId);
    }
    noFile.text(message);
  }

  shuffle(isLeft) {
    if (isLeft) {
      this.shufflePosition--;
    } else {
      this.shufflePosition++;
    }

    if (Math.abs(this.shufflePosition) >= this.documentIdList.length) {
      this.shufflePosition = 0;
    }

    let documentId = this.documentIdList.at(this.shufflePosition)
    this.fetchDocument(documentId);
  }

  fetchDocument(documentId) {
    fetch(`${this.fetchDocBaseUrl}/${documentId}/find`)
      .then(resp => resp.json())
      .then(file => {
        if (file._id === undefined || file._id === null) {
          this.handleNoFile(documentId);
        } else {
          this.setContent(documentId, file, file.metadata.contentType);
        }
      })
      .catch(err => { console.log(err); });
  }
}
