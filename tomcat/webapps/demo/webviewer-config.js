$(document).on('noteCreated', function(e, annotation, noteElement) {
    var authorName = window.parent.authors[annotation.Author];
    $(noteElement).find('.noteAuthor').text(authorName);
});

$(document).on('documentLoaded', function() {
  $('#downloadButton').parent().off().on('click', function() {
    isDownloading = true;
    readerControl.activeButtonID = '#downloadButton';
    readerControl.activeButtonClass = 'disk_save';
    readerControl.downloadFile({ downloadType: 'pdf' });
    isDownloading = false;
  });
});
