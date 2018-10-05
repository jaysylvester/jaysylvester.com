// global JS

$(document).ready( function () {
    var $html = $('html');

    if ( Modernizr.mq('only screen and (max-width: 767px)') ) {
        $('html').addClass('small');
    }
    if ( Modernizr.mq('only screen and (min-width: 768px) and (max-width: 1023px)') ) {
        $('html').addClass('medium');
    }
    if ( Modernizr.mq('only screen and (min-width: 1024px)') ) {
        $('html').addClass('large');
    }

    if ( $html.hasClass('medium') || $html.hasClass('large') ) {
        $('#category-nav div.subcategories ul:first-child').append('<li class="more appended"><a href="#">More...</a></li>');
    }
    $('#category-nav > ul > li').on('click', '> a, li.more a', function (e) {
        var categoryEl = $(this).closest('li.category'),
            listHeight = categoryEl.find('div.subcategories ul:first-child').height();
        e.preventDefault();
        if ( categoryEl.hasClass('open') ) {
            categoryEl.removeClass('open').addClass('closed');
        } else {
            categoryEl.addClass('open').removeClass('closed');
        }
    });
});